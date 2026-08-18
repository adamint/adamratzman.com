using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using FluentAssertions;
using OpenTelemetry;
using OpenTelemetry.Trace;
using Xunit;

namespace AdamRatzman.Activity.Tests;

using Activity = System.Diagnostics.Activity;

/// <summary>
/// The Komoot login request puts the account email - a value the app model declares a secret - in
/// the URL path, and OpenTelemetry's HTTP client instrumentation records the full request URL as the
/// <c>url.full</c> span attribute. <see cref="KomootTelemetryRedaction"/> scrubs it from the recorded
/// span. These tests prove the scrub happens for the login request and leaves the crawl URLs (which
/// carry only a numeric user id) alone.
/// </summary>
public class HttpTelemetryRedactionTests
{
    private const string LoginUrlRawAt = "https://api.komoot.de/v006/account/email/adam@example.invalid/";
    private const string LoginUrlEncoded = "https://api.komoot.de/v006/account/email/adam%40example.invalid/";
    private const string CrawlUrl = "https://api.komoot.de/v007/users/42/tours/?type=tour_recorded&format=coordinate_array";

    // --- The pure redaction function --------------------------------------------------------------

    [Theory]
    [InlineData(LoginUrlRawAt)]
    [InlineData(LoginUrlEncoded)]
    public void RedactsTheEmailSegmentOfAnAccountLookupUrl(string url)
    {
        KomootTelemetryRedaction.TryRedactAccountEmail(url, out var redacted).Should().BeTrue();

        redacted.Should().Be("https://api.komoot.de/v006/account/email/REDACTED/");
        redacted.Should().NotContain("adam", "the login identifier must not survive in telemetry");
        redacted.Should().NotContain("example.invalid");
    }

    [Theory]
    [InlineData(CrawlUrl)]
    [InlineData("https://api.komoot.de/")]
    public void LeavesNonLoginUrlsUntouched(string url)
    {
        KomootTelemetryRedaction.TryRedactAccountEmail(url, out var redacted).Should().BeFalse();

        redacted.Should().Be(url);
    }

    // --- The production enrich callback, against a real span --------------------------------------
    // The instrumentation sets url.full before invoking EnrichWithHttpRequestMessage (verified
    // against OpenTelemetry.Instrumentation.Http 1.17.0), so this reproduces the real call.

    [Fact]
    public void EnrichCallbackScrubsTheEmailFromTheLoginSpan()
    {
        using var activity = new Activity("http-client").Start();
        activity.SetTag("server.address", "api.komoot.de");
        activity.SetTag("url.full", LoginUrlRawAt);
        using var request = new HttpRequestMessage(HttpMethod.Get, LoginUrlRawAt);

        KomootTelemetryRedaction.Redact(activity, request);

        (activity.GetTagItem("url.full") as string).Should().Be("https://api.komoot.de/v006/account/email/REDACTED/");
        (activity.GetTagItem("url.full") as string).Should().NotContain("adam");
    }

    [Fact]
    public void EnrichCallbackLeavesTheCrawlSpanUrlIntact()
    {
        using var activity = new Activity("http-client").Start();
        activity.SetTag("url.full", CrawlUrl);
        using var request = new HttpRequestMessage(HttpMethod.Get, CrawlUrl);

        KomootTelemetryRedaction.Redact(activity, request);

        (activity.GetTagItem("url.full") as string).Should().Be(CrawlUrl);
    }

    // --- End to end, through the real OpenTelemetry HTTP client instrumentation --------------------

    [Fact]
    public async Task RealInstrumentationExportsARedactedLoginSpanButAFullCrawlSpan()
    {
        var captured = new List<Activity>();
        using var tracer = Sdk.CreateTracerProviderBuilder()
            .AddHttpClientInstrumentation(KomootTelemetryRedaction.Configure)
            .AddProcessor(new CollectingProcessor(captured))
            .Build();

        var port = GetFreePort();
        using var listener = new HttpListener();
        listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        listener.Start();
        var serve = RespondToTwoRequests(listener);

        var loginUrl = $"http://127.0.0.1:{port}/v006/account/email/adam@example.invalid/";
        var crawlUrl = $"http://127.0.0.1:{port}/v007/users/42/tours/";

        using (var http = new HttpClient())
        {
            (await http.GetAsync(loginUrl)).EnsureSuccessStatusCode();
            (await http.GetAsync(crawlUrl)).EnsureSuccessStatusCode();
        }

        await serve;
        tracer.ForceFlush(2000);

        // Scope strictly to this test's own server so parallel tests cannot bleed in.
        var spans = captured
            .Where(a => a.Kind == ActivityKind.Client && (a.GetTagItem("server.port") as int?) == port)
            .ToList();

        spans.Should().HaveCount(2);
        var allTagValues = spans.SelectMany(s => s.TagObjects)
            .Select(t => t.Value as string)
            .Where(v => v is not null)
            .ToList();
        allTagValues.Any(v => v!.Contains("adam@example.invalid"))
            .Should().BeFalse("no span attribute may leak the account email");

        var loginSpan = spans.Single(s => (s.GetTagItem("url.full") as string)!.Contains("/account/email/"));
        (loginSpan.GetTagItem("url.full") as string)
            .Should().Be($"http://127.0.0.1:{port}/v006/account/email/REDACTED/");

        var crawlSpan = spans.Single(s => (s.GetTagItem("url.full") as string)!.Contains("/users/42/tours/"));
        (crawlSpan.GetTagItem("url.full") as string).Should().Be(crawlUrl);
    }

    private static async Task RespondToTwoRequests(HttpListener listener)
    {
        for (var i = 0; i < 2; i++)
        {
            var context = await listener.GetContextAsync();
            var body = Encoding.UTF8.GetBytes("ok");
            context.Response.ContentLength64 = body.Length;
            await context.Response.OutputStream.WriteAsync(body);
            context.Response.Close();
        }
    }

    private static int GetFreePort()
    {
        var probe = new TcpListener(IPAddress.Loopback, 0);
        probe.Start();
        var port = ((IPEndPoint)probe.LocalEndpoint).Port;
        probe.Stop();
        return port;
    }

    private sealed class CollectingProcessor(List<Activity> sink) : BaseProcessor<Activity>
    {
        private readonly Lock _gate = new();

        public override void OnEnd(Activity data)
        {
            lock (_gate) sink.Add(data);
        }
    }
}
