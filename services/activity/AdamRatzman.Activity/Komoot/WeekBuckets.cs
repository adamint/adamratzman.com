using AdamRatzman.Activity.Contract;

namespace AdamRatzman.Activity.Komoot;

public static class WeekBuckets
{
    /// <summary>
    /// Totals distance per sport for each Monday-to-Sunday week from the current week back to the
    /// oldest tour, newest week first. Weeks with no activity are included as empty maps, which is
    /// what draws the gaps in the chart.
    /// </summary>
    public static IReadOnlyList<Pair<WeekMonthYearPair, IReadOnlyDictionary<string, double>>> Compute(
        IReadOnlyList<KomootTour> tours,
        DateTimeOffset now,
        TimeZoneInfo timeZone)
    {
        // The Kotlin called komootTours.last() unguarded, which threw on the empty list -
        // precisely the state after a failed login.
        if (tours.Count == 0) return [];

        // Walk back to the week *containing* the oldest tour, not to the tour's own instant:
        // stopping at the instant would drop the oldest tour's week whenever that tour falls
        // later than midnight on its Monday, which is almost always.
        var oldestWeekStart = StartOfWeek(tours.Min(t => t.Date), timeZone);

        var results = new List<Pair<WeekMonthYearPair, IReadOnlyDictionary<string, double>>>();
        var weekStart = StartOfWeek(now, timeZone);

        while (weekStart >= oldestWeekStart)
        {
            var weekEndDisplay = AddLocalDays(weekStart, 6, timeZone);
            var weekEndExclusive = AddLocalDays(weekStart, 7, timeZone);

            var inWeek = tours.Where(t => t.Date >= weekStart && t.Date < weekEndExclusive);

            var startLocal = TimeZoneInfo.ConvertTime(weekStart, timeZone);
            var endLocal = TimeZoneInfo.ConvertTime(weekEndDisplay, timeZone);

            results.Add(new Pair<WeekMonthYearPair, IReadOnlyDictionary<string, double>>(
                new WeekMonthYearPair(
                    startLocal.Day,
                    startLocal.Month,
                    endLocal.Day,
                    endLocal.Month,
                    startLocal.Year,
                    weekStart.ToUnixTimeSeconds()),
                MonthGrouping.SumDistanceBySport(inWeek)));

            weekStart = AddLocalDays(weekStart, -7, timeZone);
        }

        return results.OrderByDescending(r => r.First.StartEpochSeconds).ToList();
    }

    /// <summary>
    /// Local midnight on the Monday of the week containing <paramref name="instant"/>.
    /// The Kotlin subtracted the hour count twice - once as hours and once as minutes - and never
    /// subtracted seconds, so its "week start" was up to 23 minutes into the previous Sunday.
    /// </summary>
    public static DateTimeOffset StartOfWeek(DateTimeOffset instant, TimeZoneInfo timeZone)
    {
        var local = TimeZoneInfo.ConvertTime(instant, timeZone);
        var daysBack = TourMapper.IsoDayNumber(local.DayOfWeek) - 1;
        return ToInstant(local.Date.AddDays(-daysBack), timeZone);
    }

    /// <summary>
    /// Adds calendar days in local time rather than a fixed 24-hour multiple, so week boundaries
    /// stay at local midnight across a daylight-saving transition.
    /// </summary>
    private static DateTimeOffset AddLocalDays(DateTimeOffset instant, int days, TimeZoneInfo timeZone)
    {
        var local = TimeZoneInfo.ConvertTime(instant, timeZone);
        return ToInstant(local.DateTime.AddDays(days), timeZone);
    }

    private static DateTimeOffset ToInstant(DateTime localWallClock, TimeZoneInfo timeZone)
    {
        var unspecified = DateTime.SpecifyKind(localWallClock, DateTimeKind.Unspecified);

        // Spring-forward gaps have no valid local representation; step to the first instant that does.
        if (timeZone.IsInvalidTime(unspecified)) unspecified = unspecified.AddHours(1);

        return new DateTimeOffset(unspecified, timeZone.GetUtcOffset(unspecified));
    }
}
