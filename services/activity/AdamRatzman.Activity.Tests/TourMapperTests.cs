using AdamRatzman.Activity.Contract;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class TourMapperTests
{
    private static readonly TimeZoneInfo Utc = TimeZoneInfo.Utc;

    private static KomootTour Tour(string name, string sport = "touringbicycle", string date = "2025-06-14T18:32:10.000Z") => new()
    {
        Id = 1,
        Name = name,
        Sport = sport,
        Date = DateTimeOffset.Parse(date),
        Distance = 24512.7,
        Duration = 4210,
        ElevationUp = 312.5,
        ElevationDown = 305.0,
        MapImage = new KomootMapImage
        {
            Attribution = "© komoot", Src = "https://example.invalid/a.png", Templated = false, Type = "tourpreview"
        }
    };

    [Theory]
    [InlineData("Evening ride (P)", "Evening ride", "Propella_7S", true)]
    [InlineData("Evening ride (R)", "Evening ride", "Cervelo_SLC_SL", false)]
    [InlineData("Evening ride (C)", "Evening ride", "REI_CO_OP_GENERATION_E", true)]
    [InlineData("Evening ride", "Evening ride", "Specialized_Turbo_Vado", true)]
    [InlineData("Evening ride (X)", "Evening ride (X)", "Specialized_Turbo_Vado", true)]
    public void StripsBikeSuffixAndAttachesBicycleInfo(string input, string expectedName, string bikeName, bool electric)
    {
        var result = TourMapper.ToPublicTour(Tour(input), Utc);

        result.Name.Should().Be(expectedName);
        result.BicycleInfo.Should().Be(new SerializableBikeInfo(bikeName, electric));
    }

    [Fact]
    public void LeavesNonBikeToursAloneAndOmitsBicycleInfo()
    {
        var result = TourMapper.ToPublicTour(Tour("Ridge walk (R)", sport: "hike"), Utc);

        result.Name.Should().Be("Ridge walk (R)");
        result.BicycleInfo.Should().BeNull();
        result.SportType.Should().Be(SportType.Other);
    }

    [Fact]
    public void CopiesDistanceDurationElevationAndMapImage()
    {
        var result = TourMapper.ToPublicTour(Tour("Evening ride (R)"), Utc);

        result.Distance.Should().BeApproximately(24512.7, 0.001);
        result.Duration.Should().Be(4210);
        result.Elevation.Should().Be(new RouteElevation(312.5, 305.0));
        result.MapImage.Should().Be(new MapImage("© komoot", "https://example.invalid/a.png", false, "tourpreview"));
    }

    [Fact]
    public void SubstitutesAnEmptyMapImageWhenKomootOmitsOne()
    {
        var tour = Tour("Evening ride (R)");
        var withoutImage = new KomootTour
        {
            Id = tour.Id, Name = tour.Name, Sport = tour.Sport, Date = tour.Date,
            Distance = tour.Distance, Duration = tour.Duration,
            ElevationUp = tour.ElevationUp, ElevationDown = tour.ElevationDown, MapImage = null
        };

        TourMapper.ToPublicTour(withoutImage, Utc).MapImage.Should().Be(new MapImage("", "", false, ""));
    }

    [Fact]
    public void BuildsTheLocalDateWithIsoDayNumbersAndEnUsNames()
    {
        // 2025-06-14T18:32:10Z is a Saturday.
        var result = TourMapper.ToPublicTour(Tour("Evening ride (R)"), Utc);

        result.Date.DateMillis.Should().Be(DateTimeOffset.Parse("2025-06-14T18:32:10.000Z").ToUnixTimeMilliseconds());
        result.Date.HourOfDay.Should().Be(18);
        result.Date.Minute.Should().Be(32);
        result.Date.DayOfMonth.Should().Be(14);
        result.Date.Year.Should().Be(2025);
        result.Date.DayOfWeek.Should().Be(new SerializableDayOfWeek(6, "Saturday"));
        result.Date.Month.Should().Be(new SerializableMonth(6, "June"));
    }

    [Fact]
    public void SundayIsIsoDaySeven()
    {
        var result = TourMapper.ToPublicTour(Tour("x", date: "2025-06-15T09:00:00.000Z"), Utc);

        result.Date.DayOfWeek.Should().Be(new SerializableDayOfWeek(7, "Sunday"));
    }

    [Fact]
    public void UsesTheConfiguredTimezoneForLocalFieldsButNotForDateMillis()
    {
        var la = TimeZoneInfo.FindSystemTimeZoneById("America/Los_Angeles");

        // 2025-06-15T03:00Z is 2025-06-14 20:00 in Los Angeles - a different day.
        var result = TourMapper.ToPublicTour(Tour("x", date: "2025-06-15T03:00:00.000Z"), la);

        result.Date.DayOfMonth.Should().Be(14);
        result.Date.HourOfDay.Should().Be(20);
        result.Date.DateMillis.Should().Be(DateTimeOffset.Parse("2025-06-15T03:00:00.000Z").ToUnixTimeMilliseconds());
    }
}
