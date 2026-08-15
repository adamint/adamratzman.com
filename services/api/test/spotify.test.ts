import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InjectOptions } from 'light-my-request';
import { buildApp } from '../src/app.js';
import { ApiError } from '../src/errors.js';
import { SpotifyConfigurationError, type SpotifyClient } from '../src/spotify/client.js';
import { createFakeSpotifyClient, type FakeSpotifyClient } from './helpers.js';

async function loadPaginationModule() {
  return import('../src/spotify/pagination.js');
}

async function loadSerializationModule() {
  return import('../src/spotify/serialization.js');
}

describe('spotify routes', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];
  type SpotifyValidationCase = {
    label: string;
    request: InjectOptions;
    arrange: (spotify: FakeSpotifyClient) => void;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  function createSpotifyApp() {
    const spotify = createFakeSpotifyClient();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      return spotify;
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);
    return { app, spotify, spotifyFactory };
  }

  function spotifyResponse<Method extends keyof SpotifyClient>(
    body: unknown,
  ): Awaited<ReturnType<SpotifyClient[Method]>> {
    return { body } as Awaited<ReturnType<SpotifyClient[Method]>>;
  }

  function createImage(url = 'https://images.example/image.png') {
    return { url };
  }

  function createArtistSummary(overrides: Record<string, unknown> = {}) {
    return {
      id: 'artist-1',
      name: 'Phoebe Bridgers',
      uri: 'spotify:artist:artist-1',
      ...overrides,
    };
  }

  function createTrackSummary(overrides: Record<string, unknown> = {}) {
    return {
      id: 'track-1',
      uri: 'spotify:track:track-1',
      name: 'Garden Song',
      artists: [createArtistSummary()],
      album: { images: [createImage('https://images.example/track.png')] },
      popularity: 84,
      duration_ms: 207000,
      preview_url: null,
      ...overrides,
    };
  }

  function createTrackDetail(overrides: Record<string, unknown> = {}) {
    return {
      ...createTrackSummary(),
      external_urls: { spotify: 'https://open.spotify.com/track/track-1' },
      ...overrides,
    };
  }

  function createUserReference(overrides: Record<string, unknown> = {}) {
    return {
      id: 'user-1',
      display_name: 'Adam',
      ...overrides,
    };
  }

  function createPlaylistSummary(overrides: Record<string, unknown> = {}) {
    return {
      id: 'playlist-1',
      name: 'Favorites',
      images: [createImage('https://images.example/playlist.png')],
      owner: createUserReference(),
      tracks: { total: 12 },
      description: 'Favorite songs',
      ...overrides,
    };
  }

  function createPlaylistDetail(overrides: Record<string, unknown> = {}) {
    return {
      ...createPlaylistSummary(),
      external_urls: { spotify: 'https://open.spotify.com/playlist/playlist-1' },
      followers: { total: 128 },
      public: true,
      collaborative: false,
      ...overrides,
    };
  }

  function createEpisodeSummary(overrides: Record<string, unknown> = {}) {
    return {
      id: 'episode-1',
      external_urls: { spotify: 'https://open.spotify.com/episode/episode-1' },
      images: [createImage('https://images.example/episode.png')],
      name: 'Episode 1',
      duration_ms: 180000,
      show: {
        external_urls: { spotify: 'https://open.spotify.com/show/show-1' },
        name: 'Show 1',
      },
      release_date: '2024-01-01',
      description: 'Episode description',
      ...overrides,
    };
  }

  function createCategory(overrides: Record<string, unknown> = {}) {
    return {
      id: 'party',
      name: 'Party',
      icons: [createImage('https://images.example/category.png')],
      ...overrides,
    };
  }

  function createArtistDetail(overrides: Record<string, unknown> = {}) {
    return {
      id: 'artist-1',
      name: 'boygenius',
      external_urls: { spotify: 'https://open.spotify.com/artist/artist-1' },
      images: [createImage('https://images.example/artist.png')],
      popularity: 97,
      followers: { total: 1000000 },
      genres: ['indie'],
      ...overrides,
    };
  }

  function createUserDetail(overrides: Record<string, unknown> = {}) {
    return {
      id: 'user-1',
      display_name: 'Adam',
      external_urls: { spotify: 'https://open.spotify.com/user/user-1' },
      images: [createImage('https://images.example/user.png')],
      followers: { total: 42 },
      ...overrides,
    };
  }

  function arrangeSpotifyCase(testCase: SpotifyValidationCase, spotify: FakeSpotifyClient) {
    testCase.arrange(spotify);
  }

  const directValidationCases: SpotifyValidationCase[] = [
    {
      label: 'genre arrays',
      request: { method: 'GET', url: '/api/spotify/getAvailableGenreSeeds' },
      arrange: (spotify) => {
        spotify.getAvailableGenreSeeds.mockResolvedValue(
          spotifyResponse<'getAvailableGenreSeeds'>({}),
        );
      },
    },
    {
      label: 'track search payloads',
      request: {
        method: 'POST',
        url: '/api/spotify/searchTracks',
        payload: { query: 'garden' },
      },
      arrange: (spotify) => {
        spotify.searchTracks.mockResolvedValue(spotifyResponse<'searchTracks'>({}));
      },
    },
    {
      label: 'track search pages',
      request: {
        method: 'POST',
        url: '/api/spotify/searchTracks',
        payload: { query: 'garden' },
      },
      arrange: (spotify) => {
        spotify.searchTracks.mockResolvedValue(
          spotifyResponse<'searchTracks'>({ tracks: {} }),
        );
      },
    },
    {
      label: 'track search item fields',
      request: {
        method: 'POST',
        url: '/api/spotify/searchTracks',
        payload: { query: 'garden' },
      },
      arrange: (spotify) => {
        spotify.searchTracks.mockResolvedValue(
          spotifyResponse<'searchTracks'>({
            tracks: { items: [{ name: 'Garden Song', artists: [{}] }] },
          }),
        );
      },
    },
    {
      label: 'artist search payloads',
      request: {
        method: 'POST',
        url: '/api/spotify/searchArtists',
        payload: { query: 'phoebe bridgers' },
      },
      arrange: (spotify) => {
        spotify.searchArtists.mockResolvedValue(spotifyResponse<'searchArtists'>({}));
      },
    },
    {
      label: 'artist search pages',
      request: {
        method: 'POST',
        url: '/api/spotify/searchArtists',
        payload: { query: 'phoebe bridgers' },
      },
      arrange: (spotify) => {
        spotify.searchArtists.mockResolvedValue(
          spotifyResponse<'searchArtists'>({ artists: {} }),
        );
      },
    },
    {
      label: 'artist search item fields',
      request: {
        method: 'POST',
        url: '/api/spotify/searchArtists',
        payload: { query: 'phoebe bridgers' },
      },
      arrange: (spotify) => {
        spotify.searchArtists.mockResolvedValue(
          spotifyResponse<'searchArtists'>({ artists: { items: [{ name: 'Phoebe Bridgers' }] } }),
        );
      },
    },
    {
      label: 'recommendation payloads',
      request: {
        method: 'POST',
        url: '/api/spotify/getRecommendations',
        payload: { options: { seed_tracks: ['track-1'] } },
      },
      arrange: (spotify) => {
        spotify.getRecommendations.mockResolvedValue(
          spotifyResponse<'getRecommendations'>({ seeds: [] }),
        );
      },
    },
    {
      label: 'recommendation track fields',
      request: {
        method: 'POST',
        url: '/api/spotify/getRecommendations',
        payload: { options: { seed_tracks: ['track-1'] } },
      },
      arrange: (spotify) => {
        spotify.getRecommendations.mockResolvedValue(
          spotifyResponse<'getRecommendations'>({
            tracks: [createTrackSummary({ album: { images: [] } })],
            seeds: [],
          }),
        );
      },
    },
    {
      label: 'recommendation preview urls',
      request: {
        method: 'POST',
        url: '/api/spotify/getRecommendations',
        payload: { options: { seed_tracks: ['track-1'] } },
      },
      arrange: (spotify) => {
        spotify.getRecommendations.mockResolvedValue(
          spotifyResponse<'getRecommendations'>({
            tracks: [createTrackSummary({ preview_url: { bad: true } })],
            seeds: [{ id: 'seed-1' }],
          }),
        );
      },
    },
    {
      label: 'recommendation seed items',
      request: {
        method: 'POST',
        url: '/api/spotify/getRecommendations',
        payload: { options: { seed_tracks: ['track-1'] } },
      },
      arrange: (spotify) => {
        spotify.getRecommendations.mockResolvedValue(
          spotifyResponse<'getRecommendations'>({
            tracks: [createTrackSummary()],
            seeds: [null],
          }),
        );
      },
    },
    {
      label: 'playlist track pages',
      request: {
        method: 'POST',
        url: '/api/spotify/getPlaylistTracks',
        payload: { playlistId: 'playlist-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getPlaylistTracks.mockResolvedValue(
          spotifyResponse<'getPlaylistTracks'>({ total: 1, next: null }),
        );
      },
    },
    {
      label: 'playlist track totals',
      request: {
        method: 'POST',
        url: '/api/spotify/getPlaylistTracks',
        payload: { playlistId: 'playlist-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getPlaylistTracks.mockResolvedValue(
          spotifyResponse<'getPlaylistTracks'>({
            items: [{ track: createTrackSummary() }],
            next: null,
          }),
        );
      },
    },
    {
      label: 'playlist track item fields',
      request: {
        method: 'POST',
        url: '/api/spotify/getPlaylistTracks',
        payload: { playlistId: 'playlist-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getPlaylistTracks.mockResolvedValue(
          spotifyResponse<'getPlaylistTracks'>({
            items: [{ track: createTrackSummary({ album: { images: [] } }) }],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'playlist episode item fields',
      request: {
        method: 'POST',
        url: '/api/spotify/getPlaylistTracks',
        payload: { playlistId: 'playlist-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getPlaylistTracks.mockResolvedValue(
          spotifyResponse<'getPlaylistTracks'>({
            items: [
              {
                track: createEpisodeSummary({
                  show: { name: 'Show 1' },
                }),
              },
            ],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'playlist episode descriptions',
      request: {
        method: 'POST',
        url: '/api/spotify/getPlaylistTracks',
        payload: { playlistId: 'playlist-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getPlaylistTracks.mockResolvedValue(
          spotifyResponse<'getPlaylistTracks'>({
            items: [
              {
                track: createEpisodeSummary({
                  description: { bad: true },
                }),
              },
            ],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'user playlist pages',
      request: {
        method: 'POST',
        url: '/api/spotify/getUserPlaylists',
        payload: { userId: 'user-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({ total: 1, next: null }),
        );
      },
    },
    {
      label: 'user playlist totals',
      request: {
        method: 'POST',
        url: '/api/spotify/getUserPlaylists',
        payload: { userId: 'user-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({
            items: [createPlaylistSummary()],
            next: null,
          }),
        );
      },
    },
    {
      label: 'user playlist item fields',
      request: {
        method: 'POST',
        url: '/api/spotify/getUserPlaylists',
        payload: { userId: 'user-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({
            items: [createPlaylistSummary({ owner: {} })],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'user playlist owner display names',
      request: {
        method: 'POST',
        url: '/api/spotify/getUserPlaylists',
        payload: { userId: 'user-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({
            items: [createPlaylistSummary({ owner: { id: 'user-1', display_name: { bad: true } } })],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'user playlist null owner display names',
      request: {
        method: 'POST',
        url: '/api/spotify/getUserPlaylists',
        payload: { userId: 'user-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({
            items: [createPlaylistSummary({ owner: { id: 'user-1', display_name: null } })],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'user playlist descriptions',
      request: {
        method: 'POST',
        url: '/api/spotify/getUserPlaylists',
        payload: { userId: 'user-1', limit: 20, offset: 0 },
      },
      arrange: (spotify) => {
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({
            items: [createPlaylistSummary({ description: { bad: true } })],
            total: 1,
            next: null,
          }),
        );
      },
    },
    {
      label: 'track detail bodies',
      request: { method: 'GET', url: '/api/spotify/tracks/track-1' },
      arrange: (spotify) => {
        spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>(undefined));
      },
    },
    {
      label: 'track detail fields',
      request: { method: 'GET', url: '/api/spotify/tracks/track-1' },
      arrange: (spotify) => {
        spotify.getTrack.mockResolvedValue(
          spotifyResponse<'getTrack'>(createTrackDetail({ external_urls: {} })),
        );
      },
    },
    {
      label: 'playlist detail bodies',
      request: { method: 'GET', url: '/api/spotify/playlists/playlist-1' },
      arrange: (spotify) => {
        spotify.getPlaylist.mockResolvedValue(spotifyResponse<'getPlaylist'>(undefined));
      },
    },
    {
      label: 'playlist detail fields',
      request: { method: 'GET', url: '/api/spotify/playlists/playlist-1' },
      arrange: (spotify) => {
        spotify.getPlaylist.mockResolvedValue(
          spotifyResponse<'getPlaylist'>(createPlaylistDetail({ followers: {} })),
        );
      },
    },
    {
      label: 'playlist detail owner display names',
      request: { method: 'GET', url: '/api/spotify/playlists/playlist-1' },
      arrange: (spotify) => {
        spotify.getPlaylist.mockResolvedValue(
          spotifyResponse<'getPlaylist'>(
            createPlaylistDetail({ owner: { id: 'user-1', display_name: { bad: true } } }),
          ),
        );
      },
    },
    {
      label: 'playlist detail image urls',
      request: { method: 'GET', url: '/api/spotify/playlists/playlist-1' },
      arrange: (spotify) => {
        spotify.getPlaylist.mockResolvedValue(
          spotifyResponse<'getPlaylist'>(createPlaylistDetail({ images: [{ url: { bad: true } }] })),
        );
      },
    },
    {
      label: 'playlist detail owner follower totals',
      request: { method: 'GET', url: '/api/spotify/playlists/playlist-1' },
      arrange: (spotify) => {
        spotify.getPlaylist.mockResolvedValue(
          spotifyResponse<'getPlaylist'>(
            createPlaylistDetail({
              owner: {
                id: 'user-1',
                display_name: 'Adam',
                followers: { total: 'bad' },
              },
            }),
          ),
        );
      },
    },
    {
      label: 'playlist detail descriptions',
      request: { method: 'GET', url: '/api/spotify/playlists/playlist-1' },
      arrange: (spotify) => {
        spotify.getPlaylist.mockResolvedValue(
          spotifyResponse<'getPlaylist'>(createPlaylistDetail({ description: { bad: true } })),
        );
      },
    },
  ];

  const aggregateValidationCases: SpotifyValidationCase[] = [
    {
      label: 'category pages without a categories object',
      request: { method: 'GET', url: '/api/spotify/categories' },
      arrange: (spotify) => {
        spotify.getCategories.mockResolvedValue(spotifyResponse<'getCategories'>({}));
      },
    },
    {
      label: 'category pages without items',
      request: { method: 'GET', url: '/api/spotify/categories' },
      arrange: (spotify) => {
        spotify.getCategories.mockResolvedValue(
          spotifyResponse<'getCategories'>({ categories: { total: 1, next: null } }),
        );
      },
    },
    {
      label: 'category pages without totals',
      request: { method: 'GET', url: '/api/spotify/categories' },
      arrange: (spotify) => {
        spotify.getCategories.mockResolvedValue(
          spotifyResponse<'getCategories'>({
            categories: {
              items: [createCategory()],
              next: null,
            },
          }),
        );
      },
    },
    {
      label: 'category item fields',
      request: { method: 'GET', url: '/api/spotify/categories' },
      arrange: (spotify) => {
        spotify.getCategories.mockResolvedValue(
          spotifyResponse<'getCategories'>({
            categories: { items: [createCategory({ icons: [] })], total: 1, next: null },
          }),
        );
      },
    },
    {
      label: 'category detail bodies',
      request: { method: 'GET', url: '/api/spotify/categories/party' },
      arrange: (spotify) => {
        spotify.getCategory.mockResolvedValue(spotifyResponse<'getCategory'>(undefined));
      },
    },
    {
      label: 'category detail fields',
      request: { method: 'GET', url: '/api/spotify/categories/party' },
      arrange: (spotify) => {
        spotify.getCategory.mockResolvedValue(
          spotifyResponse<'getCategory'>(createCategory({ icons: [] })),
        );
        spotify.getPlaylistsForCategory.mockResolvedValue(
          spotifyResponse<'getPlaylistsForCategory'>({
            playlists: { items: [createPlaylistSummary()], total: 1, next: null },
          }),
        );
      },
    },
    {
      label: 'category playlist pages',
      request: { method: 'GET', url: '/api/spotify/categories/party' },
      arrange: (spotify) => {
        spotify.getCategory.mockResolvedValue(spotifyResponse<'getCategory'>(createCategory()));
        spotify.getPlaylistsForCategory.mockResolvedValue(
          spotifyResponse<'getPlaylistsForCategory'>({
            playlists: { total: 1, next: null },
          }),
        );
      },
    },
    {
      label: 'category playlist item fields',
      request: { method: 'GET', url: '/api/spotify/categories/party' },
      arrange: (spotify) => {
        spotify.getCategory.mockResolvedValue(spotifyResponse<'getCategory'>(createCategory()));
        spotify.getPlaylistsForCategory.mockResolvedValue(
          spotifyResponse<'getPlaylistsForCategory'>({
            playlists: {
              items: [createPlaylistSummary({ tracks: {} })],
              total: 1,
              next: null,
            },
          }),
        );
      },
    },
    {
      label: 'category playlist null owner display names',
      request: { method: 'GET', url: '/api/spotify/categories/party' },
      arrange: (spotify) => {
        spotify.getCategory.mockResolvedValue(spotifyResponse<'getCategory'>(createCategory()));
        spotify.getPlaylistsForCategory.mockResolvedValue(
          spotifyResponse<'getPlaylistsForCategory'>({
            playlists: {
              items: [createPlaylistSummary({ owner: { id: 'user-1', display_name: null } })],
              total: 1,
              next: null,
            },
          }),
        );
      },
    },
    {
      label: 'artist detail bodies',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(undefined));
      },
    },
    {
      label: 'artist detail fields',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(
          spotifyResponse<'getArtist'>(createArtistDetail({ external_urls: {} })),
        );
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({ tracks: [createTrackSummary()] }),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({ items: [{ id: 'album-1' }], total: 1 }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({ artists: [createArtistSummary()] }),
        );
      },
    },
    {
      label: 'artist top track arrays',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(createArtistDetail()));
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({}),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({
            items: [{ id: 'album-1', name: 'the record' }],
            total: 1,
          }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({
            artists: [createArtistSummary({ id: 'artist-2', name: 'Lucy Dacus' })],
          }),
        );
      },
    },
    {
      label: 'artist top track fields',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(createArtistDetail()));
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({
            tracks: [createTrackSummary({ album: { images: [] } })],
          }),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({
            items: [{ id: 'album-1', name: 'the record' }],
            total: 1,
          }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({
            artists: [createArtistSummary({ id: 'artist-2', name: 'Lucy Dacus' })],
          }),
        );
      },
    },
    {
      label: 'artist album arrays',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(createArtistDetail()));
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({
            tracks: [createTrackSummary()],
          }),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({ total: 1 }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({
            artists: [createArtistSummary({ id: 'artist-2', name: 'Lucy Dacus' })],
          }),
        );
      },
    },
    {
      label: 'artist album totals',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(createArtistDetail()));
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({
            tracks: [createTrackSummary()],
          }),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({
            items: [{ id: 'album-1', name: 'the record' }],
          }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({
            artists: [createArtistSummary({ id: 'artist-2', name: 'Lucy Dacus' })],
          }),
        );
      },
    },
    {
      label: 'artist related arrays',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(createArtistDetail()));
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({
            tracks: [createTrackSummary()],
          }),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({
            items: [{ id: 'album-1', name: 'the record' }],
            total: 1,
          }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({}),
        );
      },
    },
    {
      label: 'artist related item fields',
      request: { method: 'GET', url: '/api/spotify/artists/artist-1' },
      arrange: (spotify) => {
        spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(createArtistDetail()));
        spotify.getArtistTopTracks.mockResolvedValue(
          spotifyResponse<'getArtistTopTracks'>({
            tracks: [createTrackSummary()],
          }),
        );
        spotify.getArtistAlbums.mockResolvedValue(
          spotifyResponse<'getArtistAlbums'>({
            items: [{ id: 'album-1', name: 'the record' }],
            total: 1,
          }),
        );
        spotify.getArtistRelatedArtists.mockResolvedValue(
          spotifyResponse<'getArtistRelatedArtists'>({ artists: [{ id: 'artist-2' }] }),
        );
      },
    },
    {
      label: 'user detail bodies',
      request: { method: 'GET', url: '/api/spotify/users/user-1' },
      arrange: (spotify) => {
        spotify.getUser.mockResolvedValue(spotifyResponse<'getUser'>(undefined));
      },
    },
    {
      label: 'user detail fields',
      request: { method: 'GET', url: '/api/spotify/users/user-1' },
      arrange: (spotify) => {
        spotify.getUser.mockResolvedValue(
          spotifyResponse<'getUser'>(createUserDetail({ external_urls: {} })),
        );
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({ items: [createPlaylistSummary()], total: 1 }),
        );
      },
    },
    {
      label: 'user detail display names',
      request: { method: 'GET', url: '/api/spotify/users/user-1' },
      arrange: (spotify) => {
        spotify.getUser.mockResolvedValue(
          spotifyResponse<'getUser'>(createUserDetail({ display_name: { bad: true } })),
        );
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({ items: [createPlaylistSummary()], total: 1 }),
        );
      },
    },
    {
      label: 'user detail image urls',
      request: { method: 'GET', url: '/api/spotify/users/user-1' },
      arrange: (spotify) => {
        spotify.getUser.mockResolvedValue(
          spotifyResponse<'getUser'>(createUserDetail({ images: [{ url: { bad: true } }] })),
        );
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({ items: [createPlaylistSummary()], total: 1 }),
        );
      },
    },
    {
      label: 'user playlist totals',
      request: { method: 'GET', url: '/api/spotify/users/user-1' },
      arrange: (spotify) => {
        spotify.getUser.mockResolvedValue(spotifyResponse<'getUser'>(createUserDetail()));
        spotify.getUserPlaylists.mockResolvedValue(
          spotifyResponse<'getUserPlaylists'>({ items: [] }),
        );
      },
    },
  ];

  it('returns a JSON validation error for an empty track search', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchTracks',
      payload: { query: '   ' },
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns invalid_request for malformed JSON on Spotify POST routes', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchTracks',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns invalid_request for an empty JSON body on Spotify POST routes', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchTracks',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns track search results from Spotify', async () => {
    const { app, spotify } = createSpotifyApp();
    const tracks = { items: [createTrackSummary()], total: 1, next: null };
    spotify.searchTracks.mockResolvedValue(spotifyResponse<'searchTracks'>({ tracks }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchTracks',
      payload: { query: 'garden', options: { limit: 10 } },
    });

    expect(spotify.searchTracks).toHaveBeenCalledWith('garden', { limit: 10 });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(tracks);
  });

  it('rejects unknown search options before creating a Spotify client', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchTracks',
      payload: { query: 'garden', options: { offset: 10 } },
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns a JSON validation error for an empty artist search', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchArtists',
      payload: { query: '   ' },
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns artist search results from Spotify', async () => {
    const { app, spotify } = createSpotifyApp();
    const artists = {
      items: [createArtistSummary()],
      total: 1,
      next: null,
    };
    spotify.searchArtists.mockResolvedValue(spotifyResponse<'searchArtists'>({ artists }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchArtists',
      payload: { query: 'phoebe bridgers', options: { limit: 5 } },
    });

    expect(spotify.searchArtists).toHaveBeenCalledWith('phoebe bridgers', { limit: 5 });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(artists);
  });

  it.each([
    ['blank playlist id', { playlistId: '   ', limit: 20, offset: 0 }],
    ['limit below range', { playlistId: 'playlist-1', limit: 0, offset: 0 }],
    ['limit above range', { playlistId: 'playlist-1', limit: 51, offset: 0 }],
    ['negative offset', { playlistId: 'playlist-1', limit: 20, offset: -1 }],
  ])('rejects invalid playlist-track requests for %s', async (_label, payload) => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getPlaylistTracks',
      payload,
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('translates page offsets before requesting playlist tracks', async () => {
    const { app, spotify } = createSpotifyApp();
    const playlistTracks = {
      items: [{ track: createTrackSummary({ id: 'track-2', name: 'Motion Sickness' }) }],
      total: 1,
      next: null,
    };
    spotify.getPlaylistTracks.mockResolvedValue(spotifyResponse<'getPlaylistTracks'>(playlistTracks));

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getPlaylistTracks',
      payload: { playlistId: 'playlist-1', limit: 20, offset: 2 },
    });

    expect(spotify.getPlaylistTracks).toHaveBeenCalledWith('playlist-1', {
      limit: 20,
      offset: 40,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(playlistTracks);
  });

  it.each([
    ['blank user id', { userId: '   ', limit: 20, offset: 0 }],
    ['limit below range', { userId: 'user-1', limit: 0, offset: 0 }],
    ['limit above range', { userId: 'user-1', limit: 51, offset: 0 }],
    ['negative offset', { userId: 'user-1', limit: 20, offset: -1 }],
  ])('rejects invalid user-playlist requests for %s', async (_label, payload) => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getUserPlaylists',
      payload,
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('translates page offsets before requesting user playlists', async () => {
    const { app, spotify } = createSpotifyApp();
    const playlists = { items: [createPlaylistSummary()], total: 1, next: null };
    spotify.getUserPlaylists.mockResolvedValue(spotifyResponse<'getUserPlaylists'>(playlists));

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getUserPlaylists',
      payload: { userId: 'user-1', limit: 10, offset: 3 },
    });

    expect(spotify.getUserPlaylists).toHaveBeenCalledWith('user-1', {
      limit: 10,
      offset: 30,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(playlists);
  });

  it('rejects invalid recommendation options', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getRecommendations',
      payload: { options: ['not-an-object'] },
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it.each([
    ['unknown options', { seed_tracks: ['track-1'], market: 'US' }],
    ['zero seeds', { limit: 10 }],
    [
      'six total seeds',
      {
        seed_artists: ['artist-1', 'artist-2'],
        seed_genres: ['rock', 'indie'],
        seed_tracks: ['track-1', 'track-2'],
      },
    ],
  ])('rejects recommendation requests with %s before creating a Spotify client', async (
    _label,
    options,
  ) => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getRecommendations',
      payload: { options },
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns Spotify recommendations', async () => {
    const { app, spotify } = createSpotifyApp();
    const recommendations = {
      tracks: [createTrackSummary({ id: 'track-3', name: 'Kyoto' })],
      seeds: [],
    };
    const options = {
      seed_artists: ['artist-1'],
      seed_genres: ['indie'],
      seed_tracks: ['track-1'],
      limit: 5,
      min_popularity: 20,
      target_energy: 0.7,
    };
    spotify.getRecommendations.mockResolvedValue(spotifyResponse<'getRecommendations'>(recommendations));

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getRecommendations',
      payload: { options },
    });

    expect(spotify.getRecommendations).toHaveBeenCalledWith(options);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(recommendations);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])('returns a safe 502 when a recommendation track has a %s URI', async (
    _label,
    uri,
  ) => {
    const { app, spotify } = createSpotifyApp();
    spotify.getRecommendations.mockResolvedValue(
      spotifyResponse<'getRecommendations'>({
        tracks: [createTrackSummary({ uri })],
        seeds: [],
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getRecommendations',
      payload: { options: { seed_tracks: ['track-1'] } },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
  });

  it('returns available genre seeds', async () => {
    const { app, spotify } = createSpotifyApp();
    spotify.getAvailableGenreSeeds.mockResolvedValue(spotifyResponse<'getAvailableGenreSeeds'>({
      genres: ['rock', 'jazz'],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/getAvailableGenreSeeds',
    });

    expect(spotify.getAvailableGenreSeeds).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(['rock', 'jazz']);
  });

  it('does not expose implicit HEAD handlers for Spotify GET routes', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'HEAD',
      url: '/api/spotify/getAvailableGenreSeeds',
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).not.toBe(200);
  });

  it('returns the loader genres data from the same Spotify endpoint', async () => {
    const { app, spotify } = createSpotifyApp();
    spotify.getAvailableGenreSeeds.mockResolvedValue(spotifyResponse<'getAvailableGenreSeeds'>({
      genres: ['ambient', 'folk'],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotify.getAvailableGenreSeeds).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(['ambient', 'folk']);
  });

  for (const testCase of directValidationCases) {
    it(`returns a safe 502 when Spotify omits required direct ${testCase.label}`, async () => {
      const { app, spotify } = createSpotifyApp();
      arrangeSpotifyCase(testCase, spotify);

      const response = await app.inject(testCase.request);

      expect(response.statusCode).toBe(502);
      expect(JSON.parse(response.body)).toEqual({
        error: {
          code: 'spotify_upstream_error',
          message: 'Spotify could not complete the request.',
        },
      });
    });
  }

  it('returns a track detail body', async () => {
    const { app, spotify } = createSpotifyApp();
    const track = createTrackDetail({ id: 'track-4', name: 'Chinese Satellite' });
    spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>(track));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/track-1',
    });

    expect(spotify.getTrack).toHaveBeenCalledWith('track-1');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(track);
  });

  it('rejects a missing track route parameter without calling Spotify', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/',
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'not_found', message: 'Route not found.' },
    });
  });

  it('rejects encoded slash route parameters without calling Spotify', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/..%2Fartists%2Fartist-2',
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'invalid_request', message: 'The request body is invalid.' },
    });
  });

  it('returns a playlist detail body', async () => {
    const { app, spotify } = createSpotifyApp();
    const playlist = createPlaylistDetail({ id: 'playlist-2', name: 'Chill Mix' });
    spotify.getPlaylist.mockResolvedValue(spotifyResponse<'getPlaylist'>(playlist));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/playlists/playlist-1',
    });

    expect(spotify.getPlaylist).toHaveBeenCalledWith('playlist-1');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(playlist);
  });

  it('returns a playlist detail body when Spotify reports a null public flag', async () => {
    const { app, spotify } = createSpotifyApp();
    const playlist = createPlaylistDetail({ id: 'playlist-4', public: null });
    spotify.getPlaylist.mockResolvedValue(spotifyResponse<'getPlaylist'>(playlist));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/playlists/playlist-4',
    });

    expect(spotify.getPlaylist).toHaveBeenCalledWith('playlist-4');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(playlist);
  });

  it('rejects a missing playlist route parameter without calling Spotify', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/playlists/',
    });

    expect(spotifyFactory).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'not_found', message: 'Route not found.' },
    });
  });

  it('aggregates artist details into one response', async () => {
    const { app, spotify } = createSpotifyApp();
    const artist = createArtistDetail();
    const artistTopTracks = { tracks: [createTrackSummary({ id: 'track-5', name: '$20' })] };
    const artistAlbums = { items: [{ id: 'album-1', name: 'the record' }], total: 1 };
    const relatedArtists = [createArtistSummary({ id: 'artist-2', name: 'Lucy Dacus' })];

    spotify.getArtist.mockResolvedValue(spotifyResponse<'getArtist'>(artist));
    spotify.getArtistTopTracks.mockResolvedValue(spotifyResponse<'getArtistTopTracks'>(artistTopTracks));
    spotify.getArtistAlbums.mockResolvedValue(spotifyResponse<'getArtistAlbums'>(artistAlbums));
    spotify.getArtistRelatedArtists.mockResolvedValue(spotifyResponse<'getArtistRelatedArtists'>({
      artists: relatedArtists,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/artists/artist-1',
    });

    expect(spotify.getArtist).toHaveBeenCalledWith('artist-1');
    expect(spotify.getArtistTopTracks).toHaveBeenCalledWith('artist-1', 'US');
    expect(spotify.getArtistAlbums).toHaveBeenCalledWith('artist-1', { limit: 50 });
    expect(spotify.getArtistRelatedArtists).toHaveBeenCalledWith('artist-1');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      artist,
      artistTopTracks,
      artistAlbums,
      relatedArtists,
    });
  });

  it('aggregates user details into one response', async () => {
    const { app, spotify } = createSpotifyApp();
    const user = createUserDetail();
    spotify.getUser.mockResolvedValue(spotifyResponse<'getUser'>(user));
    spotify.getUserPlaylists.mockResolvedValue(
      spotifyResponse<'getUserPlaylists'>({ items: [], total: 42 }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/users/user-1',
    });

    expect(spotify.getUser).toHaveBeenCalledWith('user-1');
    expect(spotify.getUserPlaylists).toHaveBeenCalledWith('user-1');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user,
      totalPlaylists: 42,
    });
  });

  it('aggregates user details when optional profile fields are null', async () => {
    const { app, spotify } = createSpotifyApp();
    const user = createUserDetail({ display_name: null, images: null, followers: null });
    spotify.getUser.mockResolvedValue(spotifyResponse<'getUser'>(user));
    spotify.getUserPlaylists.mockResolvedValue(
      spotifyResponse<'getUserPlaylists'>({ items: [], total: 42 }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/users/user-1',
    });

    expect(spotify.getUser).toHaveBeenCalledWith('user-1');
    expect(spotify.getUserPlaylists).toHaveBeenCalledWith('user-1');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user,
      totalPlaylists: 42,
    });
  });

  it('aggregates category details into one response', async () => {
    const { app, spotify } = createSpotifyApp();
    const category = createCategory();
    const categoryPlaylists = {
      items: [createPlaylistSummary({ id: 'playlist-3', name: 'Party Mix' })],
      total: 1,
      next: null,
    };

    spotify.getCategory.mockResolvedValue(spotifyResponse<'getCategory'>(category));
    spotify.getPlaylistsForCategory.mockResolvedValue(spotifyResponse<'getPlaylistsForCategory'>({
      playlists: categoryPlaylists,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/categories/party',
    });

    expect(spotify.getCategory).toHaveBeenCalledWith('party');
    expect(spotify.getPlaylistsForCategory).toHaveBeenCalledWith('party');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      category,
      categoryPlaylists,
    });
  });

  for (const testCase of aggregateValidationCases) {
    it(`returns a safe 502 when Spotify omits required aggregate ${testCase.label}`, async () => {
      const { app, spotify } = createSpotifyApp();
      arrangeSpotifyCase(testCase, spotify);

      const response = await app.inject(testCase.request);

      expect(response.statusCode).toBe(502);
      expect(JSON.parse(response.body)).toEqual({
        error: {
          code: 'spotify_upstream_error',
          message: 'Spotify could not complete the request.',
        },
      });
    });
  }

  it('aggregates every category page without requesting beyond the final page', async () => {
    const { app, spotify } = createSpotifyApp();

    spotify.getCategories
      .mockResolvedValueOnce(spotifyResponse<'getCategories'>({
        categories: {
          items: [
            createCategory({ id: 'one', name: 'One' }),
            createCategory({ id: 'two', name: 'Two' }),
          ],
          next: 'https://spotify.example/next',
          total: 3,
        },
      }))
      .mockResolvedValueOnce(spotifyResponse<'getCategories'>({
        categories: {
          items: [createCategory({ id: 'three', name: 'Three' })],
          next: null,
          total: 3,
        },
      }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/categories',
    });

    expect(spotify.getCategories).toHaveBeenCalledTimes(2);
    expect(spotify.getCategories).toHaveBeenNthCalledWith(1, { limit: 50, offset: 0 });
    expect(spotify.getCategories).toHaveBeenNthCalledWith(2, { limit: 50, offset: 2 });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      createCategory({ id: 'one', name: 'One' }),
      createCategory({ id: 'two', name: 'Two' }),
      createCategory({ id: 'three', name: 'Three' }),
    ]);
  });

  it('turns Spotify upstream failures into a safe 502 and logs a sanitized error projection', async () => {
    const { app, spotify } = createSpotifyApp();
    const sentinel = 'TOPSECRETTOKEN';
    const upstreamError = Object.assign(new Error(`upstream exploded ${sentinel}`), {
      code: sentinel,
      name: sentinel,
      secret: sentinel,
    });
    const logError = vi.fn();
    spotify.getAvailableGenreSeeds.mockRejectedValue(upstreamError);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/getAvailableGenreSeeds',
      headers: { authorization: 'Bearer top-secret-token' },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/getAvailableGenreSeeds',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(JSON.stringify(logError.mock.calls)).not.toContain('upstream exploded');
    expect(response.body).not.toContain(sentinel);
  });

  it('turns spotify client factory status-code failures into a safe 502 and logs a sanitized error projection', async () => {
    const sentinel = 'TOPSECRETTOKEN';
    const logError = vi.fn();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      throw Object.assign(new Error(`factory boom ${sentinel}`), {
        code: sentinel,
        name: sentinel,
        secret: sentinel,
        statusCode: 429,
      });
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/genres',
    }, 'Spotify request failed');
    expect(response.body).not.toContain('factory boom');
    expect(response.body).not.toContain(sentinel);
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(JSON.stringify(logError.mock.calls)).not.toContain('factory boom');
  });

  it('keeps statusCode accessors from leaking into Spotify error logging', async () => {
    const sentinel = 'TOPSECRETTOKEN';
    const logError = vi.fn();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      const error = Object.assign(new Error(`factory boom ${sentinel}`), {
        code: sentinel,
        name: sentinel,
        secret: sentinel,
      });
      Object.defineProperty(error, 'statusCode', {
        get() {
          throw new Error(`getter ${sentinel}`);
        },
      });
      throw error;
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/genres',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(response.body).not.toContain(sentinel);
  });

  it('turns injected ApiError failures into a safe 502 without leaking sentinels', async () => {
    const sentinelCode = 'sentinel_code';
    const sentinelMessage = 'SENTINEL_MESSAGE';
    const logError = vi.fn();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      throw new ApiError(418, sentinelCode, sentinelMessage);
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/genres',
    }, 'Spotify request failed');
    expect(response.body).not.toContain(sentinelCode);
    expect(response.body).not.toContain(sentinelMessage);
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinelCode);
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinelMessage);
  });

  it('turns injected SpotifyConfigurationError failures into a safe 502', async () => {
    const logError = vi.fn();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      throw new SpotifyConfigurationError();
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/genres',
    }, 'Spotify request failed');
  });

  it('turns SpotifyConfigurationError prototype spoof failures into a safe 502', async () => {
    const sentinel = 'TOPSECRETTOKEN';
    const logError = vi.fn();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      const spoofedError = Object.assign(
        Object.create(SpotifyConfigurationError.prototype) as Error & Record<string, unknown>,
        {
          message: sentinel,
          code: sentinel,
        },
      );
      throw spoofedError;
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/genres',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(response.body).not.toContain(sentinel);
  });

  it('turns proxy trap failures into a safe 502 without leaking sentinels', async () => {
    const sentinel = 'TOPSECRETTOKEN';
    const logError = vi.fn();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      const trappedError: Error = new Proxy(new Error('opaque dependency failure'), {
        getPrototypeOf() {
          throw new Error(`prototype ${sentinel}`);
        },
        getOwnPropertyDescriptor() {
          throw new Error(`descriptor ${sentinel}`);
        },
        get() {
          throw new Error(`get ${sentinel}`);
        },
      });
      throw trappedError;
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/genres',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(response.body).not.toContain(sentinel);
  });

  it('uses the first projected getter value for Spotify validation and response bodies', async () => {
    const sentinel = 'SERIALIZE_SENTINEL';
    const { app, spotify, spotifyFactory } = createSpotifyApp();
    let nameReads = 0;

    const track = createTrackDetail() as Record<string, unknown>;
    Object.defineProperty(track, 'name', {
      enumerable: true,
      get() {
        nameReads += 1;
        return nameReads === 1 ? 'Garden Song' : sentinel;
      },
    });
    spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>(track));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/track-1',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledWith('track-1');
    expect(nameReads).toBe(1);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(createTrackDetail());
    expect(response.body).not.toContain(sentinel);
  });

  it('turns contract-replacing Spotify response toJSON payloads into a safe 502', async () => {
    const sentinel = 'SERIALIZE_SENTINEL';
    const logError = vi.fn();
    const { app, spotify, spotifyFactory } = createSpotifyApp();

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>({
      ...createTrackDetail(),
      toJSON() {
        return { evil: sentinel };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/track-1',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledWith('track-1');
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/tracks/:trackId(^.+$)',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(response.body).not.toContain(sentinel);
  });

  it('turns Spotify response toJSON serialization failures into a safe 502 without leaking sentinels', async () => {
    const sentinel = 'SERIALIZE_SENTINEL';
    const logError = vi.fn();
    const { app, spotify, spotifyFactory } = createSpotifyApp();

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>({
      ...createTrackDetail(),
      toJSON() {
        throw new Error(`toJSON ${sentinel}`);
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/track-1',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledWith('track-1');
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/tracks/:trackId(^.+$)',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(response.body).not.toContain(sentinel);
  });

  it('turns Spotify response getter serialization failures into a safe 502 without leaking sentinels', async () => {
    const sentinel = 'SERIALIZE_SENTINEL';
    const logError = vi.fn();
    const { app, spotify, spotifyFactory } = createSpotifyApp();

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const track = createTrackDetail() as Record<string, unknown>;
    Object.defineProperty(track, 'escaped', {
      enumerable: true,
      get() {
        throw new Error(`getter ${sentinel}`);
      },
    });
    spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>(track));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/track-1',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledWith('track-1');
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/tracks/:trackId(^.+$)',
    }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain(sentinel);
    expect(response.body).not.toContain(sentinel);
  });

  it('turns cyclic Spotify responses into a safe 502', async () => {
    const logError = vi.fn();
    const { app, spotify, spotifyFactory } = createSpotifyApp();

    app.addHook('onRequest', async (request) => {
      await Promise.resolve();
      Object.assign(request.log, { error: logError });
    });

    const track = createTrackDetail() as Record<string, unknown>;
    track.self = track;
    spotify.getTrack.mockResolvedValue(spotifyResponse<'getTrack'>(track));

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/tracks/track-1',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledOnce();
    expect(spotify.getTrack).toHaveBeenCalledWith('track-1');
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: 'spotify_upstream_error',
        message: 'Spotify could not complete the request.',
      },
    });
    expect(logError).toHaveBeenCalledWith({
      err: {
        classification: 'spotify_request_failure',
      },
      method: 'GET',
      route: '/api/spotify/tracks/:trackId(^.+$)',
    }, 'Spotify request failed');
    expect(response.body).not.toContain('circular');
    expect(JSON.stringify(logError.mock.calls)).not.toContain('circular');
  });

  it('returns a safe 500 when Spotify is not configured', async () => {
    const originalClientId = process.env.SPOTIFY_CLIENT_ID;
    const originalClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const logError = vi.fn();

    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;

    try {
      const app = buildApp();
      apps.push(app);

      app.addHook('onRequest', async (request) => {
        await Promise.resolve();
        Object.assign(request.log, { error: logError });
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/spotify/genres',
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: {
          code: 'spotify_not_configured',
          message: 'Spotify is not configured.',
        },
      });
      expect(logError).toHaveBeenCalledWith({
        err: {
          classification: 'spotify_configuration_error',
        },
        method: 'GET',
        route: '/api/spotify/genres',
      }, 'Spotify request failed');
    } finally {
      if (originalClientId === undefined) {
        delete process.env.SPOTIFY_CLIENT_ID;
      } else {
        process.env.SPOTIFY_CLIENT_ID = originalClientId;
      }

      if (originalClientSecret === undefined) {
        delete process.env.SPOTIFY_CLIENT_SECRET;
      } else {
        process.env.SPOTIFY_CLIENT_SECRET = originalClientSecret;
      }
    }
  });

  const wrongMethodCases: Array<Pick<InjectOptions, 'method' | 'url'>> = [
    { method: 'GET', url: '/api/spotify/searchTracks' },
    { method: 'GET', url: '/api/spotify/getPlaylistTracks' },
    { method: 'POST', url: '/api/spotify/genres' },
    { method: 'POST', url: '/api/spotify/tracks/track-1' },
  ];

  it.each(wrongMethodCases)('rejects wrong Spotify HTTP methods for $method $url without calling Spotify', async ({ method, url }) => {
    const { app, spotifyFactory } = createSpotifyApp();

    const response = await app.inject({ method, url });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'not_found', message: 'Route not found.' },
    });
    expect(spotifyFactory).not.toHaveBeenCalled();
  });
});

