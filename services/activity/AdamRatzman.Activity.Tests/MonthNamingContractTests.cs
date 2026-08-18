using System.Text.Json;
using AdamRatzman.Activity.Contract;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

/// <summary>
/// Pins the preserved Kotlin quirk documented on <see cref="MonthGrouping.EnglishMonthNumberName"/>: production
/// serves the month as an unpadded number string ("1".."12"), not an English name, because the JDK's
/// <c>TextStyle.FULL_STANDALONE</c> has no CLDR stand-alone month names for English and falls back to the
/// numeric value. Day-of-week names are unaffected and must remain full English names.
/// </summary>
public class MonthNamingContractTests
{
    private static readonly TimeZoneInfo Utc = TimeZoneInfo.Utc;

    [Theory]
    [InlineData(1, "1")]
    [InlineData(2, "2")]
    [InlineData(3, "3")]
    [InlineData(4, "4")]
    [InlineData(5, "5")]
    [InlineData(6, "6")]
    [InlineData(7, "7")]
    [InlineData(8, "8")]
    [InlineData(9, "9")]
    [InlineData(10, "10")]
    [InlineData(11, "11")]
    [InlineData(12, "12")]
    public void EveryMonthMapsToItsUnpaddedNumberString(int month, string expected)
    {
        MonthGrouping.EnglishMonthNumberName(month).Should().Be(expected);
    }

    [Fact]
    public void DayOfWeekNameRemainsFullEnglishNotNumeric()
    {
        var tour = new KomootTour
        {
            Id = 1,
            Name = "ride",
            Sport = "touringbicycle",
            Date = DateTimeOffset.Parse("2026-08-14T18:32:10.000Z"), // a Friday
            Duration = 60,
            Distance = 1000
        };

        var result = TourMapper.ToPublicTour(tour, Utc);

        result.Date.DayOfWeek.Name.Should().Be("Friday");
        result.Date.Month.Name.Should().Be("8");
    }

    [Fact]
    public void MonthYearPairSerializesTheMonthAsAQuotedNumericString()
    {
        var monthYear = new MonthYearPair(MonthGrouping.EnglishMonthNumberName(8), 2026);

        var json = JsonSerializer.Serialize(monthYear, ContractJson.Options);

        json.Should().Be("""{"month":"8","year":2026}""");
    }
}
