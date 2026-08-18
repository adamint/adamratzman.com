using AdamRatzman.Activity.Contract;

namespace AdamRatzman.Activity.Komoot;

/// <summary>
/// An immutable, internally consistent view of the activity data. Replaced wholesale on refresh
/// so readers never observe a half-updated state.
/// </summary>
public sealed record ActivitySnapshot(
    IReadOnlyList<ToursInMonthYear> Months,
    IReadOnlyList<Pair<WeekMonthYearPair, IReadOnlyDictionary<string, double>>> Weeks,
    int TourCount,
    DateTimeOffset GeneratedAt)
{
    public static ActivitySnapshot Build(
        IReadOnlyList<KomootTour> rawTours,
        DateTimeOffset now,
        TimeZoneInfo timeZone)
    {
        var tours = TourDeduplicator.Deduplicate(rawTours);

        return new ActivitySnapshot(
            MonthGrouping.GroupByMonth(tours, timeZone),
            WeekBuckets.Compute(tours, now, timeZone),
            tours.Count,
            now);
    }
}
