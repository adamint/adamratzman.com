import type { Page, Request, Route } from '@playwright/test';
import type {
  SpotifyAutocompleteArtist,
  SpotifyAutocompleteTrack,
  SpotifyRecommendationTrack,
  SpotifyRecommendationsResponse,
  SpotifySearchPage,
} from '../packages/contracts/src/index';
import type {
  SpotifyArtistDetailsData,
  SpotifyCategoryDetailsData,
  SpotifyCategoryListItem,
  SpotifyPlaylistCard,
  SpotifyPlaylistDetails,
  SpotifyTrackCard,
  SpotifyTrackDetails,
  SpotifyUserDetailsData,
} from '../apps/web/src/api/spotifyLoaderTypes';

export type FixtureColorMode = 'light' | 'dark';

export const spotifyFixtureIds = {
  artist: 'fixtureartist01',
  category: 'indie',
  createdPlaylist: 'createdplaylist01',
  playlist: 'fixtureplaylist01',
  track: 'fixturetrack01',
  trackIds: ['fixturetrack01', 'fixturetrack02'],
  user: 'fixtureuser01',
} as const;

export type DeferredRequestGate = {
  release: () => void;
  started: Promise<void>;
};

export type FixtureRequestControl = {
  readonly calls: number;
  deferNext: () => DeferredRequestGate;
  failNext: (status?: number) => void;
};

type InternalRequestControl = FixtureRequestControl & {
  begin: () => Promise<number | null>;
};

export type SpotifyFixtureState = {
  api: {
    artist: FixtureRequestControl;
    categories: FixtureRequestControl;
    category: FixtureRequestControl;
    genres: FixtureRequestControl;
    playlist: FixtureRequestControl;
    playlistTracks: FixtureRequestControl;
    recommendations: FixtureRequestControl;
    searchArtists: FixtureRequestControl;
    searchTracks: FixtureRequestControl;
    seedGenres: FixtureRequestControl;
    track: FixtureRequestControl;
    user: FixtureRequestControl;
    userPlaylists: FixtureRequestControl;
  };
  headRequests: number;
  spotify: {
    createPlaylist: FixtureRequestControl;
    me: FixtureRequestControl;
    replaceTracks: FixtureRequestControl;
    topArtists: FixtureRequestControl;
    topTracks: FixtureRequestControl;
    tracks: FixtureRequestControl;
  };
  unexpectedRequests: string[];
};

type InstallSpotifyFixturesOptions = {
  authenticated?: boolean;
  colorMode?: FixtureColorMode;
  consoleOpen?: boolean;
};

type ApiControlKey = keyof SpotifyFixtureState['api'];
type SpotifyControlKey = keyof SpotifyFixtureState['spotify'];

const imageOrigin = 'https://images.example.test';
const spotifyScopes = [
  'playlist-modify-private',
  'playlist-modify-public',
  'playlist-read-collaborative',
  'user-library-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-top-read',
].join(' ');

