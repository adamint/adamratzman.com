using System.Globalization;
using AdamRatzman.Activity.Contract;

namespace AdamRatzman.Activity.Komoot;

public static class MonthGrouping
{
    private static readonly CultureInfo EnUs = CultureInfo.GetCultureInfo("en-US");

    /// <summary>
    /// Groups tours into months, newest month first, preserving the input order within each month.
    /// Expects the date-descending list produced by <see cref="TourDeduplicator.Deduplicate"/>.
    /// </summary>
    public static IReadOnlyList<ToursInMonthYear> GroupByMonth(IReadOnlyList<KomootTour> tours, TimeZoneInfo timeZone)
    {
        return tours
            .Select(tour => (Tour: tour, Local: TimeZoneInfo.ConvertTime(tour.Date, timeZone)))
            .GroupBy(x => new MonthYearPair(EnUs.DateTimeFormat.GetMonthName(x.Local.Month), x.Local.Year))
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
