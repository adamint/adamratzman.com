import type {
  SpotifyArtistDetails,
  SpotifyCategoryDetails,
  SpotifyUserDetails,
} from '@adamratzman/contracts';
import { cleanup, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, fetchJson } from '../src/api/client';
import {
  artistLoader,
  categoriesLoader,
  categoryLoader,
  genresLoader,
  playlistLoader,
  trackLoader,
  userLoader,
} from '../src/api/spotifyLoaders';
import { routes } from '../src/router';
import { renderWithRouter } from './render';

const genericErrorMessage = 'Unable to complete the request.';
const originalAxiosAdapter = axios.defaults.adapter;
const originalAxiosBaseUrl = axios.defaults.baseURL;

const artist = {
  id: 'a',
  name: 'boygenius',
  external_urls: { spotify: 'https://open.spotify.com/artist/a' },
  href: 'https://api.spotify.com/v1/artists/a',
  uri: 'spotify:artist:a',
  type: 'artist',
  images: [{ url: 'https://images.example/artist.png', height: 640, width: 640 }],
  popularity: 97,
  followers: { href: 'https://api.spotify.com/v1/artists/a/followers', total: 1_000_000 },
  genres: ['indie'],
} satisfies SpotifyApi.SingleArtistResponse;

const relatedArtist = {
  ...artist,
  id: 'related',
  name: 'Lucy Dacus',
  external_urls: { spotify: 'https://open.spotify.com/artist/related' },
  href: 'https://api.spotify.com/v1/artists/related',
  uri: 'spotify:artist:related',
} satisfies SpotifyApi.ArtistObjectFull;

const album = {
  album_type: 'album',
  artists: [artist],
  external_urls: { spotify: 'https://open.spotify.com/album/album-1' },
  href: 'https://api.spotify.com/v1/albums/album-1',
  id: 'album-1',
  images: [{ url: 'https://images.example/album.png', height: 640, width: 640 }],
  name: 'the record',
  release_date: '2023-03-31',
  release_date_precision: 'day',
  total_tracks: 12,
  type: 'album',
  uri: 'spotify:album:album-1',
} satisfies SpotifyApi.AlbumObjectSimplified;

const track = {
  album,
  artists: [artist],
  disc_number: 1,
  duration_ms: 207_000,
  explicit: false,
  external_ids: { isrc: 'USUG12205777' },
  external_urls: { spotify: 'https://open.spotify.com/track/t' },
  href: 'https://api.spotify.com/v1/tracks/t',
  id: 't',
  name: 'Not Strong Enough',
  popularity: 84,
  preview_url: 'https://audio.example/track.mp3',
  track_number: 6,
  type: 'track',
  uri: 'spotify:track:t',
} satisfies SpotifyApi.SingleTrackResponse;

const owner = {
  display_name: 'Adam',
  external_urls: { spotify: 'https://open.spotify.com/user/u' },
  followers: { href: 'https://api.spotify.com/v1/users/u/followers', total: 42 },
  href: 'https://api.spotify.com/v1/users/u',
  id: 'u',
  images: [{ url: 'https://images.example/user.png', height: 300, width: 300 }],
  type: 'user',
  uri: 'spotify:user:u',
} satisfies SpotifyApi.UserProfileResponse;

const playlistSummary = {
  collaborative: false,
  description: 'Favorite songs',
  external_urls: { spotify: 'https://open.spotify.com/playlist/p' },
  href: 'https://api.spotify.com/v1/playlists/p',
  id: 'p',
  images: [{ url: 'https://images.example/playlist.png', height: 640, width: 640 }],
  name: 'Favorites',
  owner,
  public: true,
  snapshot_id: 'snapshot-1',
  tracks: {
    href: 'https://api.spotify.com/v1/playlists/p/tracks',
    total: 12,
  },
  type: 'playlist',
  uri: 'spotify:playlist:p',
} satisfies SpotifyApi.PlaylistObjectSimplified;

const playlist = {
  ...playlistSummary,
  followers: { href: 'https://api.spotify.com/v1/playlists/p/followers', total: 128 },
  tracks: {
    href: 'https://api.spotify.com/v1/playlists/p/tracks',
    items: [],
    limit: 10,
    next: '',
    offset: 0,
    previous: '',
    total: 12,
  },
} satisfies SpotifyApi.SinglePlaylistResponse;

const category = {
  href: 'https://api.spotify.com/v1/browse/categories/party',
  icons: [{ url: 'https://images.example/category.png', height: 300, width: 300 }],
  id: 'party',
  name: 'Party',
} satisfies SpotifyApi.SingleCategoryResponse;

