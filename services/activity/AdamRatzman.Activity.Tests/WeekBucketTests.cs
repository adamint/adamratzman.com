using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class WeekBucketTests
{
    private static readonly TimeZoneInfo Utc = TimeZoneInfo.Utc;
    private static readonly TimeZoneInfo LosAngeles = TimeZoneInfo.FindSystemTimeZoneById("America/Los_Angeles");

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
    public void KeepsTheSpringForwardWeekAsOneBucketAnchoredAtLocalMidnight()
    {
        // 2025-03-09 (a Sunday) is the US spring-forward transition: clocks jump from
        // 01:59:59 PST (UTC-8) straight to 03:00:00 PDT (UTC-7). That Sunday is the last day
        // of the week starting Mon 2025-03-03, so this week is only 167 wall-clock hours long,
        // not 168. It must still be reported as exactly one bucket.
        //
        // "now" is deliberately a week later (2025-03-16, also a Sunday) so that the walk back
        // from the current week to the transition week exercises AddLocalDays(weekStart, -7, ...)
        // *across* the transition, rather than only computing the transition week's own start
        // directly from StartOfWeek. A fixed 7*24-hour UTC subtraction here would land an hour
        // off local midnight.
        var tours = new[]
        {
            Tour(1, "2025-03-05T09:00:00-08:00", 1000), // Wed, before the transition (PST)
            Tour(2, "2025-03-09T03:30:00-07:00", 2000)  // Sun, just after the jump (PDT)
        };

        var weeks = WeekBuckets.Compute(tours, At("2025-03-16T12:00:00-07:00"), LosAngeles);

        weeks.Should().HaveCount(2);
        var currentWeek = weeks[0].First;
        currentWeek.WeekStartDay.Should().Be(10);
        currentWeek.WeekStartMonth.Should().Be(3);

        var week = weeks[1].First;
        week.WeekStartDay.Should().Be(3);
        week.WeekStartMonth.Should().Be(3);
        week.WeekEndDay.Should().Be(9);
        week.WeekEndMonth.Should().Be(3);
        week.Year.Should().Be(2025);
        // Local midnight Mon 2025-03-03 is still standard time (PST, UTC-8): 00:00 + 8h = 08:00 UTC.
        week.StartEpochSeconds.Should().Be(DateTimeOffset.Parse("2025-03-03T08:00:00Z").ToUnixTimeSeconds());
        weeks[1].Second["Biking"].Should().BeApproximately(3000, 0.001);
    }

    [Fact]
    public void KeepsTheFallBackWeekAsOneBucketAnchoredAtLocalMidnight()
    {
        // 2025-11-02 (a Sunday) is the US fall-back transition: 01:00-01:59 local occurs
        // twice as clocks move from PDT (UTC-7) back to PST (UTC-8) at 02:00 PDT. That Sunday
        // is the last day of the week starting Mon 2025-10-27, so this week is 169 wall-clock
        // hours long, not 168. It must still be reported as exactly one bucket.
        //
        // "now" is deliberately a week later (2025-11-09, also a Sunday) for the same reason as
        // the spring-forward test above: it forces AddLocalDays(weekStart, -7, ...) to walk back
        // across the fall-back transition instead of landing on the transition week directly.
        var tours = new[]
        {
            Tour(1, "2025-10-29T09:00:00-07:00", 1000), // Wed, before the transition (PDT)
            Tour(2, "2025-11-02T01:30:00-08:00", 2000)  // Sun, the repeated hour, after falling back (PST)
        };

        var weeks = WeekBuckets.Compute(tours, At("2025-11-09T12:00:00-08:00"), LosAngeles);

        weeks.Should().HaveCount(2);
        var currentWeek = weeks[0].First;
        currentWeek.WeekStartDay.Should().Be(3);
        currentWeek.WeekStartMonth.Should().Be(11);

        var week = weeks[1].First;
        week.WeekStartDay.Should().Be(27);
        week.WeekStartMonth.Should().Be(10);
        week.WeekEndDay.Should().Be(2);
        week.WeekEndMonth.Should().Be(11);
        week.Year.Should().Be(2025);
        // Local midnight Mon 2025-10-27 is still daylight time (PDT, UTC-7): 00:00 + 7h = 07:00 UTC.
        week.StartEpochSeconds.Should().Be(DateTimeOffset.Parse("2025-10-27T07:00:00Z").ToUnixTimeSeconds());
        weeks[1].Second["Biking"].Should().BeApproximately(3000, 0.001);
    }

    [Fact]
    public void PlacesATourJustAfterLocalMidnightMondayInTheCorrectWeekUnderANegativeOffset()
    {
        // Mirrors CountsAToursInTheFirstMinutesOfMondayInTheCorrectWeek, but against a real
        // negative-UTC-offset zone rather than UTC itself. Local midnight Monday 2025-01-06 in
        // PST (UTC-8) is 2025-01-06T08:00:00Z; a tour ten minutes later is 08:10 UTC - still
        // squarely inside the correct week once properly converted to local time. This guards
        // against any regression to computing week boundaries from the instant's own UTC clock
        // reading (or a wrong-signed offset conversion) instead of always converting to local
        // time first, which is exactly the class of bug that misattributes early-in-day local
        // instants to the wrong week under a non-UTC zone.
        var tours = new[] { Tour(1, "2025-01-06T00:10:00-08:00", 500) };

        var weeks = WeekBuckets.Compute(tours, At("2025-01-06T12:00:00-08:00"), LosAngeles);

        weeks.Should().HaveCount(1);
        var week = weeks[0].First;
        week.WeekStartDay.Should().Be(6);
        week.WeekStartMonth.Should().Be(1);
        week.Year.Should().Be(2025);
        // Local midnight Mon 2025-01-06 is standard time (PST, UTC-8): 00:00 + 8h = 08:00 UTC.
        week.StartEpochSeconds.Should().Be(DateTimeOffset.Parse("2025-01-06T08:00:00Z").ToUnixTimeSeconds());
        weeks[0].Second["Biking"].Should().BeApproximately(500, 0.001);
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
