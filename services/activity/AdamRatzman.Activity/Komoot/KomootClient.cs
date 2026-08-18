using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AdamRatzman.Activity.Komoot;

public sealed class KomootClient(
    HttpClient httpClient,
    IOptions<ActivityOptions> options,
    ILogger<KomootClient> logger)
{
    private readonly ActivityOptions _options = options.Value;
    private KomootSession? _session;

    private sealed record KomootSession(string UserId, string Token);

    public async Task<IReadOnlyList<KomootTour>> GetAllToursAsync(CancellationToken cancellationToken)
    {
        var session = _session ??= await LoginAsync(cancellationToken);

        try
        {
            return await CrawlAsync(session, cancellationToken);
        }
        catch (KomootUnauthorizedException)
        {
            // Only a 401 triggers re-authentication. The Kotlin caught every exception here,
            // so a DNS blip or a parse error would also fire off a fresh login.
            logger.LogInformation("Komoot session rejected; re-authenticating once");
            session = _session = await LoginAsync(cancellationToken);
            return await CrawlAsync(session, cancellationToken);
        }
    }

    private async Task<KomootSession> LoginAsync(CancellationToken cancellationToken)
    {
        // The Kotlin interpolated the email into the URL raw, with no escaping at all. `@` is a
        // legal pchar in a URI path segment, so keep it literal to match exactly what Komoot has
        // always received; escape everything else that needs it.
        var escapedEmail = Uri.EscapeDataString(_options.KomootEmail).Replace("%40", "@");
        var url = $"{_options.AccountApiBaseUrl.TrimEnd('/')}/account/email/{escapedEmail}/";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = BasicAuth(_options.KomootEmail, _options.KomootPassword);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var login = JsonSerializer.Deserialize<KomootLoginResponse>(body, KomootJson.Options)
                    ?? throw new InvalidOperationException("Komoot returned an empty login response");

        if (string.IsNullOrEmpty(login.User.Username) || string.IsNullOrEmpty(login.Password))
        {
            throw new InvalidOperationException("Komoot login response was missing the user id or session token");
        }

        return new KomootSession(login.User.Username, login.Password);
    }

    private async Task<IReadOnlyList<KomootTour>> CrawlAsync(KomootSession session, CancellationToken cancellationToken)
    {
        var url = $"{_options.TourApiBaseUrl.TrimEnd('/')}/users/{session.UserId}/tours/?type=tour_recorded&format=coordinate_array";

        var tours = new List<KomootTour>();
        var visited = new HashSet<string>(StringComparer.Ordinal);

        var page = 0;
        while (url is not null)
        {
            if (page >= _options.MaxPages)
            {
                // Unlike the visited-URL guard below, hitting the cap is not evidence the crawl is
                // stuck - it may simply mean the account grew past MaxPages worth of tours. A silent
                // truncation here would get baked into the served snapshot as if it were complete, so
                // warn loudly and return what we have rather than throwing (which would blank a
                // working chart over a pagination surprise).
                logger.LogWarning(
                    "Komoot pagination hit the {MaxPages}-page cap with {TourCount} tours collected so far; stopping the crawl",
                    _options.MaxPages, tours.Count);
                break;
            }

            if (!visited.Add(url))
            {
                logger.LogWarning("Komoot pagination revisited {Url}; stopping the crawl", url);
                break;
            }

            var body = await GetAsync(url, session, cancellationToken);
            var parsed = JsonSerializer.Deserialize<KomootTourPage>(body, KomootJson.Options);
            if (parsed is null) break;

            tours.AddRange(parsed.Tours());
            url = parsed.Links?.Next?.Href;
            page++;
        }

        return tours;
    }

    private async Task<string> GetAsync(string url, KomootSession session, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = BasicAuth(session.UserId, session.Token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));

        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized) throw new KomootUnauthorizedException();
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    private static AuthenticationHeaderValue BasicAuth(string user, string secret) =>
        new("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user}:{secret}")));
}

public sealed class KomootUnauthorizedException() : HttpRequestException("Komoot rejected the credentials (401)");
