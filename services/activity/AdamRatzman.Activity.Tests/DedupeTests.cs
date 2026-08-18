using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class DedupeTests
{
    private static KomootTour At(long id, string date, int durationSeconds) => new()
    {
        Id = id, Name = $"tour {id}", Sport = "touringbicycle",
        Date = DateTimeOffset.Parse(date), Duration = durationSeconds, Distance = 1000
    };

    [Fact]
    public void KeepsNonOverlappingTours()
    {
        var tours = new[]
        {
            At(1, "2025-06-14T08:00:00Z", 3600),
            At(2, "2025-06-14T12:00:00Z", 3600)
        };

        TourDeduplicator.Deduplicate(tours).Select(t => t.Id).Should().Equal(2, 1);
    }

    [Fact]
    public void DropsTheSecondOfAnOverlappingPair()
    {
        var tours = new[]
        {
            At(1, "2025-06-14T08:00:00Z", 3600),   // 08:00-09:00
            At(2, "2025-06-14T08:30:00Z", 3600)    // 08:30-09:30, overlaps
        };

        TourDeduplicator.Deduplicate(tours).Select(t => t.Id).Should().Equal(1);
    }

    [Fact]
    public void TreatsExactlyTouchingIntervalsAsOverlapping()
    {
        var tours = new[]
        {
            At(1, "2025-06-14T08:00:00Z", 3600),   // ends 09:00
            At(2, "2025-06-14T09:00:00Z", 3600)    // starts 09:00
        };

        TourDeduplicator.Deduplicate(tours).Select(t => t.Id).Should().Equal(1);
    }

    [Fact]
    public void SortsNewestFirst()
    {
        var tours = new[]
        {
            At(1, "2025-01-01T00:00:00Z", 60),
            At(2, "2025-06-01T00:00:00Z", 60),
            At(3, "2025-03-01T00:00:00Z", 60)
        };

        TourDeduplicator.Deduplicate(tours).Select(t => t.Id).Should().Equal(2, 3, 1);
    }

    [Fact]
    public void HandlesAnEmptyList()
    {
        TourDeduplicator.Deduplicate([]).Should().BeEmpty();
    }
}