export async function installSpotifyFixtures(
  page: Page,
  {
    authenticated = true,
    colorMode = 'light',
    consoleOpen = false,
  }: InstallSpotifyFixturesOptions = {},
): Promise<SpotifyFixtureState> {
  const api = createApiControls();
  const spotify = createSpotifyControls();
  const state: SpotifyFixtureState = {
    api,
    headRequests: 0,
    spotify,
    unexpectedRequests: [],
  };

  await page.addInitScript((fixtureState) => {
    localStorage.setItem('chakra-ui-color-mode', fixtureState.colorMode);
    localStorage.setItem('show_console', fixtureState.consoleOpen ? 'true' : 'false');
    if (fixtureState.tokenInfo) {
      localStorage.setItem('spotify_token', JSON.stringify(fixtureState.tokenInfo));
    } else {
      localStorage.removeItem('spotify_token');
    }
    sessionStorage.removeItem('spotify_pending_playlist');
  }, {
    colorMode,
    consoleOpen,
    tokenInfo: authenticated ? {
      expiry: Date.now() + 60 * 60 * 1000,
      token: {
        access_token: 'fixture-access-token',
        expires_in: 3600,
        refresh_token: 'fixture-refresh-token',
        scope: spotifyScopes,
        token_type: 'Bearer',
      },
    } : null,
  });

  await page.route('**/api/spotify/**', async route => {
    const request = route.request();
    const endpoint = resolveApiEndpoint(new URL(request.url()).pathname);
    if (!endpoint) {
      await failUnexpectedRequest(route, state, 'unknown app Spotify endpoint');
      return;
    }

    if (request.method() === 'HEAD') {
      state.headRequests += 1;
      await route.fulfill({ body: '', status: 204 });
      return;
    }

    if (request.method() !== endpoint.method) {
      await failUnexpectedRequest(
        route,
        state,
        `expected ${endpoint.method} for ${endpoint.key}`,
      );
      return;
    }

    const failureStatus = await api[endpoint.key].begin();
    if (failureStatus !== null) {
      await fulfillJson(route, {
        error: {
          code: 'fixture_failure',
          message: 'The deterministic Spotify fixture failed this request.',
        },
      }, failureStatus);
      return;
    }

    await fulfillApiEndpoint(route, endpoint.key, endpoint.parameter);
  });

  await page.route('https://api.spotify.com/v1/**', async route => {
    const request = route.request();
    const endpoint = resolveSpotifyEndpoint(request);
    if (!endpoint) {
      await failUnexpectedRequest(route, state, 'unknown Spotify Web API endpoint');
      return;
    }

    if (request.method() === 'HEAD') {
      state.headRequests += 1;
      await route.fulfill({ body: '', status: 204 });
      return;
    }

    const failureStatus = await spotify[endpoint.key].begin();
    if (failureStatus !== null) {
      await fulfillJson(route, {
        error: {
          message: 'The deterministic Spotify fixture failed this request.',
          status: failureStatus,
        },
      }, failureStatus);
      return;
    }

    await fulfillSpotifyEndpoint(route, endpoint.key, endpoint.parameter);
  });

  await page.route(`${imageOrigin}/**`, async route => {
    await route.fulfill({
      body: [
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">',
        '<rect width="96" height="96" fill="#2457a7"/>',
        '<circle cx="48" cy="48" r="24" fill="#fff"/>',
        '</svg>',
      ].join(''),
      contentType: 'image/svg+xml',
      status: 200,
    });
  });

  await page.route('https://open.spotify.com/embed/**', async route => {
    await route.fulfill({
      body: '<!doctype html><html lang="en"><title>Spotify preview</title><body>Spotify preview</body></html>',
      contentType: 'text/html',
      status: 200,
    });
  });

  return state;
}

function createApiControls(): Record<ApiControlKey, InternalRequestControl> {
  return {
    artist: createRequestControl(),
    categories: createRequestControl(),
    category: createRequestControl(),
    genres: createRequestControl(),
    playlist: createRequestControl(),
    playlistTracks: createRequestControl(),
    recommendations: createRequestControl(),
    searchArtists: createRequestControl(),
    searchTracks: createRequestControl(),
    seedGenres: createRequestControl(),
    track: createRequestControl(),
    user: createRequestControl(),
    userPlaylists: createRequestControl(),
  };
}

function createSpotifyControls(): Record<SpotifyControlKey, InternalRequestControl> {
  return {
    createPlaylist: createRequestControl(),
    me: createRequestControl(),
    replaceTracks: createRequestControl(),
    topArtists: createRequestControl(),
    topTracks: createRequestControl(),
    tracks: createRequestControl(),
  };
}

function createRequestControl(): InternalRequestControl {
  let calls = 0;
  const failures: number[] = [];
  const gates: Array<{
    releasePromise: Promise<void>;
    resolveRelease: () => void;
    resolveStarted: () => void;
  }> = [];

  return {
    get calls() {
      return calls;
    },
    deferNext() {
      let resolveRelease: () => void = () => undefined;
      let resolveStarted: () => void = () => undefined;
      const releasePromise = new Promise<void>(resolve => {
        resolveRelease = resolve;
      });
      const started = new Promise<void>(resolve => {
        resolveStarted = resolve;
      });
      let released = false;
      gates.push({
        releasePromise,
        resolveRelease,
        resolveStarted,
      });

      return {
        release() {
          if (released) return;
          released = true;
          resolveRelease();
        },
        started,
      };
    },
    failNext(status = 500) {
      failures.push(status);
    },
    async begin() {
      calls += 1;
      const gate = gates.shift();
      if (gate) {
        gate.resolveStarted();
        await gate.releasePromise;
      }

      return failures.shift() ?? null;
    },
  };
}

