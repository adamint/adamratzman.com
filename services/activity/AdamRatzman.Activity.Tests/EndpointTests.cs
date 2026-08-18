using System.Net;
using System.Text.Json;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class EndpointTests
{
    private static KomootTour Tour(long id, string date, double distance = 1000) => new()
    {
        Id = id, Name = $"ride {id} (R)", Sport = "touringbicycle",
        Date = DateTimeOffset.Parse(date), Duration = 60, Distance = distance,
        MapImage = new KomootMapImage { Attribution = "© komoot", Src = "https://x.invalid/a.png", Templated = false, Type = "tourpreview" }
    };

    private static readonly KomootTour[] Sample =
    [
        Tour(1, "2025-06-20T10:00:00Z"),
        Tour(2, "2025-05-20T10:00:00Z"),
        Tour(3, "2025-04-20T10:00:00Z")
    ];

    private sealed class Factory(Func<CancellationToken, Task<IReadOnlyList<KomootTour>>> fetch)
        : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.UseSetting("Activity:KomootEmail", "test@example.invalid");
            builder.UseSetting("Activity:KomootPassword", "test");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<Func<CancellationToken, Task<IReadOnlyList<KomootTour>>>>();
                services.AddSingleton(fetch);
            });
        }
    }

    private static async Task<HttpClient> ReadyClient()
    {
        var factory = new Factory(_ => Task.FromResult<IReadOnlyList<KomootTour>>(Sample));
        var client = factory.CreateClient();

        for (var i = 0; i < 100; i++)
        {
            if ((await client.GetAsync("/ready")).StatusCode == HttpStatusCode.OK) return client;
            await Task.Delay(20);
        }

        throw new InvalidOperationException("The cache never became ready");
    }

    [Fact]
    public async Task RootRespondsWithTheGreeting()
    {
        var client = await ReadyClient();

        (await client.GetStringAsync("/")).Should().Be("hi :)");
    }

    [Fact]
    public async Task HealthIsOkBeforeTheCacheIsReady()
    {
        var blocked = new TaskCompletionSource<IReadOnlyList<KomootTour>>();
        using var factory = new Factory(_ => blocked.Task);
        var client = factory.CreateClient();

        (await client.GetAsync("/health")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync("/ready")).StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);

        blocked.SetResult([]);
    }

    [Fact]
    public async Task DataEndpointsReturn503BeforeTheCacheIsReady()
    {
        var blocked = new TaskCompletionSource<IReadOnlyList<KomootTour>>();
        using var factory = new Factory(_ => blocked.Task);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/latest-komoot-tours-by-month?offset=0&limit=1");

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        response.Headers.RetryAfter.Should().NotBeNull();

        blocked.SetResult([]);
    }

    [Fact]
    public async Task ReturnsAPageOfMonths()
    {
        var client = await ReadyClient();

        var json = await client.GetStringAsync("/latest-komoot-tours-by-month?offset=0&limit=2");
        using var document = JsonDocument.Parse(json);

        var root = document.RootElement;
        root.GetProperty("total").GetInt32().Should().Be(3);
        root.GetProperty("data").GetArrayLength().Should().Be(2);
        root.GetProperty("data")[0].GetProperty("monthYearPair").GetProperty("month").GetString().Should().Be("6");
        root.GetProperty("next").GetProperty("offset").GetInt32().Should().Be(2);
        root.TryGetProperty("previous", out _).Should().BeFalse("null pagination links are omitted");
    }

    [Fact]
    public async Task ReturnsWeeksAsFirstSecondPairs()
    {
        var client = await ReadyClient();

        var json = await client.GetStringAsync("/activity-stats-by-week?offset=0&limit=1");
        using var document = JsonDocument.Parse(json);

        var first = document.RootElement.GetProperty("data")[0];
        first.TryGetProperty("first", out _).Should().BeTrue();
        first.TryGetProperty("second", out _).Should().BeTrue();
        first.GetProperty("first").TryGetProperty("startEpochSeconds", out _).Should().BeTrue();
    }

    [Theory]
    [InlineData("/latest-komoot-tours-by-month")]
    [InlineData("/latest-komoot-tours-by-month?offset=0")]
    [InlineData("/latest-komoot-tours-by-month?limit=1")]
    [InlineData("/latest-komoot-tours-by-month?offset=abc&limit=1")]
    [InlineData("/latest-komoot-tours-by-month?offset=0&limit=0")]
    [InlineData("/latest-komoot-tours-by-month?offset=-1&limit=1")]
    [InlineData("/latest-komoot-tours-by-month?offset=99&limit=1")]
    [InlineData("/activity-stats-by-week?offset=abc&limit=1")]
    public async Task RejectsBadPaginationWith400(string url)
    {
        var client = await ReadyClient();

        (await client.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ClampsAnOverLongLimitInsteadOfFailing()
    {
        var client = await ReadyClient();

        var response = await client.GetAsync("/latest-komoot-tours-by-month?offset=0&limit=1000");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        document.RootElement.GetProperty("data").GetArrayLength().Should().Be(3);
    }
}
