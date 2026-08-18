using System.Text.Json;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class WireDeserializationTests
{
    [Fact]
    public void DeserializesTourAndIgnoresUnknownFields()
    {
        const string json = """
        {
          "id": 3198054893,
          "name": "Evening ride (R)",
          "sport": "touringbicycle",
          "date": "2025-06-14T18:32:10.000Z",
          "distance": 24512.7,
          "duration": 4210,
          "elevation_up": 312.5,
          "elevation_down": 305.0,
          "map_image": {
            "attribution": "© komoot",
            "src": "https://photos.komoot.de/map/abc.png",
            "templated": false,
            "type": "tourpreview"
          },
          "some_field_komoot_added_last_week": { "nested": [1, 2, 3] },
          "kcal_active": 900,
          "vector_map_image": null
        }
        """;

        var tour = JsonSerializer.Deserialize<KomootTour>(json, KomootJson.Options)!;

        tour.Id.Should().Be(3198054893L);
        tour.Name.Should().Be("Evening ride (R)");
        tour.Sport.Should().Be("touringbicycle");
        tour.Distance.Should().BeApproximately(24512.7, 0.001);
        tour.Duration.Should().Be(4210);
        tour.ElevationUp.Should().BeApproximately(312.5, 0.001);
        tour.ElevationDown.Should().BeApproximately(305.0, 0.001);
        tour.Date.Should().Be(DateTimeOffset.Parse("2025-06-14T18:32:10.000Z"));
        tour.MapImage!.Src.Should().Be("https://photos.komoot.de/map/abc.png");
        tour.MapImage.Templated.Should().BeFalse();
        tour.MapImage.Type.Should().Be("tourpreview");
        tour.MapImage.Attribution.Should().Be("© komoot");
    }

    [Fact]
    public void ReadsNumericIdSuppliedAsString()
    {
        const string json = """
        { "id": "3198054893", "name": "x", "sport": "hike", "date": "2025-01-01T00:00:00.000Z",
          "distance": 1.0, "duration": 1, "elevation_up": 0.0, "elevation_down": 0.0 }
        """;

        JsonSerializer.Deserialize<KomootTour>(json, KomootJson.Options)!.Id.Should().Be(3198054893L);
    }

    [Fact]
    public void SurvivesATourWithNoMapImage()
    {
        const string json = """
        { "id": 1, "name": "x", "sport": "hike", "date": "2025-01-01T00:00:00.000Z",
          "distance": 1.0, "duration": 1, "elevation_up": 0.0, "elevation_down": 0.0 }
        """;

        JsonSerializer.Deserialize<KomootTour>(json, KomootJson.Options)!.MapImage.Should().BeNull();
    }

    [Fact]
    public void ExtractsSessionTokenFromLoginPasswordField()
    {
        const string json = """
        { "email": "adam@example.com",
          "username": "adam@example.com",
          "password": "session-token-value",
          "user": { "username": "1234567890", "displayname": "Adam", "metric": true } }
        """;

        var login = JsonSerializer.Deserialize<KomootLoginResponse>(json, KomootJson.Options)!;

        login.Password.Should().Be("session-token-value");
        login.User.Username.Should().Be("1234567890");
    }

    [Fact]
    public void ReadsPaginationNextLink()
    {
        const string json = """
        {
          "_embedded": { "tours": [ ] },
          "_links": { "next": { "href": "https://api.komoot.de/v007/users/1/tours/?page=2" } },
          "page": { "size": 50, "number": 1 }
        }
        """;

        var page = JsonSerializer.Deserialize<KomootTourPage>(json, KomootJson.Options)!;

        page.Links!.Next!.Href.Should().Contain("page=2");
        page.Tours().Should().BeEmpty();
    }

    [Fact]
    public void HandlesLastPageWithNoNextLink()
    {
        const string json = """{ "_embedded": { "tours": [] }, "_links": { } }""";

        JsonSerializer.Deserialize<KomootTourPage>(json, KomootJson.Options)!.Links!.Next.Should().BeNull();
    }

    [Fact]
    public void HandlesAResponseWithNoEmbeddedBlockAtAll()
    {
        const string json = """{ "_links": { } }""";

        JsonSerializer.Deserialize<KomootTourPage>(json, KomootJson.Options)!.Tours().Should().BeEmpty();
    }
}