function resolveApiEndpoint(pathname: string): {
  key: ApiControlKey;
  method: 'GET' | 'POST';
  parameter?: string;
} | null {
  const staticEndpoints: Record<string, {
    key: ApiControlKey;
    method: 'GET' | 'POST';
  }> = {
    '/api/spotify/categories': { key: 'categories', method: 'GET' },
    '/api/spotify/genres': { key: 'genres', method: 'GET' },
    '/api/spotify/getAvailableGenreSeeds': { key: 'seedGenres', method: 'GET' },
    '/api/spotify/getPlaylistTracks': { key: 'playlistTracks', method: 'POST' },
    '/api/spotify/getRecommendations': { key: 'recommendations', method: 'POST' },
    '/api/spotify/getUserPlaylists': { key: 'userPlaylists', method: 'POST' },
    '/api/spotify/searchArtists': { key: 'searchArtists', method: 'POST' },
    '/api/spotify/searchTracks': { key: 'searchTracks', method: 'POST' },
  };
  const staticEndpoint = staticEndpoints[pathname];
  if (staticEndpoint) return staticEndpoint;

  const dynamicEndpoints: Array<{
    key: ApiControlKey;
    pattern: RegExp;
  }> = [
    { key: 'category', pattern: /^\/api\/spotify\/categories\/([^/]+)$/u },
    { key: 'artist', pattern: /^\/api\/spotify\/artists\/([^/]+)$/u },
    { key: 'playlist', pattern: /^\/api\/spotify\/playlists\/([^/]+)$/u },
    { key: 'track', pattern: /^\/api\/spotify\/tracks\/([^/]+)$/u },
    { key: 'user', pattern: /^\/api\/spotify\/users\/([^/]+)$/u },
  ];

  for (const endpoint of dynamicEndpoints) {
    const match = endpoint.pattern.exec(pathname);
    if (match?.[1]) {
      return {
        key: endpoint.key,
        method: 'GET',
        parameter: decodeURIComponent(match[1]),
      };
    }
  }

  return null;
}

async function fulfillApiEndpoint(
  route: Route,
  key: ApiControlKey,
  parameter?: string,
) {
  switch (key) {
    case 'categories':
      await fulfillJson(route, createCategories());
      return;
    case 'category':
      await fulfillJson(route, createCategoryDetails(parameter ?? spotifyFixtureIds.category));
      return;
    case 'genres':
    case 'seedGenres':
      await fulfillJson(route, createGenres());
      return;
    case 'artist':
      await fulfillJson(route, createArtistDetails(parameter ?? spotifyFixtureIds.artist));
      return;
    case 'track':
      await fulfillJson(route, createTrackDetails(parameter ?? spotifyFixtureIds.track));
      return;
    case 'playlist':
      await fulfillJson(route, createPlaylistDetails(parameter ?? spotifyFixtureIds.playlist));
      return;
    case 'user':
      await fulfillJson(route, createUserDetails(parameter ?? spotifyFixtureIds.user));
      return;
    case 'playlistTracks': {
      const requestPage = readAppPageRequest(route.request());
      const playlistTracks = createTrackCards(25).map(track => ({
        added_at: '2026-08-15T12:00:00Z',
        track,
      }));
      await fulfillJson(route, createAppPage(playlistTracks, requestPage));
      return;
    }
    case 'userPlaylists': {
      const requestPage = readAppPageRequest(route.request());
      await fulfillJson(route, createAppPage(createPlaylistCards(25), requestPage));
      return;
    }
    case 'searchArtists':
      await fulfillJson(route, {
        items: createAutocompleteArtists(),
      } satisfies SpotifySearchPage<SpotifyAutocompleteArtist>);
      return;
    case 'searchTracks':
      await fulfillJson(route, {
        items: createAutocompleteTracks(),
      } satisfies SpotifySearchPage<SpotifyAutocompleteTrack>);
      return;
    case 'recommendations':
      await fulfillJson(route, {
        seeds: [{ id: 'fixtureseed01', type: 'TRACK' }],
        tracks: createRecommendationTracks(15),
      } satisfies SpotifyRecommendationsResponse);
  }
}

