using AdamRatzman.Activity;
using AdamRatzman.Activity.Contract;
using AdamRatzman.Activity.Komoot;
using OpenTelemetry;
using OpenTelemetry.Instrumentation.Http;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOptions<ActivityOptions>()
    .Bind(builder.Configuration.GetSection(ActivityOptions.SectionName))
    .PostConfigure(options =>
    {
        // The Kotlin service read these two names directly from the environment. Keep accepting
        // them so the App Service settings can be copied across verbatim during the cutover.
        options.KomootEmail = Fallback(options.KomootEmail, "KomootEmail");
        options.KomootPassword = Fallback(options.KomootPassword, "KomootPassword");

        string Fallback(string current, string legacyKey) =>
            string.IsNullOrWhiteSpace(current) ? builder.Configuration[legacyKey] ?? "" : current;
    })
    .Validate(o => !string.IsNullOrWhiteSpace(o.KomootEmail), "Activity:KomootEmail is required")
    .Validate(o => !string.IsNullOrWhiteSpace(o.KomootPassword), "Activity:KomootPassword is required")
    .Validate(o => o.RefreshInterval > TimeSpan.Zero, "Activity:RefreshInterval must be positive")
    .ValidateOnStart();

builder.Services.AddHttpClient<KomootClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("adamratzman.com-activity/1.0");
}).AddStandardResilienceHandler();

// Indirection so tests can substitute the fetch without standing up an HTTP stub.
builder.Services.AddSingleton<Func<CancellationToken, Task<IReadOnlyList<KomootTour>>>>(sp =>
    ct => sp.GetRequiredService<KomootClient>().GetAllToursAsync(ct));

builder.Services.AddSingleton<TourCache>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<TourCache>());

builder.Services.AddCors(cors => cors.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().WithMethods("GET", "OPTIONS")));

builder.Logging.AddOpenTelemetry(logging =>
{
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
});

builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation())
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation(KomootTelemetryRedaction.Configure));

if (!string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
{
    builder.Services.AddOpenTelemetry().UseOtlpExporter();
}

var app = builder.Build();

app.UseCors();

app.MapGet("/", () => Results.Text("hi :)"));

app.MapGet("/health", () => Results.Text("healthy"));

app.MapGet("/ready", (TourCache cache) => cache.IsReady
    ? Results.Text("ready")
    : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));

app.MapGet("/latest-komoot-tours-by-month", (HttpContext context, TourCache cache) =>
    Page(context, cache, snapshot => snapshot.Months));

app.MapGet("/activity-stats-by-week", (HttpContext context, TourCache cache) =>
    Page(context, cache, snapshot => snapshot.Weeks));

app.Run();

static IResult Page<T>(
    HttpContext context,
    TourCache cache,
    Func<ActivitySnapshot, IReadOnlyList<T>> select)
{
    var snapshot = cache.Current;
    if (snapshot is null)
    {
        // The first Komoot crawl has not finished. The readiness probe means production traffic
        // should never land here, but be honest rather than pretending the request was malformed.
        context.Response.Headers.RetryAfter = "30";
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    }

    if (!int.TryParse(context.Request.Query["offset"], out var offset) ||
        !int.TryParse(context.Request.Query["limit"], out var limit))
    {
        return Results.StatusCode(StatusCodes.Status400BadRequest);
    }

    var page = Paginator.Paginate(select(snapshot), offset, limit);

    return page is null
        ? Results.StatusCode(StatusCodes.Status400BadRequest)
        : Results.Json(page, ContractJson.Options);
}

/// <summary>Exposed so the integration tests can host the app with WebApplicationFactory.</summary>
public partial class Program;

namespace AdamRatzman.Activity
{
    /// <summary>
    /// The Komoot login request carries the account email in the URL path (see
    /// <see cref="Komoot.KomootClient"/>), and OpenTelemetry's HTTP client instrumentation records
    /// the full request URL as the <c>url.full</c> span attribute. The email is declared a secret in
    /// the app model, so it must not reach the Aspire dashboard or Application Insights. This scrubs
    /// it from the recorded span without touching the request on the wire.
    /// </summary>
    internal static class KomootTelemetryRedaction
    {
        // The login URL is ".../account/email/{email}/". The crawl URLs never contain this segment,
        // so matching on it leaves their real (numeric-user-id) URLs intact for debugging.
        private const string AccountEmailMarker = "/account/email/";
        private const string RedactedSegment = "REDACTED";

        // Only url.full carries the email on the current instrumentation; url.path is redacted too in
        // case a future version records it. server.address holds just the host, so it is left alone.
        private static readonly string[] UrlBearingTags = ["url.full", "url.path"];

        public static void Configure(HttpClientTraceInstrumentationOptions options) =>
            options.EnrichWithHttpRequestMessage = Redact;

        internal static void Redact(System.Diagnostics.Activity activity, HttpRequestMessage request)
        {
            if (request.RequestUri is null) return;

            foreach (var tag in UrlBearingTags)
            {
                if (activity.GetTagItem(tag) is string value && TryRedactAccountEmail(value, out var redacted))
                {
                    activity.SetTag(tag, redacted);
                }
            }
        }

        /// <summary>
        /// Replaces the email segment in an account-lookup URL with <c>REDACTED</c>, returning
        /// <see langword="false"/> (and leaving the URL untouched) for any other request.
        /// </summary>
        internal static bool TryRedactAccountEmail(string url, out string redacted)
        {
            redacted = url;

            var marker = url.IndexOf(AccountEmailMarker, StringComparison.Ordinal);
            if (marker < 0) return false;

            var segmentStart = marker + AccountEmailMarker.Length;
            var segmentEnd = url.IndexOfAny(['/', '?', '#'], segmentStart);
            if (segmentEnd < 0) segmentEnd = url.Length;
            if (segmentEnd == segmentStart) return false;

            redacted = string.Concat(url.AsSpan(0, segmentStart), RedactedSegment, url.AsSpan(segmentEnd));
            return true;
        }
    }
}
