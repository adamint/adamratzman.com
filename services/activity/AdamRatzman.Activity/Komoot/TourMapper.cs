using System.Globalization;
using AdamRatzman.Activity.Contract;

namespace AdamRatzman.Activity.Komoot;

public static class TourMapper
{
    private static readonly CultureInfo EnUs = CultureInfo.GetCultureInfo("en-US");
    private static readonly MapImage MissingMapImage = new("", "", false, "");

    public static PublicTourInfo ToPublicTour(KomootTour tour, TimeZoneInfo timeZone)
    {
        var sportType = SportTypes.FromKomoot(tour.Sport, tour.Name);
        var (name, bicycleInfo) = ParseNameAndBike(tour.Name, sportType);

        return new PublicTourInfo(
            name,
            tour.Duration,
            tour.Distance,
            sportType,
            bicycleInfo,
            ToSerializable(tour.Date, timeZone),
            tour.MapImage is null
                ? MissingMapImage
                : new MapImage(tour.MapImage.Attribution, tour.MapImage.Src, tour.MapImage.Templated, tour.MapImage.Type),
            new RouteElevation(tour.ElevationUp, tour.ElevationDown));
    }

    private static (string Name, SerializableBikeInfo? Bike) ParseNameAndBike(string rawName, SportType sportType)
    {
        if (sportType is not (SportType.Biking or SportType.EBiking)) return (rawName, null);

        foreach (var suffix in new[] { "(P)", "(R)", "(C)" })
        {
            if (!rawName.EndsWith(suffix, StringComparison.Ordinal)) continue;

            var bike = BikeTypes.FromTourName(rawName);
            return (rawName[..^suffix.Length].Trim(), Describe(bike));
        }

        // No recognised suffix: the name is left exactly as-is, but it is still a bike.
        return (rawName, Describe(BikeType.Specialized_Turbo_Vado));
    }

    private static SerializableBikeInfo Describe(BikeType bike) => new(bike.ToString(), bike.IsElectric());

    public static SerializableLocalDate ToSerializable(DateTimeOffset instant, TimeZoneInfo timeZone)
    {
        var local = TimeZoneInfo.ConvertTime(instant, timeZone);

        return new SerializableLocalDate(
            instant.ToUnixTimeMilliseconds(),
            local.Minute,
            local.Hour,
            new SerializableDayOfWeek(IsoDayNumber(local.DayOfWeek), EnUs.DateTimeFormat.GetDayName(local.DayOfWeek)),
            local.Day,
            new SerializableMonth(local.Month, MonthGrouping.EnglishMonthNumberName(local.Month)),
            local.Year);
    }

    /// <summary>.NET counts Sunday as 0; the contract uses ISO-8601, where Monday is 1 and Sunday is 7.</summary>
    public static int IsoDayNumber(DayOfWeek day) => ((int)day + 6) % 7 + 1;
}
