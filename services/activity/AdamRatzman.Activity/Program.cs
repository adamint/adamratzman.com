using AdamRatzman.Activity;
using AdamRatzman.Activity.Contract;
using AdamRatzman.Activity.Komoot;
using OpenTelemetry;
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
        .AddHttpClientInstrumentation());

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
