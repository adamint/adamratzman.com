using System.Text.Json;
using System.Text.Json.Serialization;

namespace AdamRatzman.Activity.Komoot;

/// <summary>
/// JSON settings for *reading* the Komoot API. Deliberately permissive — Komoot adds and removes
/// fields without notice, and a crawl that throws leaves the site with stale data.
/// This is not the same options object used to write our own responses; see <c>ContractJson</c>.
/// </summary>
public static class KomootJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip
    };
}

/// <summary>The nine properties of a Komoot tour that this service actually uses.</summary>
public sealed class KomootTour
{
    public long Id { get; init; }
    public string Name { get; init; } = "";
    public string Sport { get; init; } = "";
    public DateTimeOffset Date { get; init; }
    public double Distance { get; init; }
    public int Duration { get; init; }
    public double ElevationUp { get; init; }
    public double ElevationDown { get; init; }
    public KomootMapImage? MapImage { get; init; }
}

public sealed class KomootMapImage
{
    public string Attribution { get; init; } = "";
    public string Src { get; init; } = "";
    public bool Templated { get; init; }
    public string Type { get; init; } = "";
}

public sealed class KomootTourPage
{
    [JsonPropertyName("_embedded")]
    public KomootEmbeddedTours? Embedded { get; init; }

    [JsonPropertyName("_links")]
    public KomootLinks? Links { get; init; }

    public IReadOnlyList<KomootTour> Tours() => Embedded?.Tours ?? [];
}

public sealed class KomootEmbeddedTours
{
    public List<KomootTour> Tours { get; init; } = [];
}

public sealed class KomootLinks
{
    public KomootHref? Next { get; init; }
}

public sealed class KomootHref
{
    public string Href { get; init; } = "";
}

/// <summary>
/// Komoot's account-lookup response. The quirk that makes the rest of the client work:
/// <see cref="Password"/> is not the password that was sent, it is a session token, and
/// <c>User.Username</c> is a numeric user id rather than the email that was used to authenticate.
/// Every subsequent v007 call uses basic auth of (User.Username, Password).
/// </summary>
public sealed class KomootLoginResponse
{
    public string Password { get; init; } = "";
    public KomootLoginUser User { get; init; } = new();
}

public sealed class KomootLoginUser
{
    public string Username { get; init; } = "";
}
