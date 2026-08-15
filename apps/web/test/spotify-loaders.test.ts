import type {
  SpotifyArtistDetails,
  SpotifyCategoryDetails,
  SpotifyUserDetails,
} from '@adamratzman/contracts';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
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

type ExpectedSpotifyImage = {
  url: string;
};

type ExpectedSpotifyNamedEntity = {
  id: string;
  name: string;
};

type ExpectedSpotifyExternalUrl = {
  spotify: string;
};

type ExpectedSpotifyPlaylistCard = {
  description?: string | null;
  id: string;
  images: ExpectedSpotifyImage[];
  name: string;
  owner: {
    display_name?: string | null;
    id: string;
  };
  tracks: {
    total: number;
  };
};

type ExpectedSpotifyTrackCard = {
  album: {
    images: ExpectedSpotifyImage[];
  };
  artists: ExpectedSpotifyNamedEntity[];
  duration_ms: number;
  id: string;
  name: string;
  popularity: number;
  preview_url?: string | null;
};

type ExpectedSpotifyArtistDetails = {
  artist: {
    external_urls: ExpectedSpotifyExternalUrl;
    followers: {
      total: number;
    };
    genres: string[];
    id: string;
    images: ExpectedSpotifyImage[];
    name: string;
    popularity: number;
  };
  artistAlbums: {
    total: number;
  };
  artistTopTracks: {
    tracks: ExpectedSpotifyTrackCard[];
  };
  relatedArtists: ExpectedSpotifyNamedEntity[];
};

type ExpectedSpotifyCategoryDetails = {
  category: {
    icons: ExpectedSpotifyImage[];
    name: string;
  };
  categoryPlaylists: {
    items: ExpectedSpotifyPlaylistCard[];
  };
};

type ExpectedSpotifyPlaylistDetails = {
  collaborative: boolean;
  description?: string | null;
  external_urls: ExpectedSpotifyExternalUrl;
  followers: {
    total: number;
  };
  id: string;
  images: ExpectedSpotifyImage[];
  name: string;
  owner: {
    display_name?: string | null;
    followers?: {
      total: number;
    } | null;
    id: string;
  };
  public: boolean | null;
  tracks: {
    total: number;
  };
};

type ExpectedSpotifyTrackDetails = {
  album: {
    images: ExpectedSpotifyImage[];
  };
  artists: ExpectedSpotifyNamedEntity[];
  external_urls: ExpectedSpotifyExternalUrl;
  id: string;
  name: string;
};

type ExpectedSpotifyUserDetails = {
  totalPlaylists: number;
  user: {
    display_name?: string | null;
    external_urls: ExpectedSpotifyExternalUrl;
    followers?: {
      total: number;
    } | null;
    id: string;
    images?: ExpectedSpotifyImage[] | null;
  };
};

const malformedResponseSentinel = 'RAW_MALFORMED_SPOTIFY_SENTINEL';

