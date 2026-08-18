using AdamRatzman.Activity.Contract;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class GroupingTests
{
    private static readonly TimeZoneInfo Utc = TimeZoneInfo.Utc;

    private static KomootTour Tour(long id, string date, string sport = "touringbicycle", string name = "ride (R)", double distance = 1000) => new()
    {
        Id = id, Name = name, Sport = sport, Date = DateTimeOffset.Parse(date), Duration = 60, Distance = distance
    };

    [Fact]
    public void GroupsByMonthNewestFirst()
    {
        var tours = new[]
        {
            Tour(1, "2025-06-20T10:00:00Z"),
            Tour(2, "2025-06-02T10:00:00Z"),
            Tour(3, "2025-05-30T10:00:00Z"),
            Tour(4, "2024-06-30T10:00:00Z")
        };

        var groups = MonthGrouping.GroupByMonth(tours, Utc);

        groups.Select(g => g.MonthYearPair).Should().Equal(
            new MonthYearPair("6", 2025),
            new MonthYearPair("5", 2025),
            new MonthYearPair("6", 2024));
        groups[0].Tours.Should().HaveCount(2);
        groups[1].Tours.Should().HaveCount(1);
    }

    [Fact]
    public void PreservesSourceOrderWithinAMonth()
    {
        var tours = new[]
        {
            Tour(1, "2025-06-20T10:00:00Z", name: "later (R)"),
            Tour(2, "2025-06-02T10:00:00Z", name: "earlier (R)")
        };

        MonthGrouping.GroupByMonth(tours, Utc)[0].Tours.Select(t => t.Name).Should().Equal("later", "earlier");
    }

    [Fact]
    public void SumsDistancePerSportUsingEnumNamesAsKeys()
    {
        var tours = new[]
        {
            Tour(1, "2025-06-20T10:00:00Z", name: "ride (R)", distance: 1000),   // Biking
            Tour(2, "2025-06-19T10:00:00Z", name: "ride (P)", distance: 2500),   // EBiking
            Tour(3, "2025-06-18T10:00:00Z", name: "ride", distance: 500),        // EBiking
            Tour(4, "2025-06-17T10:00:00Z", sport: "hike", name: "walk", distance: 7000) // Other
        };

        var distances = MonthGrouping.GroupByMonth(tours, Utc)[0].DistanceBySportType;

        distances.Should().HaveCount(3);
        distances["Biking"].Should().BeApproximately(1000, 0.001);
        distances["EBiking"].Should().BeApproximately(3000, 0.001);
        distances["Other"].Should().BeApproximately(7000, 0.001);
    }

    [Fact]
    public void UsesTheConfiguredTimezoneToDecideTheMonth()
    {
        var la = TimeZoneInfo.FindSystemTimeZoneById("America/Los_Angeles");

        // 2025-07-01T04:00Z is still 2025-06-30 in Los Angeles.
        var groups = MonthGrouping.GroupByMonth([Tour(1, "2025-07-01T04:00:00Z")], la);

        groups[0].MonthYearPair.Should().Be(new MonthYearPair("6", 2025));
    }

    [Fact]
    public void HandlesAnEmptyList()
    {
        MonthGrouping.GroupByMonth([], Utc).Should().BeEmpty();
    }
}