const artistDetails = {
  artist,
  artistAlbums: {
    href: 'https://api.spotify.com/v1/artists/a/albums',
    items: [album],
    limit: 50,
    next: '',
    offset: 0,
    previous: '',
    total: 1,
  },
  artistTopTracks: { tracks: [track] },
  relatedArtists: [relatedArtist],
} satisfies SpotifyArtistDetails;

const categoryDetails = {
  category,
  categoryPlaylists: {
    href: 'https://api.spotify.com/v1/browse/categories/party/playlists',
    items: [playlistSummary],
    limit: 20,
    next: '',
    offset: 0,
    previous: '',
    total: 1,
  },
} satisfies SpotifyCategoryDetails;

const userDetails = {
  user: owner,
  totalPlaylists: 3,
} satisfies SpotifyUserDetails;

afterEach(() => {
  cleanup();
  axios.defaults.adapter = originalAxiosAdapter;
  axios.defaults.baseURL = originalAxiosBaseUrl;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('fetchJson', () => {
  it('returns parsed JSON and merges an application/json accept header', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ value: 42 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson<{ value: number }>('/api/example', {
      headers: { 'x-request-id': 'request-1' },
    })).resolves.toEqual({ value: 42 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('x-request-id')).toBe('request-1');
    expect(headers.has('content-type')).toBe(false);
  });

  it('sets content-type only when a request body exists', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchJson('/api/example', {
      body: JSON.stringify({ value: 42 }),
      method: 'POST',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
  });

  it('uses a reviewed API error message and preserves the status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    }, { status: 502 })));

    const error = await captureApiClientError(fetchJson('/api/example'));

    expect(error.status).toBe(502);
    expect(error.message).toBe('Spotify could not complete the request.');
  });

  it.each([
    ['non-JSON', new Response('TOP SECRET upstream response', { status: 502 })],
    ['malformed', Response.json({ error: 'TOP SECRET upstream response' }, { status: 502 })],
  ])('uses a generic safe error for a %s non-2xx body', async (_label, response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const error = await captureApiClientError(fetchJson('/api/example'));

    expect(error.status).toBe(502);
    expect(error.message).toBe(genericErrorMessage);
    expect(error.message).not.toContain('TOP SECRET');
  });

  it('uses a generic safe error for a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('TOP SECRET network details')));

    const error = await captureApiClientError(fetchJson('/api/example'));

    expect(error.status).toBe(0);
    expect(error.message).toBe(genericErrorMessage);
    expect(error.message).not.toContain('TOP SECRET');
  });

  it('uses a generic safe error for malformed success JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      'TOP SECRET malformed JSON',
      { status: 200 },
    )));

    const error = await captureApiClientError(fetchJson('/api/example'));

    expect(error.status).toBe(200);
    expect(error.message).toBe(genericErrorMessage);
    expect(error.message).not.toContain('TOP SECRET');
  });
});

describe('Spotify API loaders', () => {
  it('loads typed artist aggregate data from the encoded artist endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(artistDetails));
    vi.stubGlobal('fetch', fetchMock);

    await expect(artistLoader({
      params: { artistId: 'a' },
    })).resolves.toEqual(artistDetails);

    expect(fetchMock).toHaveBeenCalledWith('/api/spotify/artists/a', expect.any(Object));
  });

  it('returns the categories wrapper consumed by the route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([category])));

    await expect(categoriesLoader()).resolves.toEqual({ categories: [category] });
  });

  it('returns the genres wrapper consumed by the route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(['indie', 'folk'])));

    await expect(genresLoader()).resolves.toEqual({ genres: ['indie', 'folk'] });
  });

  it.each([
    ['category', categoryLoader, { categoryId: 'party' }, categoryDetails, '/api/spotify/categories/party'],
    ['track', trackLoader, { trackId: 't' }, { track }, '/api/spotify/tracks/t'],
    ['playlist', playlistLoader, { playlistId: 'p' }, { playlist }, '/api/spotify/playlists/p'],
    ['user', userLoader, { userId: 'u' }, userDetails, '/api/spotify/users/u'],
  ] as const)(
    'returns the exact %s shape consumed by its route',
    async (_label, loader, params, responseBody, expectedUrl) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json(
        _label === 'track'
          ? track
          : _label === 'playlist'
            ? playlist
            : responseBody,
      ));
      vi.stubGlobal('fetch', fetchMock);

      await expect(loader({ params })).resolves.toEqual(responseBody);
      expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    },
  );

  it.each([
    ['artist', artistLoader, {}, '/projects'],
    ['category', categoryLoader, {}, '/projects/spotify/categories'],
    ['track', trackLoader, {}, '/projects'],
    ['playlist', playlistLoader, {}, '/projects'],
    ['user', userLoader, {}, '/projects'],
  ] as const)(
    'rejects a missing %s route parameter before fetching',
    async (_label, loader, params, redirectPath) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const response = await captureRedirect(loader({ params }));

      expect(response.headers.get('location')).toBe(redirectPath);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['artist', artistLoader, { artistId: 'a' }, '/projects'],
    ['categories', categoriesLoader, undefined, '/projects'],
    ['category', categoryLoader, { categoryId: 'party' }, '/projects/spotify/categories'],
    ['genres', genresLoader, undefined, '/projects'],
    ['playlist', playlistLoader, { playlistId: 'p' }, '/projects'],
    ['track', trackLoader, { trackId: 't' }, '/projects'],
    ['user', userLoader, { userId: 'u' }, '/projects'],
  ] as const)(
    'redirects a failing %s API request safely',
    async (_label, loader, params, redirectPath) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
        error: {
          code: 'spotify_upstream_error',
          message: 'Spotify could not complete the request.',
        },
      }, { status: 502 })));

      const response = await captureRedirect(
        params === undefined ? loader() : loader({ params }),
      );

      expect(response.headers.get('location')).toBe(redirectPath);
    },
  );
});