function resolveSpotifyEndpoint(request: Request): {
  key: SpotifyControlKey;
  parameter?: string;
} | null {
  const url = new URL(request.url());
  const method = request.method();
  const pathname = url.pathname.replace(/\/+$/u, '') || '/';
  if ((method === 'GET' || method === 'HEAD') && pathname === '/v1/me') {
    return { key: 'me' };
  }
  if ((method === 'GET' || method === 'HEAD') && pathname === '/v1/tracks') {
    return { key: 'tracks' };
  }
  if (
    (method === 'GET' || method === 'HEAD')
    && pathname === '/v1/me/top/tracks'
  ) {
    return { key: 'topTracks' };
  }
  if (
    (method === 'GET' || method === 'HEAD')
    && pathname === '/v1/me/top/artists'
  ) {
    return { key: 'topArtists' };
  }

  const createMatch = /^\/v1\/users\/([^/]+)\/playlists$/u.exec(pathname);
  if ((method === 'POST' || method === 'HEAD') && createMatch?.[1]) {
    return {
      key: 'createPlaylist',
      parameter: decodeURIComponent(createMatch[1]),
    };
  }

  const replaceMatch = /^\/v1\/playlists\/([^/]+)\/tracks$/u.exec(pathname);
  if ((method === 'PUT' || method === 'HEAD') && replaceMatch?.[1]) {
    return {
      key: 'replaceTracks',
      parameter: decodeURIComponent(replaceMatch[1]),
    };
  }

  return null;
}

async function fulfillSpotifyEndpoint(
  route: Route,
  key: SpotifyControlKey,
  parameter?: string,
) {
  const url = new URL(route.request().url());
  switch (key) {
    case 'me':
      await fulfillJson(route, {
        display_name: 'Fixture User',
        external_urls: {
          spotify: `https://open.spotify.com/user/${spotifyFixtureIds.user}`,
        },
        followers: { total: 42 },
        id: spotifyFixtureIds.user,
        images: [createImage('user-profile')],
        type: 'user',
        uri: `spotify:user:${spotifyFixtureIds.user}`,
      });
      return;
    case 'tracks': {
      const ids = (url.searchParams.get('ids') ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      await fulfillJson(route, {
        tracks: ids.map((id, index) => createFullTrack(id, index + 1)),
      });
      return;
    }
    case 'topTracks':
      await fulfillJson(
        route,
        createSpotifyPage(createFullTracks(25), url),
      );
      return;
    case 'topArtists':
      await fulfillJson(
        route,
        createSpotifyPage(createFullArtists(25), url),
      );
      return;
    case 'createPlaylist':
      await fulfillJson(route, {
        collaborative: false,
        description: 'Created by the accessibility fixture',
        external_urls: {},
        id: spotifyFixtureIds.createdPlaylist,
        name: 'Accessibility fixture playlist',
        owner: {
          id: parameter ?? spotifyFixtureIds.user,
        },
        public: false,
        tracks: { total: 0 },
        type: 'playlist',
        uri: `spotify:playlist:${spotifyFixtureIds.createdPlaylist}`,
      }, 201);
      return;
    case 'replaceTracks':
      await fulfillJson(route, {
        snapshot_id: `fixture-snapshot-${parameter ?? spotifyFixtureIds.createdPlaylist}`,
      });
  }
}

function createCategories(): SpotifyCategoryListItem[] {
  return Array.from({ length: 12 }, (_, index) => ({
    icons: [createImage(`category-${index + 1}`)],
    id: index === 0 ? spotifyFixtureIds.category : `category${index + 1}`,
    name: index === 0 ? 'Indie' : `Category ${index + 1}`,
  }));
}

function createCategoryDetails(categoryId: string): SpotifyCategoryDetailsData {
  return {
    category: {
      icons: [createImage(`category-${categoryId}`)],
      name: categoryId === spotifyFixtureIds.category ? 'Indie' : `Category ${categoryId}`,
    },
    categoryPlaylists: {
      items: createPlaylistCards(12),
    },
  };
}

function createGenres() {
  return [
    'alternative',
    'ambient',
    'classical',
    'country',
    'electronic',
    'folk',
    'hip-hop',
    'indie',
    'jazz',
    'metal',
    'pop',
    'punk',
    'rock',
    'soul',
    'world',
  ];
}

function createArtistDetails(artistId: string): SpotifyArtistDetailsData {
  return {
    artist: {
      external_urls: {
        spotify: `https://open.spotify.com/artist/${artistId}`,
      },
      followers: { total: 12_345 },
      genres: ['indie', 'alternative'],
      id: artistId,
      images: [createImage(`artist-${artistId}`)],
      name: 'Fixture Artist',
      popularity: 78,
    },
    artistAlbums: { total: 6 },
    artistTopTracks: {
      tracks: createTrackCards(5),
    },
    relatedArtists: [
      { id: 'relatedartist01', name: 'Related Artist One' },
      { id: 'relatedartist02', name: 'Related Artist Two' },
    ],
  };
}

function createTrackDetails(trackId: string): SpotifyTrackDetails {
  return {
    album: {
      images: [createImage(`track-${trackId}`)],
    },
    artists: [
      { id: spotifyFixtureIds.artist, name: 'Fixture Artist' },
    ],
    external_urls: {
      spotify: `https://open.spotify.com/track/${trackId}`,
    },
    id: trackId,
    name: 'Fixture Track',
  };
}

function createPlaylistDetails(playlistId: string): SpotifyPlaylistDetails {
  return {
    collaborative: false,
    description: 'A deterministic playlist used by the accessibility suite.',
    external_urls: {
      spotify: `https://open.spotify.com/playlist/${playlistId}`,
    },
    followers: { total: 2_048 },
    id: playlistId,
    images: [createImage(`playlist-${playlistId}`)],
    name: 'Fixture Playlist',
    owner: {
      display_name: 'Fixture User',
      followers: { total: 42 },
      id: spotifyFixtureIds.user,
    },
    public: true,
    tracks: { total: 25 },
  };
}

function createUserDetails(userId: string): SpotifyUserDetailsData {
  return {
    totalPlaylists: 25,
    user: {
      display_name: 'Fixture User',
      external_urls: {
        spotify: `https://open.spotify.com/user/${userId}`,
      },
      followers: { total: 42 },
      id: userId,
      images: [createImage(`user-${userId}`)],
    },
  };
}

function createPlaylistCards(count: number): SpotifyPlaylistCard[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index === 0
      ? spotifyFixtureIds.playlist
      : `fixtureplaylist${String(index + 1).padStart(2, '0')}`;
    return {
      description: `Fixture playlist ${index + 1} description`,
      id,
      images: [createImage(`playlist-${index + 1}`)],
      name: `Fixture Playlist ${index + 1}`,
      owner: {
        display_name: 'Fixture User',
        id: spotifyFixtureIds.user,
      },
      tracks: { total: 25 + index },
    };
  });
}

