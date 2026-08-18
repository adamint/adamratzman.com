using System.Text.Json.Serialization;

namespace AdamRatzman.Activity.Contract;

/// <summary>
/// Mirrors the wire shape kotlinx.serialization produced for <c>kotlin.Pair</c>.
/// The frontend reads <c>.first</c> and <c>.second</c> directly, so these names are frozen.
/// </summary>
public sealed record Pair<T1, T2>(T1 First, T2 Second);

public sealed record PaginationRequest(int Offset, int Limit);

public sealed record PaginationResponse<T>(
    T Data,
    int Total,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PaginationRequest? Next,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] PaginationRequest? Previous);

public sealed record MonthYearPair(string Month, int Year);

public sealed record WeekMonthYearPair(
    int WeekStartDay,
    int WeekStartMonth,
    int WeekEndDay,
    int WeekEndMonth,
    int Year,
    long StartEpochSeconds);

public sealed record SerializableDayOfWeek(int Number, string Name);

public sealed record SerializableMonth(int Number, string Name);

public sealed record SerializableLocalDate(
    long DateMillis,
    int Minute,
    int HourOfDay,
    SerializableDayOfWeek DayOfWeek,
    int DayOfMonth,
    SerializableMonth Month,
    int Year);

public sealed record RouteElevation(double Up, double Down);

public sealed record SerializableBikeInfo(string Name, bool IsElectric);

public sealed record MapImage(string Attribution, string Src, bool Templated, string Type);

public sealed record PublicTourInfo(
    string Name,
    int Duration,
    double Distance,
    SportType SportType,
    SerializableBikeInfo? BicycleInfo,
    SerializableLocalDate Date,
    MapImage MapImage,
    RouteElevation Elevation);

public sealed record ToursInMonthYear(
    MonthYearPair MonthYearPair,
    IReadOnlyList<PublicTourInfo> Tours,
    IReadOnlyDictionary<string, double> DistanceBySportType);
