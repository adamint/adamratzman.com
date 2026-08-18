using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class WeekBucketTests
{
    private static readonly TimeZoneInfo Utc = TimeZoneInfo.Utc;

    private static KomootTour Tour(long id, string date, double distance = 1000, string name = "ride (R)", string sport = "touringbicycle") => new()
    {
        Id = id, Name = name, Sport = sport, Date = DateTimeOffset.Parse(date), Duration = 60, Distance = distance
    };

    private static DateTimeOffset At(string iso) => DateTimeOffset.Parse(iso);

    [Theory]
    // 2025-06-14 is a Saturday; its week starts Monday 2025-06-09.
    [InlineData("2025-06-14T18:32:10Z", "2025-06-09T00:00:00Z")]
    // A Monday is its own week start, and the time of day is discarded.
    [InlineData("2025-06-09T00:00:10Z", "2025-06-09T00:00:00Z")]
    [InlineData("2025-06-09T23:59:59Z", "2025-06-09T00:00:00Z")]
    // A Sunday belongs to the week that began six days earlier.
    [InlineData("2025-06-15T12:00:00Z", "2025-06-09T00:00:00Z")]
    public void FindsRealLocalMidnightOnMonday(string instant, string expected)
    {
        WeekBuckets.StartOfWeek(At(instant), Utc).Should().Be(At(expected));
    }

    [Fact]
    public void ReturnsEmptyWhenThereAreNoTours()
    {
        WeekBuckets.Compute([], At("2025-06-14T18:00:00Z"), Utc).Should().BeEmpty();
    }

    [Fact]
    public void BucketsToursIntoTheirWeekAndOrdersNewestFirst()
    {
        var tours = new[]
        {
            Tour(1, "2025-06-11T10:00:00Z", 1000),  // week of Jun 9
            Tour(2, "2025-06-15T10:00:00Z", 2000),  // week of Jun 9 (Sunday)
            Tour(3, "2025-06-03T10:00:00Z", 4000)   // week of Jun 2
        };

        var weeks = WeekBuckets.Compute(tours, At("2025-06-16T12:00:00Z"), Utc);

        // Weeks of Jun 16, Jun 9, Jun 2 - newest first, including the empty current week.
        weeks.Should().HaveCount(3);
        weeks[0].First.WeekStartDay.Should().Be(16);
        weeks[0].Second.Should().BeEmpty();
        weeks[1].First.WeekStartDay.Should().Be(9);
        weeks[1].Second["Biking"].Should().BeApproximately(3000, 0.001);
        weeks[2].First.WeekStartDay.Should().Be(2);
        weeks[2].Second["Biking"].Should().BeApproximately(4000, 0.001);
    }

    [Fact]
    public void ReportsStartAndEndDayMonthAndYear()
    {
        var weeks = WeekBuckets.Compute([Tour(1, "2025-06-30T10:00:00Z")], At("2025-06-30T12:00:00Z"), Utc);

        var week = weeks[0].First;
        week.WeekStartDay.Should().Be(30);
        week.WeekStartMonth.Should().Be(6);
        week.WeekEndDay.Should().Be(6);      // Sunday 2025-07-06
        week.WeekEndMonth.Should().Be(7);
        week.Year.Should().Be(2025);
        week.StartEpochSeconds.Should().Be(At("2025-06-30T00:00:00Z").ToUnixTimeSeconds());
    }

    [Fact]
    public void KeepsToursOnBothSidesOfAYearBoundary()
    {
        // Week of Mon 2024-12-30 runs through Sun 2025-01-05.
        // The Kotlin's year*365+dayOfYear arithmetic dropped the January tours entirely.
        var tours = new[]
        {
            Tour(1, "2025-01-02T10:00:00Z", 500),
            Tour(2, "2024-12-31T10:00:00Z", 700)
        };

        var weeks = WeekBuckets.Compute(tours, At("2025-01-03T12:00:00Z"), Utc);

        weeks.Should().HaveCount(1);
        weeks[0].First.WeekStartDay.Should().Be(30);
        weeks[0].First.WeekStartMonth.Should().Be(12);
        weeks[0].First.Year.Should().Be(2024);
        weeks[0].Second["Biking"].Should().BeApproximately(1200, 0.001);
    }

    [Fact]
    public void HandlesALeapDay()
    {
        // 2024-02-29 is a Thursday, in the week starting Mon 2024-02-26.
        var weeks = WeekBuckets.Compute([Tour(1, "2024-02-29T10:00:00Z", 900)], At("2024-02-29T18:00:00Z"), Utc);

        weeks.Should().HaveCount(1);
        weeks[0].First.WeekStartDay.Should().Be(26);
        weeks[0].First.WeekEndDay.Should().Be(3);   // Sunday 2024-03-03
        weeks[0].Second["Biking"].Should().BeApproximately(900, 0.001);
    }

    [Fact]
    public void CountsAToursInTheFirstMinutesOfMondayInTheCorrectWeek()
    {
        // The Kotlin's off-by-minutes bug pushed the week boundary back to Sunday 23:42,
        // so a tour at Monday 00:05 landed in the *previous* week.
        var weeks = WeekBuckets.Compute([Tour(1, "2025-06-09T00:05:00Z", 300)], At("2025-06-09T12:00:00Z"), Utc);

        weeks.Should().HaveCount(1);
        weeks[0].First.WeekStartDay.Should().Be(9);
        weeks[0].Second["Biking"].Should().BeApproximately(300, 0.001);
    }

    [Fact]
    public void SplitsDistanceBySport()
    {
        var tours = new[]
        {
            Tour(1, "2025-06-11T10:00:00Z", 1000, name: "ride (R)"),
            Tour(2, "2025-06-12T10:00:00Z", 2000, name: "ride (P)"),
            Tour(3, "2025-06-13T10:00:00Z", 3000, name: "walk", sport: "hike")
        };

        var week = WeekBuckets.Compute(tours, At("2025-06-14T12:00:00Z"), Utc)[0].Second;

        week["Biking"].Should().BeApproximately(1000, 0.001);
        week["EBiking"].Should().BeApproximately(2000, 0.001);
        week["Other"].Should().BeApproximately(3000, 0.001);
    }
}
