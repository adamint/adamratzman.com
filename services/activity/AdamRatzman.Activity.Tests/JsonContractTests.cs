using System.Text.Json;
using AdamRatzman.Activity.Contract;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class JsonContractTests
{
    private static string Write<T>(T value) => JsonSerializer.Serialize(value, ContractJson.Options);

    [Fact]
    public void PairSerializesAsFirstAndSecond()
    {
        var pair = new Pair<string, int>("a", 1);

        Write(pair).Should().Be("""{"first":"a","second":1}""");
    }

    [Fact]
    public void EnumsKeepTheirDeclaredCasing()
    {
        var tour = SampleTour(SportType.EBiking, bike: new SerializableBikeInfo("Propella_7S", true));

        Write(tour).Should().Contain("\"sportType\":\"EBiking\"")
                   .And.Contain("\"name\":\"Propella_7S\"");
    }

    [Fact]
    public void DistanceMapKeysAreEnumNamesNotCamelCase()
    {
        var map = new Dictionary<string, double>
        {
            [SportType.EBiking.ToString()] = 100.5,
            [SportType.Other.ToString()] = 2.0
        };

        Write(map).Should().Be("""{"EBiking":100.5,"Other":2}""");
    }

    [Fact]
    public void NullPaginationLinksAreOmitted()
    {
        var response = new PaginationResponse<int[]>([1, 2], 2, null, null);

        Write(response).Should().Be("""{"data":[1,2],"total":2}""");
    }

    [Fact]
    public void NonNullPaginationLinksAreWritten()
    {
        var response = new PaginationResponse<int[]>([1], 9, new PaginationRequest(2, 1), new PaginationRequest(0, 1));

        Write(response).Should().Be(
            """{"data":[1],"total":9,"next":{"offset":2,"limit":1},"previous":{"offset":0,"limit":1}}""");
    }

    [Fact]
    public void NullBicycleInfoIsWrittenExplicitly()
    {
        var tour = SampleTour(SportType.Other, bike: null);

        Write(tour).Should().Contain("\"bicycleInfo\":null");
    }

    [Fact]
    public void SerializableLocalDateMatchesTheFrontendShape()
    {
        var date = new SerializableLocalDate(
            1749926000000L, 32, 18,
            new SerializableDayOfWeek(6, "Saturday"), 14,
            new SerializableMonth(6, "June"), 2025);

        Write(date).Should().Be(
            """{"dateMillis":1749926000000,"minute":32,"hourOfDay":18,"dayOfWeek":{"number":6,"name":"Saturday"},"dayOfMonth":14,"month":{"number":6,"name":"June"},"year":2025}""");
    }

    [Fact]
    public void WeekPairIncludesStartEpochSecondsEvenThoughTheFrontendIgnoresIt()
    {
        var week = new WeekMonthYearPair(9, 6, 15, 6, 2025, 1749427200L);

        Write(week).Should().Be(
            """{"weekStartDay":9,"weekStartMonth":6,"weekEndDay":15,"weekEndMonth":6,"year":2025,"startEpochSeconds":1749427200}""");
    }

    private static PublicTourInfo SampleTour(SportType sport, SerializableBikeInfo? bike) => new(
        "Evening ride", 4210, 24512.7, sport, bike,
        new SerializableLocalDate(0, 0, 0, new SerializableDayOfWeek(1, "Monday"), 1, new SerializableMonth(1, "January"), 2025),
        new MapImage("© komoot", "https://example.invalid/a.png", false, "tourpreview"),
        new RouteElevation(312.5, 305.0));
}