function createTrackCards(count: number): SpotifyTrackCard[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index === 0
      ? spotifyFixtureIds.track
      : `fixturetrack${String(index + 1).padStart(2, '0')}`;
    return {
      album: {
        images: [createImage(`track-${index + 1}`)],
      },
      artists: [
        { id: spotifyFixtureIds.artist, name: 'Fixture Artist' },
      ],
      duration_ms: 180_000 + index * 1_000,
      id,
      name: `Fixture Track ${index + 1}`,
      popularity: 70 + (index % 20),
      preview_url: null,
    };
  });
}

function createRecommendationTracks(count: number): SpotifyRecommendationTrack[] {
  return createTrackCards(count).map(track => ({
    ...track,
    uri: `spotify:track:${track.id}`,
  }));
}

function createAutocompleteArtists(): SpotifyAutocompleteArtist[] {
  return [
    {
      name: 'Indie Artist',
      uri: 'spotify:artist:indieartist01',
    },
    {
      name: 'Fixture Artist',
      uri: `spotify:artist:${spotifyFixtureIds.artist}`,
    },
  ];
}

function createAutocompleteTracks(): SpotifyAutocompleteTrack[] {
  return [
    {
      artists: [{ name: 'Fixture Artist' }],
      name: 'Indie Track',
      uri: 'spotify:track:indietrack01',
    },
    {
      artists: [{ name: 'Fixture Artist' }],
      name: 'Fixture Track',
      uri: `spotify:track:${spotifyFixtureIds.track}`,
    },
  ];
}

function createFullTracks(count: number) {
  return Array.from({ length: count }, (_, index) => (
    createFullTrack(`toptrack${String(index + 1).padStart(2, '0')}`, index + 1)
  ));
}