describe('Spotify route integration', () => {
  it.each([
    [
      '/projects/spotify/artists/a',
      '/api/spotify/artists/a',
      artistDetails,
      'Artist boygenius',
      'Spotify artist boygenius | Adam Ratzman',
    ],
    [
      '/projects/spotify/categories',
      '/api/spotify/categories',
      [category],
      'Spotify Category List',
      'Spotify Categories | Adam Ratzman',
    ],
    [
      '/projects/spotify/categories/party',
      '/api/spotify/categories/party',
      categoryDetails,
      'Category Party',
      'Spotify Category Party | Adam Ratzman',
    ],
    [
      '/projects/spotify/genres/list',
      '/api/spotify/genres',
      ['indie', 'folk'],
      'Spotify Genres',
      'Spotify Genres | Adam Ratzman',
    ],
    [
      '/projects/spotify/playlists/p',
      '/api/spotify/playlists/p',
      playlist,
      'Playlist Favorites',
      'Spotify playlist Favorites | Adam Ratzman',
    ],
    [
      '/projects/spotify/tracks/t',
      '/api/spotify/tracks/t',
      track,
      'Track Not Strong Enough',
      'Spotify track Not Strong Enough by boygenius | Adam Ratzman',
    ],
    [
      '/projects/spotify/users/u',
      '/api/spotify/users/u',
      userDetails,
      'User Adam',
      'Spotify user Adam | Adam Ratzman',
    ],
  ] as const)(
    'renders %s from loader data without exposing a raw route error',
    async (path, endpoint, responseBody, heading, title) => {
      axios.defaults.adapter = 'fetch';
      axios.defaults.baseURL = window.location.origin;
      vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL): Promise<Response> => {
        const requestPath = input instanceof Request
          ? new URL(input.url).pathname
          : String(input);

        if (requestPath === endpoint) {
          return Promise.resolve(Response.json(responseBody));
        }

        if (requestPath === '/api/spotify/getPlaylistTracks'
          || requestPath === '/api/spotify/getUserPlaylists') {
          return Promise.resolve(Response.json({
            href: `https://api.spotify.com${requestPath}`,
            items: [],
            limit: 10,
            next: null,
            offset: 0,
            previous: null,
            total: 0,
          }));
        }

        return Promise.reject(new Error(`Unexpected request: ${requestPath}`));
      }));

      renderWithRouter(routes, { initialEntries: [path] });

      expect(await screen.findByRole('heading', {
        name: new RegExp(heading, 'i'),
      })).toBeVisible();
      expect(document.querySelector('#main-content')).toBeInTheDocument();
      await waitFor(() => {
        expect(document.title).toBe(title);
      });
      expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sorry, this page could not be loaded/i)).not.toBeInTheDocument();
    },
  );
});

async function captureApiClientError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiClientError);
    return error as ApiClientError;
  }

  throw new Error('Expected an ApiClientError.');
}

async function captureRedirect(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    const response = error as Response;
    expect(response.status).toBe(302);
    return response;
  }

  throw new Error('Expected a redirect response.');
}
