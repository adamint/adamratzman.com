import type { LoaderFunctionArgs } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, fetchJson } from '../src/api/client';
import {
  loadSpotifyArtistRouteData,
  loadSpotifyCategoriesRouteData,
  loadSpotifyCategoryRouteData,
  loadSpotifyGenreListRouteData,
  loadSpotifyPlaylistRouteData,
  loadSpotifyTrackRouteData,
  loadSpotifyUserRouteData,
} from '../src/api/spotifyLoaders';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function createLoaderArgs(params: Record<string, string | undefined> = {}): LoaderFunctionArgs {
  return {
    context: undefined,
    params,
    request: new Request('http://localhost'),
  } as unknown as LoaderFunctionArgs;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  });
}

async function expectRedirect(result: Promise<unknown>, destination: string) {
  const response = await result;
  expect(response).toBeInstanceOf(Response);
  expect((response as Response).status).toBe(302);
  expect((response as Response).headers.get('Location')).toBe(destination);
}

describe('fetchJson', () => {
  it('returns parsed JSON with an explicit accept header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson<{ ok: boolean }>('/api/example')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/example', {
      headers: {
        accept: 'application/json',
      },
    });
  });

  it('uses a generic typed error for non-success responses without reading their body', async () => {
    const response = new Response('server-only details', { status: 502 });
    const textSpy = vi.spyOn(response, 'text');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const error = await fetchJson('/api/example').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      message: 'The requested data could not be loaded.',
      status: 502,
    });
    expect(String(error)).not.toContain('server-only details');
    expect(textSpy).not.toHaveBeenCalled();
  });

  it('uses the same safe error when a successful response is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>not json</html>')));

    const error = await fetchJson('/api/example').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      message: 'The requested data could not be loaded.',
      status: 200,
    });
    expect(String(error)).not.toContain('not json');
  });
});

describe('Spotify route loaders', () => {
  it.each([
    [
      'artist details',
      loadSpotifyArtistRouteData,
      createLoaderArgs({ artistId: 'artist-1' }),
      '/api/spotify/artists/artist-1',
      {
        artist: { id: 'artist-1', name: 'Artist' },
        artistAlbums: { total: 1 },
        artistTopTracks: { tracks: [] },
        relatedArtists: [],
      },
      {
        artist: { id: 'artist-1', name: 'Artist' },
        artistAlbums: { total: 1 },
        artistTopTracks: { tracks: [] },
        relatedArtists: [],
      },
    ],
    [
      'category list',
      loadSpotifyCategoriesRouteData,
      createLoaderArgs(),
      '/api/spotify/categories',
      [{ id: 'category-1', name: 'Category', icons: [] }],
      { categories: [{ id: 'category-1', name: 'Category', icons: [] }] },
    ],
    [
      'category details',
      loadSpotifyCategoryRouteData,
      createLoaderArgs({ categoryId: 'category-1' }),
      '/api/spotify/categories/category-1',
      {
        category: { name: 'Category', icons: [] },
        categoryPlaylists: { items: [] },
      },
      {
        category: { name: 'Category', icons: [] },
        categoryPlaylists: { items: [] },
      },
    ],
    [
      'genre list',
      loadSpotifyGenreListRouteData,
      createLoaderArgs(),
      '/api/spotify/genres',
      ['rock', 'pop'],
      { genres: ['rock', 'pop'] },
    ],
    [
      'playlist details',
      loadSpotifyPlaylistRouteData,
      createLoaderArgs({ playlistId: 'playlist-1' }),
      '/api/spotify/playlists/playlist-1',
      { id: 'playlist-1', name: 'Playlist' },
      { playlist: { id: 'playlist-1', name: 'Playlist' } },
    ],
    [
      'track details',
      loadSpotifyTrackRouteData,
      createLoaderArgs({ trackId: 'track-1' }),
      '/api/spotify/tracks/track-1',
      { id: 'track-1', name: 'Track' },
      { track: { id: 'track-1', name: 'Track' } },
    ],
    [
      'user details',
      loadSpotifyUserRouteData,
      createLoaderArgs({ userId: 'user-1' }),
      '/api/spotify/users/user-1',
      { totalPlaylists: 1, user: { id: 'user-1' } },
      { totalPlaylists: 1, user: { id: 'user-1' } },
    ],
  ])('loads %s from the API', async (_label, loader, args, path, payload, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loader(args)).resolves.toEqual(expected);
    expect(fetchMock).toHaveBeenCalledWith(path, {
      headers: {
        accept: 'application/json',
      },
    });
  });

  it('encodes required route parameters before requesting them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'track' }));
    vi.stubGlobal('fetch', fetchMock);

    await loadSpotifyTrackRouteData(createLoaderArgs({ trackId: 'track/with spaces' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/spotify/tracks/track%2Fwith%20spaces', {
      headers: {
        accept: 'application/json',
      },
    });
  });

  it.each([
    ['artist details', loadSpotifyArtistRouteData, createLoaderArgs(), '/projects'],
    ['category details', loadSpotifyCategoryRouteData, createLoaderArgs(), '/projects/spotify/categories'],
    ['playlist details', loadSpotifyPlaylistRouteData, createLoaderArgs(), '/projects'],
    ['track details', loadSpotifyTrackRouteData, createLoaderArgs(), '/projects'],
    ['user details', loadSpotifyUserRouteData, createLoaderArgs(), '/projects'],
  ])('redirects %s before fetching when a required parameter is absent', async (
    _label,
    loader,
    args,
    destination,
  ) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expectRedirect(loader(args), destination);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['artist details', loadSpotifyArtistRouteData, createLoaderArgs({ artistId: 'artist' }), '/projects'],
    ['category list', loadSpotifyCategoriesRouteData, createLoaderArgs(), '/projects'],
    ['category details', loadSpotifyCategoryRouteData, createLoaderArgs({ categoryId: 'category' }), '/projects/spotify/categories'],
    ['genre list', loadSpotifyGenreListRouteData, createLoaderArgs(), '/projects'],
    ['playlist details', loadSpotifyPlaylistRouteData, createLoaderArgs({ playlistId: 'playlist' }), '/projects'],
    ['track details', loadSpotifyTrackRouteData, createLoaderArgs({ trackId: 'track' }), '/projects'],
    ['user details', loadSpotifyUserRouteData, createLoaderArgs({ userId: 'user' }), '/projects'],
  ])('redirects %s safely when its request fails', async (_label, loader, args, destination) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private failure', { status: 503 })));

    await expectRedirect(loader(args), destination);
  });
});