const malformedLoaderGroups = [
  {
    endpoint: '/api/spotify/categories',
    fallbackHeading: 'Projects',
    fallbackPath: '/projects',
    label: 'categories',
    load: () => categoriesLoader(loaderArgs()),
    malformedBodies: [
      ['null response', null],
      ['object instead of an array', {}],
      ['missing item fields', [{ name: 'Party', icons: category.icons }]],
      ['empty icons', [{ ...category, icons: [] }]],
      ['non-string icon URL', [{
        ...category,
        icons: [{ url: { sentinel: malformedResponseSentinel } }],
      }]],
      ['malformed later icon', [{
        ...category,
        icons: [
          category.icons[0],
          { url: { sentinel: malformedResponseSentinel } },
        ],
      }]],
    ],
    path: '/projects/spotify/categories',
  },
  {
    endpoint: '/api/spotify/genres',
    fallbackHeading: 'Projects',
    fallbackPath: '/projects',
    label: 'genres',
    load: () => genresLoader(loaderArgs()),
    malformedBodies: [
      ['null response', null],
      ['object instead of an array', {}],
      ['non-string array item', ['indie', { sentinel: malformedResponseSentinel }]],
    ],
    path: '/projects/spotify/genres/list',
  },
  {
    endpoint: '/api/spotify/categories/party',
    fallbackHeading: 'Spotify Category List',
    fallbackPath: '/projects/spotify/categories',
    label: 'category',
    load: () => categoryLoader(loaderArgs({ categoryId: 'party' })),
    malformedBodies: [
      ['null response', null],
      ['missing aggregate fields', {}],
      ['missing category name', {
        ...categoryDetails,
        category: { icons: category.icons },
      }],
      ['empty category icons', {
        ...categoryDetails,
        category: { ...category, icons: [] },
      }],
      ['non-array playlist items', {
        ...categoryDetails,
        categoryPlaylists: {
          ...categoryDetails.categoryPlaylists,
          items: { sentinel: malformedResponseSentinel },
        },
      }],
      ['malformed playlist summary', {
        ...categoryDetails,
        categoryPlaylists: {
          ...categoryDetails.categoryPlaylists,
          items: [{ ...playlistSummary, images: [] }],
        },
      }],
    ],
    path: '/projects/spotify/categories/party',
  },
  {
    endpoint: '/api/spotify/artists/a',
    fallbackHeading: 'Projects',
    fallbackPath: '/projects',
    label: 'artist',
    load: () => artistLoader(loaderArgs({ artistId: 'a' })),
    malformedBodies: [
      ['null response', null],
      ['missing aggregate fields', {}],
      ['empty artist images', {
        ...artistDetails,
        artist: { ...artistDetails.artist, images: [] },
      }],
      ['unsafe artist external URL', {
        ...artistDetails,
        artist: {
          ...artistDetails.artist,
          external_urls: { spotify: 'javascript:alert(1)' },
        },
      }],
      ['non-number artist popularity', {
        ...artistDetails,
        artist: {
          ...artistDetails.artist,
          popularity: malformedResponseSentinel,
        },
      }],
      ['non-number artist followers', {
        ...artistDetails,
        artist: {
          ...artistDetails.artist,
          followers: { total: malformedResponseSentinel },
        },
      }],
      ['non-string artist genres', {
        ...artistDetails,
        artist: {
          ...artistDetails.artist,
          genres: [{ sentinel: malformedResponseSentinel }],
        },
      }],
      ['non-number album total', {
        ...artistDetails,
        artistAlbums: {
          ...artistDetails.artistAlbums,
          total: malformedResponseSentinel,
        },
      }],
      ['non-array top tracks', {
        ...artistDetails,
        artistTopTracks: {
          tracks: { sentinel: malformedResponseSentinel },
        },
      }],
      ['malformed top track', {
        ...artistDetails,
        artistTopTracks: {
          tracks: [{
            ...track,
            album: { ...track.album, images: [] },
          }],
        },
      }],
      ['malformed related artist', {
        ...artistDetails,
        relatedArtists: [{ name: malformedResponseSentinel }],
      }],
    ],
    path: '/projects/spotify/artists/a',
  },
  {
    endpoint: '/api/spotify/tracks/t',
    fallbackHeading: 'Projects',
    fallbackPath: '/projects',
    label: 'track',
    load: () => trackLoader(loaderArgs({ trackId: 't' })),
    malformedBodies: [
      ['null response', null],
      ['missing track fields', {}],
      ['non-array artists', {
        ...track,
        artists: { sentinel: malformedResponseSentinel },
      }],
      ['malformed artist', {
        ...track,
        artists: [{ id: 'a' }],
      }],
      ['empty album images', {
        ...track,
        album: { ...track.album, images: [] },
      }],
      ['missing external URL', {
        ...track,
        external_urls: {},
      }],
      ['non-Spotify external URL', {
        ...track,
        external_urls: { spotify: 'https://example.com/track/t' },
      }],
      ['blob Spotify external URL', {
        ...track,
        external_urls: { spotify: 'blob:https://open.spotify.com/track/t' },
      }],
      ['credentialed Spotify external URL', {
        ...track,
        external_urls: { spotify: 'https://user:password@open.spotify.com/track/t' },
      }],
    ],
    path: '/projects/spotify/tracks/t',
  },
  {
    endpoint: '/api/spotify/playlists/p',
    fallbackHeading: 'Projects',
    fallbackPath: '/projects',
    label: 'playlist',
    load: () => playlistLoader(loaderArgs({ playlistId: 'p' })),
    malformedBodies: [
      ['null response', null],
      ['missing playlist fields', {}],
      ['non-array images', {
        ...playlist,
        images: { sentinel: malformedResponseSentinel },
      }],
      ['missing owner', {
        ...playlist,
        owner: null,
      }],
      ['insecure playlist external URL', {
        ...playlist,
        external_urls: { spotify: 'http://open.spotify.com/playlist/p' },
      }],
      ['invalid optional owner display name', {
        ...playlist,
        owner: {
          ...playlist.owner,
          display_name: { sentinel: malformedResponseSentinel },
        },
      }],
      ['non-number followers', {
        ...playlist,
        followers: { total: malformedResponseSentinel },
      }],
      ['non-number track total', {
        ...playlist,
        tracks: {
          ...playlist.tracks,
          total: malformedResponseSentinel,
        },
      }],
      ['non-boolean public state', {
        ...playlist,
        public: malformedResponseSentinel,
      }],
      ['non-boolean collaborative state', {
        ...playlist,
        collaborative: null,
      }],
    ],
    path: '/projects/spotify/playlists/p',
  },
  {
    endpoint: '/api/spotify/users/u',
    fallbackHeading: 'Projects',
    fallbackPath: '/projects',
    label: 'user',
    load: () => userLoader(loaderArgs({ userId: 'u' })),
    malformedBodies: [
      ['null response', null],
      ['missing aggregate fields', {}],
      ['negative playlist total', {
        ...userDetails,
        totalPlaylists: -1,
      }],
      ['non-number playlist total', {
        ...userDetails,
        totalPlaylists: malformedResponseSentinel,
      }],
      ['missing external URL', {
        ...userDetails,
        user: { ...userDetails.user, external_urls: {} },
      }],
      ['malformed user external URL', {
        ...userDetails,
        user: {
          ...userDetails.user,
          external_urls: { spotify: 'not a URL' },
        },
      }],
      ['non-array optional images', {
        ...userDetails,
        user: {
          ...userDetails.user,
          images: { sentinel: malformedResponseSentinel },
        },
      }],
      ['malformed optional image', {
        ...userDetails,
        user: {
          ...userDetails.user,
          images: [{ url: { sentinel: malformedResponseSentinel } }],
        },
      }],
      ['malformed optional followers', {
        ...userDetails,
        user: {
          ...userDetails.user,
          followers: { total: malformedResponseSentinel },
        },
      }],
      ['malformed optional display name', {
        ...userDetails,
        user: {
          ...userDetails.user,
          display_name: { sentinel: malformedResponseSentinel },
        },
      }],
    ],
    path: '/projects/spotify/users/u',
  },
] as const;

