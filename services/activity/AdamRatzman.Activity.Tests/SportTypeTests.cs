using AdamRatzman.Activity.Contract;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class SportTypeTests
{
    [Theory]
    [InlineData("Morning ride (P)", BikeType.Propella_7S)]
    [InlineData("Morning ride (R)", BikeType.Cervelo_SLC_SL)]
    [InlineData("Morning ride (C)", BikeType.REI_CO_OP_GENERATION_E)]
    [InlineData("Morning ride", BikeType.Specialized_Turbo_Vado)]
    [InlineData("Morning ride (X)", BikeType.Specialized_Turbo_Vado)]
    public void ParsesBikeTypeFromNameSuffix(string name, BikeType expected)
    {
        BikeTypes.FromTourName(name).Should().Be(expected);
    }

    [Theory]
    [InlineData(BikeType.Propella_7S, true)]
    [InlineData(BikeType.Specialized_Turbo_Vado, true)]
    [InlineData(BikeType.Cervelo_SLC_SL, false)]
    [InlineData(BikeType.REI_CO_OP_GENERATION_E, true)]
    public void KnowsWhichBikesAreElectric(BikeType bike, bool electric)
    {
        bike.IsElectric().Should().Be(electric);
    }

    [Fact]
    public void BikeTypeNamesAreWireValues()
    {
        BikeType.Propella_7S.ToString().Should().Be("Propella_7S");
        BikeType.Specialized_Turbo_Vado.ToString().Should().Be("Specialized_Turbo_Vado");
        BikeType.Cervelo_SLC_SL.ToString().Should().Be("Cervelo_SLC_SL");
        BikeType.REI_CO_OP_GENERATION_E.ToString().Should().Be("REI_CO_OP_GENERATION_E");
    }

    [Theory]
    // substring match on "bike"/"bicycle", then the (R) rule
    [InlineData("touringbicycle", "Evening ride (R)", SportType.Biking)]
    [InlineData("touringbicycle", "Evening ride (P)", SportType.EBiking)]
    [InlineData("touringbicycle", "Evening ride", SportType.EBiking)]
    [InlineData("e_touringbicycle", "Evening ride", SportType.EBiking)]
    [InlineData("racebike", "Fast one (R)", SportType.Biking)]
    [InlineData("citybike", "Commute", SportType.EBiking)]
    // mtb does not contain "bike" or "bicycle"
    [InlineData("mtb", "Trail (R)", SportType.Other)]
    [InlineData("jogging", "Morning run", SportType.Running)]
    [InlineData("running", "Morning run", SportType.Running)]
    [InlineData("hiking", "Ridge walk", SportType.Hiking)]
    // Komoot actually sends "hike"; the Kotlin never matched it. Preserved deliberately.
    [InlineData("hike", "Ridge walk", SportType.Other)]
    [InlineData("snowshoe", "Snow day", SportType.Other)]
    public void MapsKomootSportToPublicSport(string komootSport, string tourName, SportType expected)
    {
        SportTypes.FromKomoot(komootSport, tourName).Should().Be(expected);
    }
}
