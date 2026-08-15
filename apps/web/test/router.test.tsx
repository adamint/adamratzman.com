import type { LoaderFunctionArgs } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveConsoleTerminal } from '../src/components/nav/ConsoleComponent';
import { getSpotifyClientId } from '../src/components/utils/useSpotifyStore';
import { buildNextQuery } from '../src/compat/next/router';
import { createPkceCodeVerifier } from '../src/spotify-utils/auth/SpotifyAuthUtils';
import {
  loadSpotifyArtistRouteData,
  loadSpotifyCategoriesRouteData,
  loadSpotifyCategoryRouteData,
  loadSpotifyGenreListRouteData,
  loadSpotifyPlaylistRouteData,
  loadSpotifyTrackRouteData,
  loadSpotifyUserRouteData,
  routePaths,
} from '../src/router';

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

describe('routePaths', () => {
  it('preserves the public route table', () => {
    expect(routePaths).toEqual([
      '/',
      '/academics',
      '/academics/bachelors',
      '/academics/masters',
      '/academics/mba',
      '/contact',
      '/portfolio',
      '/projects',
      '/projects/calculator',
      '/projects/character-counter',
      '/projects/conversion/base-converter',
      '/projects/spotify',
      '/projects/spotify/artists/:artistId',
      '/projects/spotify/callback',
      '/projects/spotify/categories',
      '/projects/spotify/categories/:categoryId',
      '/projects/spotify/generate-token',
      '/projects/spotify/genres/list',
      '/projects/spotify/mytop',
      '/projects/spotify/playlists/:playlistId',
      '/projects/spotify/recommend',
      '/projects/spotify/recommend/create-playlist',
      '/projects/spotify/tracks/:trackId',
      '/projects/spotify/users/:userId',
      '*',
    ]);
  });
});

describe('spotify data loaders', () => {
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
    ],
    [
      'category list',
      loadSpotifyCategoriesRouteData,
      createLoaderArgs(),
      '/api/spotify/categories',
      [{ id: 'category-1', name: 'Category', icons: [{ url: 'https://example.com/category.png' }] }],
    ],
    [
      'category details',
      loadSpotifyCategoryRouteData,
      createLoaderArgs({ categoryId: 'category-1' }),
      '/api/spotify/categories/category-1',
      {
        category: { name: 'Category', icons: [{ url: 'https://example.com/category.png' }] },
        categoryPlaylists: { items: [] },
      },
    ],
    [
      'genre list',
      loadSpotifyGenreListRouteData,
      createLoaderArgs(),
      '/api/spotify/genres',
      ['rock', 'pop'],
    ],
    [
      'playlist details',
      loadSpotifyPlaylistRouteData,
      createLoaderArgs({ playlistId: 'playlist-1' }),
      '/api/spotify/playlists/playlist-1',
      {
        id: 'playlist-1',
        name: 'Playlist',
      },
    ],
    [
      'track details',
      loadSpotifyTrackRouteData,
      createLoaderArgs({ trackId: 'track-1' }),
      '/api/spotify/tracks/track-1',
      {
        id: 'track-1',
        name: 'Track',
        external_urls: { spotify: 'https://open.spotify.com/track/track-1' },
      },
    ],
    [
      'user details',
      loadSpotifyUserRouteData,
      createLoaderArgs({ userId: 'user-1' }),
      '/api/spotify/users/user-1',
      {
        totalPlaylists: 1,
        user: { id: 'user-1' },
      },
    ],
  ])('loads %s from the API', async (_label, loader, args, path, payload) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loader(args)).resolves.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(path, {
      headers: {
        accept: 'application/json',
      },
    });
  });

  it.each([
    ['artist details', loadSpotifyArtistRouteData, createLoaderArgs({ artistId: 'missing-artist' }), '/projects/spotify'],
    ['category details', loadSpotifyCategoryRouteData, createLoaderArgs({ categoryId: 'missing-category' }), '/projects/spotify/categories'],
    ['playlist details', loadSpotifyPlaylistRouteData, createLoaderArgs({ playlistId: 'missing-playlist' }), '/projects/spotify'],
    ['track details', loadSpotifyTrackRouteData, createLoaderArgs({ trackId: 'missing-track' }), '/projects/spotify'],
    ['user details', loadSpotifyUserRouteData, createLoaderArgs({ userId: 'missing-user' }), '/projects/spotify'],
  ])('redirects %s to the fallback route when the API request fails', async (_label, loader, args, destination) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

    const response = await loader(args);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe(destination);
  });
});

describe('vite compatibility helpers', () => {
  it('resolves the console terminal component from the CommonJS package export', () => {
    expect(typeof resolveConsoleTerminal()).toBe('function');
  });

  it('reads the spotify client id from the vite environment', () => {
    expect(getSpotifyClientId({ NEXT_PUBLIC_SPOTIFY_CLIENT_ID: 'spotify-client-id' })).toBe('spotify-client-id');
  });

  it('creates a PKCE verifier with valid characters', () => {
    const verifier = createPkceCodeVerifier(128, {
      getRandomValues<T extends ArrayBufferView>(values: T): T {
        const byteView = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
        byteView.forEach((_, index) => {
          byteView[index] = index;
        });
        return values;
      },
    });

    expect(verifier).toHaveLength(128);
    expect(verifier).toMatch(/^[A-Za-z0-9._~-]+$/);
  });

  it('keeps route params when the query string reuses the same key', () => {
    expect(buildNextQuery('?userId=query-user&view=compact', { userId: 'path-user' })).toEqual({
      userId: 'path-user',
      view: 'compact',
    });
  });
});