describe('spotify serialization helper', () => {
  it('projects stable getters to plain JSON-safe data without changing payload shape', async () => {
    const { projectSpotifyResponse } = await loadSerializationModule();
    const expectedTrack = {
      id: 'track-1',
      uri: 'spotify:track:track-1',
      name: 'Garden Song',
      artists: [
        {
          id: 'artist-1',
          name: 'Phoebe Bridgers',
          uri: 'spotify:artist:artist-1',
        },
      ],
      album: {
        images: [{ url: 'https://images.example/track.png' }],
      },
      popularity: 84,
      duration_ms: 207000,
      preview_url: null,
      external_urls: { spotify: 'https://open.spotify.com/track/track-1' },
    };
    let nameReads = 0;
    const sourceTrack = Object.assign(
      Object.create({ inherited: 'root' }) as Record<string, unknown>,
      {
        ...expectedTrack,
        artists: [Object.assign(
          Object.create({ inherited: 'artist' }) as Record<string, unknown>,
          expectedTrack.artists[0],
        )],
        album: Object.assign(
          Object.create({ inherited: 'album' }) as Record<string, unknown>,
          { images: [Object.assign(
            Object.create({ inherited: 'image' }) as Record<string, unknown>,
            expectedTrack.album.images[0],
          )] },
        ),
        external_urls: Object.assign(
          Object.create({ inherited: 'url' }) as Record<string, unknown>,
          expectedTrack.external_urls,
        ),
      },
    );
    Object.defineProperty(sourceTrack, 'name', {
      enumerable: true,
      get() {
        nameReads += 1;
        return expectedTrack.name;
      },
    });

    const projectedTrack = projectSpotifyResponse<typeof sourceTrack>(sourceTrack);

    expect(nameReads).toBe(1);
    expect(projectedTrack).toEqual(expectedTrack);
    expect(Object.getPrototypeOf(projectedTrack)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(projectedTrack.artists[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(projectedTrack.album)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(projectedTrack.album.images[0])).toBe(Object.prototype);
    expect(Object.getPrototypeOf(projectedTrack.external_urls)).toBe(Object.prototype);
  });
});

describe('spotify pagination helper', () => {
  it('requests one page at the default size when no next page exists', async () => {
    const { getAllPages } = await loadPaginationModule();
    const request = vi.fn(async (limit: number, offset: number) => {
      await Promise.resolve();
      return {
        marker: 'first-page',
        items: ['a', 'b'],
        next: null,
        total: 2,
        requested: { limit, offset },
      };
    });

    const response = await getAllPages(request);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(50, 0);
    expect(response).toEqual({
      marker: 'first-page',
      items: ['a', 'b'],
      next: null,
      total: 2,
      requested: { limit: 50, offset: 0 },
    });
  });

  it('concatenates multiple pages and advances by the accumulated item count', async () => {
    const { getAllPages } = await loadPaginationModule();
    const firstPage = {
      marker: 'first-page',
      items: ['a', 'b'],
      next: 'page-2',
      total: 3,
    };
    const secondPage = {
      marker: 'second-page',
      items: ['c'],
      next: null,
      total: 3,
    };
    const request = vi.fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const response = await getAllPages(request);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, 50, 0);
    expect(request).toHaveBeenNthCalledWith(2, 50, 2);
    expect(firstPage.items).toEqual(['a', 'b']);
    expect(response).not.toBe(firstPage);
    expect(response).toEqual({
      marker: 'second-page',
      items: ['a', 'b', 'c'],
      next: null,
      total: 3,
    });
  });

  it('stops when a next page does not advance pagination', async () => {
    const { getAllPages } = await loadPaginationModule();
    const request = vi.fn()
      .mockResolvedValueOnce({
        marker: 'first-page',
        items: ['a'],
        next: 'page-2',
        total: 2,
      })
      .mockResolvedValueOnce({
        marker: 'second-page',
        items: [],
        next: 'page-3',
        total: 2,
      })
      .mockImplementation(() => {
        throw new Error('Unexpected extra page request');
      });

    await expect(getAllPages(request)).rejects.toThrow(
      'Spotify pagination did not advance.',
    );
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, 50, 0);
    expect(request).toHaveBeenNthCalledWith(2, 50, 1);
  });

  it('stops when the reported total is already satisfied', async () => {
    const { getAllPages } = await loadPaginationModule();
    const request = vi.fn()
      .mockResolvedValueOnce({
        marker: 'first-page',
        items: ['a'],
        next: 'page-2',
        total: 1,
      })
      .mockImplementation(() => {
        throw new Error('Unexpected extra page request');
      });

    await expect(getAllPages(request)).resolves.toEqual({
      marker: 'first-page',
      items: ['a'],
      next: null,
      total: 1,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(50, 0);
  });

  it('rejects pages without totals', async () => {
    const { getAllPages } = await loadPaginationModule();
    const request = vi.fn(async () => {
      await Promise.resolve();
      return {
        marker: 'first-page',
        items: ['a'],
        next: null,
      };
    });

    await expect(getAllPages(request)).rejects.toThrow(
      'Spotify pagination did not include a valid total.',
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(50, 0);
  });

  it('rejects pagination that exceeds the category page cap', async () => {
    const { getAllPages } = await loadPaginationModule();
    let page = 0;
    const request = vi.fn(async (limit: number, offset: number) => {
      await Promise.resolve();
      page += 1;
      return {
        marker: `page-${page}`,
        items: [`item-${page}`],
        next: page < 25 ? `page-${page + 1}` : null,
        total: 25,
        requested: { limit, offset },
      };
    });

    await expect(getAllPages(request)).rejects.toThrow(
      'Spotify pagination exceeded the category page cap.',
    );
    expect(request).toHaveBeenCalledTimes(20);
  });
});