function createFullTrack(id: string, number: number) {
  return {
    album: {
      album_type: 'album',
      artists: [
        {
          external_urls: {
            spotify: `https://open.spotify.com/artist/${spotifyFixtureIds.artist}`,
          },
          href: `https://api.spotify.com/v1/artists/${spotifyFixtureIds.artist}`,
          id: spotifyFixtureIds.artist,
          name: 'Fixture Artist',
          type: 'artist',
          uri: `spotify:artist:${spotifyFixtureIds.artist}`,
        },
      ],
      external_urls: {
        spotify: `https://open.spotify.com/album/fixturealbum${number}`,
      },
      href: `https://api.spotify.com/v1/albums/fixturealbum${number}`,
      id: `fixturealbum${number}`,
      images: [createImage(`full-track-${number}`)],
      name: `Fixture Album ${number}`,
      release_date: '2026-01-01',
      release_date_precision: 'day',
      total_tracks: 12,
      type: 'album',
      uri: `spotify:album:fixturealbum${number}`,
    },
    artists: [
      {
        external_urls: {
          spotify: `https://open.spotify.com/artist/${spotifyFixtureIds.artist}`,
        },
        href: `https://api.spotify.com/v1/artists/${spotifyFixtureIds.artist}`,
        id: spotifyFixtureIds.artist,
        name: 'Fixture Artist',
        type: 'artist',
        uri: `spotify:artist:${spotifyFixtureIds.artist}`,
      },
    ],
    disc_number: 1,
    duration_ms: 180_000 + number * 1_000,
    explicit: false,
    external_ids: { isrc: `FIXTURE${String(number).padStart(5, '0')}` },
    external_urls: {
      spotify: `https://open.spotify.com/track/${id}`,
    },
    href: `https://api.spotify.com/v1/tracks/${id}`,
    id,
    is_local: false,
    name: `Fixture Track ${number}`,
    popularity: 70 + (number % 20),
    preview_url: null,
    track_number: number,
    type: 'track',
    uri: `spotify:track:${id}`,
  };
}

function createFullArtists(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const id = `topartist${String(number).padStart(2, '0')}`;
    return {
      external_urls: {
        spotify: `https://open.spotify.com/artist/${id}`,
      },
      followers: { href: null, total: 1_000 + number },
      genres: ['indie', 'alternative'],
      href: `https://api.spotify.com/v1/artists/${id}`,
      id,
      images: [createImage(`top-artist-${number}`)],
      name: `Fixture Artist ${number}`,
      popularity: 60 + (number % 30),
      type: 'artist',
      uri: `spotify:artist:${id}`,
    };
  });
}

function createImage(name: string) {
  return {
    height: 96,
    url: `${imageOrigin}/${encodeURIComponent(name)}.svg`,
    width: 96,
  };
}

function readAppPageRequest(request: Request) {
  const body = readJsonBody(request);
  return {
    limit: readNonnegativeInteger(body['limit'], 10, 1),
    pageOffset: readNonnegativeInteger(body['offset'], 0),
  };
}

function createAppPage<T>(
  items: T[],
  {
    limit,
    pageOffset,
  }: {
    limit: number;
    pageOffset: number;
  },
) {
  const start = pageOffset * limit;
  const pageItems = items.slice(start, start + limit);
  const nextOffset = start + limit;
  return {
    href: 'https://api.spotify.com/v1/fixture-page',
    items: pageItems,
    limit,
    next: nextOffset < items.length
      ? `https://api.spotify.com/v1/fixture-page?offset=${nextOffset}&limit=${limit}`
      : null,
    offset: start,
    previous: start > 0
      ? `https://api.spotify.com/v1/fixture-page?offset=${Math.max(0, start - limit)}&limit=${limit}`
      : null,
    total: items.length,
  };
}

function createSpotifyPage<T>(items: T[], url: URL) {
  const limit = readNonnegativeInteger(url.searchParams.get('limit'), 10, 1);
  const offset = readNonnegativeInteger(url.searchParams.get('offset'), 0);
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  return {
    href: url.toString(),
    items: pageItems,
    limit,
    next: nextOffset < items.length
      ? `${url.origin}${url.pathname}?offset=${nextOffset}&limit=${limit}`
      : null,
    offset,
    previous: offset > 0
      ? `${url.origin}${url.pathname}?offset=${Math.max(0, offset - limit)}&limit=${limit}`
      : null,
    total: items.length,
  };
}

function readJsonBody(request: Request): Record<string, unknown> {
  try {
    const body: unknown = request.postDataJSON();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function readNonnegativeInteger(
  value: unknown,
  fallback: number,
  minimum = 0,
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum
    ? parsed
    : fallback;
}

async function fulfillJson(route: Route, value: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(value),
    contentType: 'application/json',
    status,
  });
}

async function failUnexpectedRequest(
  route: Route,
  state: SpotifyFixtureState,
  reason: string,
) {
  const request = route.request();
  state.unexpectedRequests.push(
    `${request.method()} ${request.url()} (${reason})`,
  );
  await fulfillJson(route, {
    error: {
      code: 'unexpected_fixture_request',
      message: reason,
    },
  }, 501);
}
