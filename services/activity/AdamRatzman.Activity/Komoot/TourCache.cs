using Microsoft.Extensions.Options;

namespace AdamRatzman.Activity.Komoot;

/// <summary>
/// Owns the activity snapshot and the background refresh loop. Readers see an immutable snapshot
/// swapped atomically, so no request can observe a half-updated state.
/// </summary>
public sealed class TourCache : BackgroundService
{
    private readonly Func<CancellationToken, Task<IReadOnlyList<KomootTour>>> _fetchTours;
    private readonly ActivityOptions _options;
    private readonly ILogger<TourCache> _logger;
    private readonly TimeZoneInfo _timeZone;

    private ActivitySnapshot? _current;

    public TourCache(
        Func<CancellationToken, Task<IReadOnlyList<KomootTour>>> fetchTours,
        IOptions<ActivityOptions> options,
        ILogger<TourCache> logger)
    {
        _fetchTours = fetchTours;
        _options = options.Value;
        _logger = logger;
        _timeZone = _options.ResolveTimeZone();
    }

    public ActivitySnapshot? Current => Volatile.Read(ref _current);

    /// <summary>True once a refresh has succeeded at least once. An account with no tours counts.</summary>
    public bool IsReady => Current is not null;

    public async Task RefreshAsync(CancellationToken cancellationToken)
    {
        try
        {
            var tours = await _fetchTours(cancellationToken);
            var snapshot = ActivitySnapshot.Build(tours, DateTimeOffset.UtcNow, _timeZone);

            Volatile.Write(ref _current, snapshot);

            _logger.LogInformation(
                "Activity snapshot refreshed: {TourCount} tours, {MonthCount} months, {WeekCount} weeks",
                snapshot.TourCount, snapshot.Months.Count, snapshot.Weeks.Count);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Keep serving the previous snapshot. A transient Komoot failure must not blank the site.
            _logger.LogError(ex, "Activity refresh failed; keeping the previous snapshot");
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RefreshAsync(stoppingToken);

        using var timer = new PeriodicTimer(_options.RefreshInterval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                // RefreshAsync swallows its own failures. If that ever changes, this loop dies
                // silently and every future refresh stops - the exact bug the Kotlin had.
                await RefreshAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown.
        }
    }
}
