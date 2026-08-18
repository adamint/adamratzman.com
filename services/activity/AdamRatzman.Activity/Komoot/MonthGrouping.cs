using System.Globalization;
using AdamRatzman.Activity.Contract;

namespace AdamRatzman.Activity.Komoot;

public static class MonthGrouping
{
    /// <summary>
    /// Renders a month as the frozen frontend contract expects it: an unpadded number string ("1".."12"),
    /// not the month's English name.
    ///
    /// This is a preserved artifact of the original Kotlin service, not an oversight. The Kotlin built month
    /// names with <c>month.getDisplayName(TextStyle.FULL_STANDALONE, Locale.US)</c>, but CLDR has no distinct
    /// stand-alone month names for English, so the JDK silently fell back to the month's numeric value as a
    /// string (e.g. "8" instead of "August"). Production has served that numeric string for every month for
    /// years, and the React frontend's differential test locks onto it byte-for-byte, so this port must
    /// reproduce the bug rather than "fix" it.
    ///
    /// Day-of-week names are unaffected by this: CLDR *does* have stand-alone day names for English, so the
    /// Kotlin (and this port) correctly emit full names like "Monday" for <see cref="SerializableDayOfWeek"/>.
    /// Do not apply this numeric fallback to day names.
    /// </summary>
    public static string EnglishMonthNumberName(int month) => month.ToString(CultureInfo.InvariantCulture);

    /// <summary>
    /// Groups tours into months, newest month first, preserving the input order within each month.
    /// Expects the date-descending list produced by <see cref="TourDeduplicator.Deduplicate"/>.
    /// </summary>
    public static IReadOnlyList<ToursInMonthYear> GroupByMonth(IReadOnlyList<KomootTour> tours, TimeZoneInfo timeZone)
    {
        return tours
            .Select(tour => (Tour: tour, Local: TimeZoneInfo.ConvertTime(tour.Date, timeZone)))
            .GroupBy(x => new MonthYearPair(EnglishMonthNumberName(x.Local.Month), x.Local.Year))
            .Select(group => new ToursInMonthYear(
                group.Key,
                group.Select(x => TourMapper.ToPublicTour(x.Tour, timeZone)).ToList(),
                SumDistanceBySport(group.Select(x => x.Tour))))
            .ToList();
    }

    /// <summary>Totals distance per sport, keyed by the sport's declared enum name.</summary>
    public static IReadOnlyDictionary<string, double> SumDistanceBySport(IEnumerable<KomootTour> tours)
    {
        var totals = new Dictionary<string, double>(StringComparer.Ordinal);

        foreach (var tour in tours)
        {
            var key = SportTypes.FromKomoot(tour.Sport, tour.Name).ToString();
            totals[key] = totals.GetValueOrDefault(key) + tour.Distance;
        }

        return totals;
    }
}
