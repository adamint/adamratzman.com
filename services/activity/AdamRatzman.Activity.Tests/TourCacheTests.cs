using AdamRatzman.Activity;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class TourCacheTests
{
    private static KomootTour Tour(long id, string date) => new()
    {
        Id = id, Name = "ride (R)", Sport = "touringbicycle",
        Date = DateTimeOffset.Parse(date), Duration = 60, Distance = 1000
    };

    private static TourCache Build(Func<CancellationToken, Task<IReadOnlyList<KomootTour>>> fetch) =>
        new(fetch,
            Options.Create(new ActivityOptions { RefreshInterval = TimeSpan.FromMilliseconds(40) }),
            NullLogger<TourCache>.Instance);

    [Fact]
    public void StartsWithNoSnapshotAndIsNotReady()
    {
        var cache = Build(_ => Task.FromResult<IReadOnlyList<KomootTour>>([]));

        cache.Current.Should().BeNull();
        cache.IsReady.Should().BeFalse();
    }

    [Fact]
    public async Task PublishesASnapshotAfterTheFirstRefresh()
    {
        var cache = Build(_ => Task.FromResult<IReadOnlyList<KomootTour>>([Tour(1, "2025-06-14T10:00:00Z")]));

        await cache.RefreshAsync(CancellationToken.None);

        cache.IsReady.Should().BeTrue();
        cache.Current!.TourCount.Should().Be(1);
        cache.Current.Months.Should().HaveCount(1);
        cache.Current.Weeks.Should().NotBeEmpty();
    }

    [Fact]
    public async Task IsReadyEvenWhenKomootReturnsNoTours()
    {
        // An account with no recorded tours is a valid, fully-loaded state - not a cold cache.
        var cache = Build(_ => Task.FromResult<IReadOnlyList<KomootTour>>([]));

        await cache.RefreshAsync(CancellationToken.None);

        cache.IsReady.Should().BeTrue();
        cache.Current!.Months.Should().BeEmpty();
        cache.Current.Weeks.Should().BeEmpty();
    }

    [Fact]
    public async Task KeepsThePreviousSnapshotWhenARefreshFails()
    {
        var shouldFail = false;
        var cache = Build(_ => shouldFail
            ? Task.FromException<IReadOnlyList<KomootTour>>(new HttpRequestException("komoot is down"))
            : Task.FromResult<IReadOnlyList<KomootTour>>([Tour(1, "2025-06-14T10:00:00Z")]));

        await cache.RefreshAsync(CancellationToken.None);
        var first = cache.Current;

        shouldFail = true;
        await cache.RefreshAsync(CancellationToken.None);

        cache.Current.Should().BeSameAs(first);
        cache.IsReady.Should().BeTrue();
    }

    [Fact]
    public async Task ARefreshFailureDoesNotStopTheLoop()
    {
        var calls = 0;
        var cache = Build(_ =>
        {
            var call = Interlocked.Increment(ref calls);
            return call == 1
                ? Task.FromException<IReadOnlyList<KomootTour>>(new HttpRequestException("transient"))
                : Task.FromResult<IReadOnlyList<KomootTour>>([Tour(1, "2025-06-14T10:00:00Z")]);
        });

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await cache.StartAsync(cts.Token);

        while (!cache.IsReady && !cts.IsCancellationRequested) await Task.Delay(20, CancellationToken.None);
        await cache.StopAsync(CancellationToken.None);

        cache.IsReady.Should().BeTrue("a failed first refresh must not kill the timer loop");
        calls.Should().BeGreaterThan(1);
    }
}