const malformedLoaderCases = malformedLoaderGroups.flatMap(group =>
  group.malformedBodies.map(([caseLabel, malformedBody]) => ({
    ...group,
    caseLabel,
    malformedBody,
  })),
);

afterEach(() => {
  cleanup();
  axios.defaults.adapter = originalAxiosAdapter;
  axios.defaults.baseURL = originalAxiosBaseUrl;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('fetchJson', () => {
  it('accepts only relative strings or URLs', () => {
    type FetchJsonInput = Parameters<typeof fetchJson>[0];

    expectTypeOf<FetchJsonInput>().toEqualTypeOf<string | URL>();
  });

  it('returns parsed JSON, preserves caller headers, and requests JSON', async () => {
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

  it('does not infer content-type from an arbitrary request body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchJson('/api/example', {
      body: JSON.stringify({ value: 42 }),
      method: 'POST',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).has('content-type')).toBe(false);
  });

  it('preserves an explicit JSON content-type', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchJson('/api/example', {
      body: JSON.stringify({ value: 42 }),
      headers: { 'content-type': 'application/json; charset=utf-8' },
      method: 'POST',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('passes the caller abort signal to fetch', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchJson('/api/example', { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('/api/example', expect.objectContaining({
      signal: controller.signal,
    }));
  });

  it('rethrows an AbortError unchanged', async () => {
    const abortError = new DOMException('raw abort text', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(fetchJson('/api/example')).rejects.toBe(abortError);
  });

  it('rethrows the original rejection when the request signal is aborted', async () => {
    const controller = new AbortController();
    const abortReason = new Error('raw abort reason');
    controller.abort(abortReason);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortReason));

    await expect(fetchJson('/api/example', {
      signal: controller.signal,
    })).rejects.toBe(abortReason);
  });

  it.each([
    ['success', 200, false],
    ['error', 502, false],
    ['success with an aborted signal', 200, true],
    ['error with an aborted signal', 502, true],
  ])(
    'rethrows the original body-read failure for a %s response',
    async (_label, status, abortSignal) => {
      const controller = new AbortController();
      const bodyReadFailure = abortSignal
        ? new Error('raw abort reason')
        : new DOMException('raw abort text', 'AbortError');
      const response = new Response(null, { status });
      vi.spyOn(response, 'json').mockImplementation(() => {
        if (abortSignal) {
          controller.abort(bodyReadFailure);
        }

        return Promise.reject(bodyReadFailure);
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

      await expect(fetchJson('/api/example', {
        signal: controller.signal,
      })).rejects.toBe(bodyReadFailure);
    },
  );

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
    ['nested', Response.json({
      error: {
        code: 'spotify_upstream_error',
        error: { message: 'TOP SECRET nested response' },
        message: 'Spotify could not complete the request.',
      },
    }, { status: 502 })],
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
  it('exposes only the route-specific fields validated before rendering', () => {
    expectTypeOf<Awaited<ReturnType<typeof categoriesLoader>>>().toEqualTypeOf<{
      categories: Array<{
        icons: ExpectedSpotifyImage[];
        id: string;
        name: string;
      }>;
    }>();
    expectTypeOf<Awaited<ReturnType<typeof categoryLoader>>>()
      .toEqualTypeOf<ExpectedSpotifyCategoryDetails>();
    expectTypeOf<Awaited<ReturnType<typeof genresLoader>>>()
      .toEqualTypeOf<{ genres: string[] }>();
    expectTypeOf<Awaited<ReturnType<typeof artistLoader>>>()
      .toEqualTypeOf<ExpectedSpotifyArtistDetails>();
    expectTypeOf<Awaited<ReturnType<typeof trackLoader>>>().toEqualTypeOf<{
      track: ExpectedSpotifyTrackDetails;
    }>();
    expectTypeOf<Awaited<ReturnType<typeof playlistLoader>>>().toEqualTypeOf<{
      playlist: ExpectedSpotifyPlaylistDetails;
      playlistId: string;
    }>();
    expectTypeOf<Awaited<ReturnType<typeof userLoader>>>().toEqualTypeOf<{
      totalPlaylists: number;
      user: ExpectedSpotifyUserDetails['user'];
      userId: string;
    }>();
  });

  it('trims and encodes route IDs before requesting Spotify data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(artistDetails));
    vi.stubGlobal('fetch', fetchMock);

    await expect(artistLoader(loaderArgs({
      artistId: '  artist/with spaces  ',
    }))).resolves.toEqual(artistDetails);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/spotify/artists/artist%2Fwith%20spaces',
      expect.any(Object),
    );
  });

  it('returns the categories wrapper consumed by the route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([category])));

    await expect(categoriesLoader(loaderArgs())).resolves.toEqual({ categories: [category] });
  });

  it('returns the genres wrapper consumed by the route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(['indie', 'folk'])));

    await expect(genresLoader(loaderArgs())).resolves.toEqual({ genres: ['indie', 'folk'] });
  });

  it.each([
    ['category', categoryLoader, { categoryId: 'party' }, categoryDetails, categoryDetails, '/api/spotify/categories/party'],
    ['track', trackLoader, { trackId: 't' }, track, { track }, '/api/spotify/tracks/t'],
    ['playlist', playlistLoader, { playlistId: 'p' }, playlist, { playlist, playlistId: 'p' }, '/api/spotify/playlists/p'],
    ['user', userLoader, { userId: 'u' }, userDetails, { ...userDetails, userId: 'u' }, '/api/spotify/users/u'],
  ] as const)(
    'returns the exact %s shape consumed by its route',
    async (_label, loader, params, responseBody, expectedResult, expectedUrl) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
      vi.stubGlobal('fetch', fetchMock);

      await expect(loader(loaderArgs(params))).resolves.toEqual(expectedResult);
      expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    },
  );

  it.each(malformedLoaderCases)(
    'replaces malformed $label data ($caseLabel) before returning loader data',
    async ({ fallbackPath, load, malformedBody }) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(malformedBody)));

      const response = await captureReplace(load());

      expect(response.headers.get('location')).toBe(fallbackPath);
    },
  );

  it.each([
    ['artist', artistLoader, { artistId: 'a' }, artistDetails],
    ['categories', categoriesLoader, {}, [category]],
    ['category', categoryLoader, { categoryId: 'party' }, categoryDetails],
    ['genres', genresLoader, {}, ['indie', 'folk']],
    ['playlist', playlistLoader, { playlistId: 'p' }, playlist],
    ['track', trackLoader, { trackId: 't' }, track],
    ['user', userLoader, { userId: 'u' }, userDetails],
  ] as const)(
    'passes the request signal through the %s loader',
    async (_label, loader, params, responseBody) => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
      vi.stubGlobal('fetch', fetchMock);
      const args = loaderArgs(params, controller.signal);

      await loader(args);

      expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        signal: args.request.signal,
      }));
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

      const response = await captureReplace(loader(loaderArgs(params)));

      expect(response.headers.get('location')).toBe(redirectPath);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['artist', artistLoader, { artistId: 'a' }, '/projects'],
    ['categories', categoriesLoader, {}, '/projects'],
    ['category', categoryLoader, { categoryId: 'party' }, '/projects'],
    ['genres', genresLoader, {}, '/projects'],
    ['playlist', playlistLoader, { playlistId: 'p' }, '/projects'],
    ['track', trackLoader, { trackId: 't' }, '/projects'],
    ['user', userLoader, { userId: 'u' }, '/projects'],
  ] as const)(
    'replaces a failing %s 5xx request safely',
    async (_label, loader, params, replacePath) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
        error: {
          code: 'spotify_upstream_error',
          message: 'Spotify could not complete the request.',
        },
      }, { status: 502 })));

      const response = await captureReplace(loader(loaderArgs(params)));

      expect(response.headers.get('location')).toBe(replacePath);
    },
  );

  it.each([400, 404])(
    'replaces a category %i response with the category list',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
        error: {
          code: 'spotify_upstream_error',
          message: 'Spotify could not complete the request.',
        },
      }, { status })));

      const response = await captureReplace(categoryLoader(loaderArgs({
        categoryId: 'party',
      })));

      expect(response.headers.get('location')).toBe('/projects/spotify/categories');
    },
  );

  it('replaces a category network failure directly with projects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('raw network text')));

    const response = await captureReplace(categoryLoader(loaderArgs({
      categoryId: 'party',
    })));

    expect(response.headers.get('location')).toBe('/projects');
  });

  it('does not replace an aborted loader request', async () => {
    const abortError = new DOMException('raw abort text', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(artistLoader(loaderArgs({
      artistId: 'a',
    }))).rejects.toBe(abortError);
  });

  it.each([
    ['success', 200],
    ['error', 502],
  ])(
    'does not replace when an aborted %s response body read rejects',
    async (_label, status) => {
      const controller = new AbortController();
      const abortError = new DOMException('raw abort text', 'AbortError');
      const response = new Response(null, { status });
      vi.spyOn(response, 'json').mockImplementation(() => {
        controller.abort(abortError);
        return Promise.reject(abortError);
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

      await expect(artistLoader(loaderArgs({
        artistId: 'a',
      }, controller.signal))).rejects.toBe(abortError);
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

  it('encodes genre category links from the artist route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...artistDetails,
      artist: {
        ...artistDetails.artist,
        genres: ['r&b / soul'],
      },
    })));

    renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/artists/a'],
    });

    expect(await screen.findByRole('link', { name: 'r&b / soul' })).toHaveAttribute(
      'href',
      '/projects/spotify/categories/r%26b%20%2F%20soul',
    );
  });

  it('encodes category links from the genre list route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(['r&b / soul'])));

    renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/genres/list'],
    });

    expect(await screen.findByRole('link', { name: 'r&b / soul' })).toHaveAttribute(
      'href',
      '/projects/spotify/categories/r%26b%20%2F%20soul',
    );
  });

  it('replaces a failed loader route so Back does not re-enter it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    }, { status: 502 })));

    const { router } = renderWithRouter(routes, {
      initialEntries: ['/contact', '/projects/spotify/artists/a'],
      initialIndex: 1,
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
    });
    expect(router.state.historyAction).toBe('REPLACE');

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.pathname).toBe('/contact');
  });

  it('replaces a category 5xx directly with projects without loading categories', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    }, { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    const { router } = renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/categories/party'],
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('replaces a missing category with the category list without looping', async () => {
    const fetchMock = vi.fn((input: string | URL): Promise<Response> => {
      if (String(input) === '/api/spotify/categories/party') {
        return Promise.resolve(Response.json({
          error: {
            code: 'not_found',
            message: 'The category was not found.',
          },
        }, { status: 404 }));
      }

      if (String(input) === '/api/spotify/categories') {
        return Promise.resolve(Response.json([category]));
      }

      return Promise.reject(new Error(`Unexpected request: ${String(input)}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { router } = renderWithRouter(routes, {
      initialEntries: ['/contact', '/projects/spotify/categories/party'],
      initialIndex: 1,
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify Category List',
    })).toBeVisible();
    expect(router.state.location.pathname).toBe('/projects/spotify/categories');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(router.state.location.pathname).toBe('/contact');
  });

  it.each(malformedLoaderCases)(
    'contains malformed $label data ($caseLabel) before React renders it',
    async ({
      endpoint,
      fallbackHeading,
      fallbackPath,
      malformedBody,
      path,
    }) => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const pageErrors: string[] = [];
      const recordPageError = (event: ErrorEvent) => {
        pageErrors.push(formatObservedError(event.error ?? event.message));
      };
      window.addEventListener('error', recordPageError);
      const fetchMock = vi.fn((input: string | URL): Promise<Response> => {
        const requestPath = String(input);
        if (requestPath === endpoint) {
          return Promise.resolve(Response.json(malformedBody));
        }

        if (requestPath === '/api/spotify/categories') {
          return Promise.resolve(Response.json([category]));
        }

        return Promise.reject(new Error(`Unexpected request: ${requestPath}`));
      });
      vi.stubGlobal('fetch', fetchMock);

      try {
        const { router } = renderWithRouter(routes, {
          initialEntries: [path],
        });

        expect(await screen.findByRole('heading', {
          name: fallbackHeading,
        })).toBeVisible();
        expect(router.state.location.pathname).toBe(fallbackPath);
        expect(router.state.historyAction).toBe('REPLACE');
        expect(router.state.errors).toBeNull();
        expect(document.querySelector('#main-content')).toBeInTheDocument();
        expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Sorry, this page could not be loaded/i)).not.toBeInTheDocument();
        expect(formatObservedError(consoleError.mock.calls)).not.toMatch(
          /TypeError|RAW_MALFORMED_SPOTIFY_SENTINEL/u,
        );
        expect(pageErrors.join('\n')).not.toMatch(
          /TypeError|RAW_MALFORMED_SPOTIFY_SENTINEL/u,
        );
        expect(document.body).not.toHaveTextContent(malformedResponseSentinel);
      } finally {
        window.removeEventListener('error', recordPageError);
      }
    },
  );

  it('keeps an aborted superseded navigation out of the UI and console', async () => {
    const abortError = new DOMException('raw abort text', 'AbortError');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let oldSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((
      input: string | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      if (String(input) === '/api/spotify/artists/old') {
        oldSignal = init?.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          oldSignal?.addEventListener('abort', () => reject(abortError), { once: true });
        });
      }

      if (String(input) === '/api/spotify/artists/new') {
        return Promise.resolve(Response.json({
          ...artistDetails,
          artist: {
            ...artistDetails.artist,
            id: 'new',
            name: 'New Artist',
          },
        }));
      }

      return Promise.reject(new Error(`Unexpected request: ${String(input)}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { router } = renderWithRouter(routes, {
      initialEntries: ['/projects'],
    });

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
    let oldNavigation: Promise<void> | undefined;
    act(() => {
      oldNavigation = router.navigate('/projects/spotify/artists/old');
    });
    await waitFor(() => {
      expect(oldSignal).toBeDefined();
    });
    await act(async () => {
      await router.navigate('/projects/spotify/artists/new');
    });
    await oldNavigation;

    expect(oldSignal?.aborted).toBe(true);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/spotify/artists/new');
    });
    expect(router.state.errors).toBeNull();
    expect(router.state.navigation.state).toBe('idle');
    expect(await screen.findByRole('heading', {
      name: /Artist New Artist/i,
    })).toBeVisible();
    expect(document.body).not.toHaveTextContent('raw abort text');
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('raw abort text');
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('raw abort text');
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain('raw abort text');
  });
});

describe('Spotify paginated route IDs', () => {
  it.each([
    {
      idKey: 'playlistId',
      label: 'playlist',
      loaderEndpoint: (id: string) => `/api/spotify/playlists/${id}`,
      pageHeading: (id: string) => `Playlist Playlist ${id}`,
      pagePath: (id: string) => `/projects/spotify/playlists/${id}`,
      paginatedEndpoint: '/api/spotify/getPlaylistTracks',
      responseBody: (id: string) => ({
        ...playlist,
        id,
        name: `Playlist ${id}`,
      }),
    },
    {
      idKey: 'userId',
      label: 'user',
      loaderEndpoint: (id: string) => `/api/spotify/users/${id}`,
      pageHeading: (id: string) => `User User ${id}`,
      pagePath: (id: string) => `/projects/spotify/users/${id}`,
      paginatedEndpoint: '/api/spotify/getUserPlaylists',
      responseBody: (id: string) => ({
        ...userDetails,
        user: {
          ...userDetails.user,
          display_name: `User ${id}`,
          id,
        },
      }),
    },
  ])(
    'uses normalized $label IDs and exact POST bodies across same-route navigation',
    async ({
      idKey,
      loaderEndpoint,
      pageHeading,
      pagePath,
      paginatedEndpoint,
      responseBody,
    }) => {
      const postRecords: Array<{
        body: Record<string, unknown>;
        header: string;
        signal: AbortSignal | undefined;
        url: string;
      }> = [];
      vi.spyOn(axios, 'post').mockImplementation((url, body, config) => {
        postRecords.push({
          body: body as Record<string, unknown>,
          header: document.querySelector('#main-content')?.textContent ?? '',
          signal: config?.signal as AbortSignal | undefined,
          url,
        });
        return Promise.resolve({
          data: {
            items: [],
            total: 30,
          },
        }) as never;
      });
      vi.stubGlobal('fetch', vi.fn((input: string | URL): Promise<Response> => {
        const requestPath = String(input);
        if (requestPath === loaderEndpoint('u1')) {
          return Promise.resolve(Response.json(responseBody('u1')));
        }

        if (requestPath === loaderEndpoint('u2')) {
          return Promise.resolve(Response.json(responseBody('u2')));
        }

        return Promise.reject(new Error(`Unexpected request: ${requestPath}`));
      }));

      const { router } = renderWithRouter(routes, {
        initialEntries: [pagePath('%20u1%20')],
      });

      await waitFor(() => {
        expect(router.state.navigation.state).toBe('idle');
      });
      expect(router.state.location.pathname).toBe(pagePath('%20u1%20'));
      expect(router.state.errors).toBeNull();
      expect(await screen.findByRole('heading', {
        name: new RegExp(pageHeading('u1'), 'i'),
      })).toBeVisible();
      await waitFor(() => {
        expect(postRecords).toHaveLength(1);
      });
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      await waitFor(() => {
        expect(postRecords).toHaveLength(2);
      });

      await act(async () => {
        await router.navigate(pagePath('%20u2%20'));
      });
      expect(await screen.findByRole('heading', {
        name: new RegExp(pageHeading('u2'), 'i'),
      })).toBeVisible();
      await waitFor(() => {
        expect(postRecords).toHaveLength(3);
      });
      await act(async () => {
        await new Promise(resolve => window.setTimeout(resolve, 20));
      });

      expect(postRecords).toHaveLength(3);
      expect(postRecords.map(record => record.url)).toEqual([
        paginatedEndpoint,
        paginatedEndpoint,
        paginatedEndpoint,
      ]);
      expect(postRecords.map(record => record.body)).toEqual([
        { [idKey]: 'u1', limit: 10, offset: 0 },
        { [idKey]: 'u1', limit: 10, offset: 1 },
        { [idKey]: 'u2', limit: 10, offset: 0 },
      ]);
      expect(postRecords.every(record => record.signal instanceof AbortSignal)).toBe(true);
      expect(postRecords[0]?.header).toContain(pageHeading('u1'));
      expect(postRecords[1]?.header).toContain(pageHeading('u1'));
      expect(postRecords[2]?.header).toContain(pageHeading('u2'));
    },
  );

  it('posts a numeric limit from the actual page-size callback', async () => {
    const postBodies: unknown[] = [];
    vi.spyOn(axios, 'post').mockImplementation((_url, body) => {
      postBodies.push(body);
      return Promise.resolve({
        data: {
          items: [],
          total: 30,
        },
      }) as never;
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(playlist)));

    renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/playlists/p'],
    });

    expect(await screen.findByRole('heading', {
      name: /Playlist Favorites/i,
    })).toBeVisible();
    await waitFor(() => {
      expect(postBodies).toHaveLength(1);
    });
    fireEvent.click(screen.getByRole('button', { name: '10 / page' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: '20 / page' }));
    await waitFor(() => {
      expect(postBodies).toHaveLength(2);
    });

    expect(postBodies[1]).toEqual({
      limit: 20,
      offset: 0,
      playlistId: 'p',
    });
    expect(typeof (postBodies[1] as { limit: unknown }).limit).toBe('number');
  });
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

function loaderArgs(
  params: Record<string, string | undefined> = {},
  signal?: AbortSignal,
) {
  return {
    params,
    request: new Request('http://localhost/spotify-loader', { signal }),
  };
}

async function captureReplace(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    const response = error as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get('x-remix-replace')).toBe('true');
    return response;
  }

  throw new Error('Expected a replace response.');
}

function formatObservedError(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ''}`;
  }

  if (Array.isArray(value)) {
    return value.map(formatObservedError).join('\n');
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  return String(value);
}
