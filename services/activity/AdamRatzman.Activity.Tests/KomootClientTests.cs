using System.Net;
using System.Text;
using AdamRatzman.Activity;
using AdamRatzman.Activity.Komoot;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace AdamRatzman.Activity.Tests;

public class KomootClientTests
{
    private const string LoginBody = """
    { "email": "a@b.c", "username": "a@b.c", "password": "session-token",
      "user": { "username": "42", "displayname": "Adam" } }
    """;

    private static string PageBody(long id, string? next) => $$"""
    {
      "_embedded": { "tours": [ { "id": {{id}}, "name": "ride (R)", "sport": "touringbicycle",
        "date": "2025-06-1{{id}}T10:00:00.000Z", "distance": 1000, "duration": 60,
        "elevation_up": 1, "elevation_down": 1 } ] },
      "_links": { {{(next is null ? "" : $"\"next\": {{ \"href\": \"{next}\" }}")}} }
    }
    """;

    private static KomootClient BuildClient(StubHandler handler, ActivityOptions? options = null) =>
        new(new HttpClient(handler),
            Options.Create(options ?? new ActivityOptions { KomootEmail = "a@b.c", KomootPassword = "pw" }),
            NullLogger<KomootClient>.Instance);

    [Fact]
    public async Task AuthenticatesWithEmailThenUsesTheUserIdAndSessionToken()
    {
        var handler = new StubHandler()
            .When("v006/account/email", HttpStatusCode.OK, LoginBody)
            .When("v007/users/42/tours", HttpStatusCode.OK, PageBody(1, null));

        var tours = await BuildClient(handler).GetAllToursAsync(CancellationToken.None);

        tours.Should().HaveCount(1);
        handler.AuthHeaderFor("v006").Should().Be(Basic("a@b.c", "pw"));
        handler.AuthHeaderFor("v007").Should().Be(Basic("42", "session-token"));
    }

    [Fact]
    public async Task FollowsTheNextLinkUntilItIsAbsent()
    {
        const string page2 = "https://api.komoot.de/v007/users/42/tours/?page=2";
        var handler = new StubHandler()
            .When("v006/account/email", HttpStatusCode.OK, LoginBody)
            .When("page=2", HttpStatusCode.OK, PageBody(2, null))
            .When("v007/users/42/tours", HttpStatusCode.OK, PageBody(1, page2));

        var tours = await BuildClient(handler).GetAllToursAsync(CancellationToken.None);

        tours.Select(t => t.Id).Should().Equal(1, 2);
    }

    [Fact]
    public async Task ReAuthenticatesOnceOnA401AndSucceeds()
    {
        var handler = new StubHandler()
            .When("v006/account/email", HttpStatusCode.OK, LoginBody)
            .WhenSequence("v007/users/42/tours",
                (HttpStatusCode.Unauthorized, "nope"),
                (HttpStatusCode.OK, PageBody(1, null)));

        var tours = await BuildClient(handler).GetAllToursAsync(CancellationToken.None);

        tours.Should().HaveCount(1);
        handler.CountFor("v006/account/email").Should().Be(2);
    }

    [Fact]
    public async Task DoesNotReAuthenticateOnANon401Failure()
    {
        var handler = new StubHandler()
            .When("v006/account/email", HttpStatusCode.OK, LoginBody)
            .When("v007/users/42/tours", HttpStatusCode.InternalServerError, "boom");

        var act = () => BuildClient(handler).GetAllToursAsync(CancellationToken.None);

        await act.Should().ThrowAsync<HttpRequestException>();
        handler.CountFor("v006/account/email").Should().Be(1);
    }

    [Fact]
    public async Task GivesUpAfterASecond401RatherThanLoopingForever()
    {
        var handler = new StubHandler()
            .When("v006/account/email", HttpStatusCode.OK, LoginBody)
            .When("v007/users/42/tours", HttpStatusCode.Unauthorized, "nope");

        var act = () => BuildClient(handler).GetAllToursAsync(CancellationToken.None);

        await act.Should().ThrowAsync<HttpRequestException>();
        handler.CountFor("v006/account/email").Should().Be(2);
    }

    [Fact]
    public async Task StopsIfTheNextLinkPointsBackAtAPageAlreadyFetched()
    {
        const string self = "https://api.komoot.de/v007/users/42/tours/?type=tour_recorded&format=coordinate_array";
        var handler = new StubHandler()
            .When("v006/account/email", HttpStatusCode.OK, LoginBody)
            .When("v007/users/42/tours", HttpStatusCode.OK, PageBody(1, self));

        var tours = await BuildClient(handler).GetAllToursAsync(CancellationToken.None);

        tours.Should().HaveCount(1);
    }

    private static string Basic(string user, string secret) =>
        "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user}:{secret}"));
}

internal sealed class StubHandler : HttpMessageHandler
{
    private readonly List<(string Fragment, Queue<(HttpStatusCode Status, string Body)> Responses)> _rules = [];
    private readonly List<HttpRequestMessage> _seen = [];

    public StubHandler When(string urlFragment, HttpStatusCode status, string body)
    {
        var queue = new Queue<(HttpStatusCode, string)>();
        queue.Enqueue((status, body));
        _rules.Add((urlFragment, queue));
        return this;
    }

    public StubHandler WhenSequence(string urlFragment, params (HttpStatusCode Status, string Body)[] responses)
    {
        _rules.Add((urlFragment, new Queue<(HttpStatusCode, string)>(responses)));
        return this;
    }

    public int CountFor(string urlFragment) =>
        _seen.Count(r => r.RequestUri!.ToString().Contains(urlFragment, StringComparison.Ordinal));

    public string? AuthHeaderFor(string urlFragment) => _seen
        .First(r => r.RequestUri!.ToString().Contains(urlFragment, StringComparison.Ordinal))
        .Headers.Authorization?.ToString();

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        _seen.Add(request);
        var url = request.RequestUri!.ToString();

        // Rules are matched in declaration order, so register the most specific fragment first.
        var rule = _rules.FirstOrDefault(r => url.Contains(r.Fragment, StringComparison.Ordinal));
        if (rule.Responses is null) throw new InvalidOperationException($"No stub rule matched {url}");

        var (status, body) = rule.Responses.Count > 1 ? rule.Responses.Dequeue() : rule.Responses.Peek();

        return Task.FromResult(new HttpResponseMessage(status)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        });
    }
}
