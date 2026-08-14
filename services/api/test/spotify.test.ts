import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { SpotifyClient } from '../src/spotify/client.js';
import { createFakeSpotifyClient } from './helpers.js';

async function loadPaginationModule() {
  return import('../src/spotify/pagination.js');
}

describe('spotify routes', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  function createSpotifyApp() {
    const spotify = createFakeSpotifyClient();
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      return spotify as unknown as SpotifyClient;
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);
    return { app, spotify, spotifyFactory };
  }

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

  it('returns track search results from Spotify', async () => {
    const { app, spotify } = createSpotifyApp();
    const tracks = { items: [{ id: 'track-1', name: 'Garden Song' }], total: 1, next: null };
    spotify.searchTracks.mockResolvedValue({ body: { tracks } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/searchTracks',
      payload: { query: 'garden', options: { limit: 10 } },
    });

    expect(spotify.searchTracks).toHaveBeenCalledWith('garden', { limit: 10 });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(tracks);
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
    const artists = { items: [{ id: 'artist-1', name: 'Phoebe Bridgers' }], total: 1, next: null };
    spotify.searchArtists.mockResolvedValue({ body: { artists } });

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
      items: [{ track: { id: 'track-1', name: 'Motion Sickness' } }],
      total: 1,
      next: null,
    };
    spotify.getPlaylistTracks.mockResolvedValue({ body: playlistTracks });

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
    const playlists = { items: [{ id: 'playlist-1', name: 'Favorites' }], total: 1, next: null };
    spotify.getUserPlaylists.mockResolvedValue({ body: playlists });

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

  it('returns Spotify recommendations', async () => {
    const { app, spotify } = createSpotifyApp();
    const recommendations = { tracks: [{ id: 'track-1', name: 'Kyoto' }], seeds: [] };
    const options = { seed_tracks: ['track-1'], limit: 5 };
    spotify.getRecommendations.mockResolvedValue({ body: recommendations });

    const response = await app.inject({
      method: 'POST',
      url: '/api/spotify/getRecommendations',
      payload: { options },
    });

    expect(spotify.getRecommendations).toHaveBeenCalledWith(options);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(recommendations);
  });

  it('returns available genre seeds', async () => {
    const { app, spotify } = createSpotifyApp();
    spotify.getAvailableGenreSeeds.mockResolvedValue({ body: { genres: ['rock', 'jazz'] } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/getAvailableGenreSeeds',
    });

    expect(spotify.getAvailableGenreSeeds).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(['rock', 'jazz']);
  });

  it('returns the loader genres data from the same Spotify endpoint', async () => {
    const { app, spotify } = createSpotifyApp();
    spotify.getAvailableGenreSeeds.mockResolvedValue({ body: { genres: ['ambient', 'folk'] } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotify.getAvailableGenreSeeds).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(['ambient', 'folk']);
  });

  it('returns a track detail body', async () => {
    const { app, spotify } = createSpotifyApp();
    const track = { id: 'track-1', name: 'Chinese Satellite' };
    spotify.getTrack.mockResolvedValue({ body: track });

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
    const playlist = { id: 'playlist-1', name: 'Chill Mix' };
    spotify.getPlaylist.mockResolvedValue({ body: playlist });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/playlists/playlist-1',
    });

    expect(spotify.getPlaylist).toHaveBeenCalledWith('playlist-1');
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
    const artist = { id: 'artist-1', name: 'boygenius' };
    const artistTopTracks = { tracks: [{ id: 'track-1', name: '$20' }] };
    const artistAlbums = { items: [{ id: 'album-1', name: 'the record' }], total: 1 };
    const relatedArtists = [{ id: 'artist-2', name: 'Lucy Dacus' }];

    spotify.getArtist.mockResolvedValue({ body: artist });
    spotify.getArtistTopTracks.mockResolvedValue({ body: artistTopTracks });
    spotify.getArtistAlbums.mockResolvedValue({ body: artistAlbums });
    spotify.getArtistRelatedArtists.mockResolvedValue({ body: { artists: relatedArtists } });

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
    const user = { id: 'user-1', display_name: 'Adam' };
    spotify.getUser.mockResolvedValue({ body: user });
    spotify.getUserPlaylists.mockResolvedValue({ body: { total: 42 } });

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
    const category = { id: 'party', name: 'Party' };
    const categoryPlaylists = { items: [{ id: 'playlist-1', name: 'Party Mix' }], total: 1, next: null };

    spotify.getCategory.mockResolvedValue({ body: category });
    spotify.getPlaylistsForCategory.mockResolvedValue({ body: { playlists: categoryPlaylists } });

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

  it('aggregates every category page without requesting beyond the final page', async () => {
    const { app, spotify } = createSpotifyApp();

    spotify.getCategories
      .mockResolvedValueOnce({
        body: {
          categories: {
            items: [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }],
            next: 'https://spotify.example/next',
            total: 3,
          },
        },
      })
      .mockResolvedValueOnce({
        body: {
          categories: {
            items: [{ id: 'three', name: 'Three' }],
            next: null,
            total: 3,
          },
        },
      });

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/categories',
    });

    expect(spotify.getCategories).toHaveBeenCalledTimes(2);
    expect(spotify.getCategories).toHaveBeenNthCalledWith(1, { limit: 50, offset: 0 });
    expect(spotify.getCategories).toHaveBeenNthCalledWith(2, { limit: 50, offset: 2 });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { id: 'one', name: 'One' },
      { id: 'two', name: 'Two' },
      { id: 'three', name: 'Three' },
    ]);
  });

  it('turns Spotify upstream failures into a safe 502 and logs the original error', async () => {
    const { app, spotify } = createSpotifyApp();
    const upstreamError = new Error('upstream exploded');
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
    expect(logError).toHaveBeenCalledWith({ err: upstreamError }, 'Spotify request failed');
    expect(JSON.stringify(logError.mock.calls)).not.toContain('top-secret-token');
  });

  it('does not rewrite spotify client factory failures as upstream errors', async () => {
    const spotifyFactory = vi.fn(async (): Promise<SpotifyClient> => {
      await Promise.resolve();
      throw new Error('factory boom');
    });
    const app = buildApp({ spotifyFactory });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/spotify/genres',
    });

    expect(spotifyFactory).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'internal_error', message: 'The request could not be completed.' },
    });
    expect(response.body).not.toContain('factory boom');
  });

  it('rejects wrong HTTP methods without calling Spotify', async () => {
    const { app, spotifyFactory } = createSpotifyApp();

    const searchResponse = await app.inject({
      method: 'GET',
      url: '/api/spotify/searchTracks',
    });
    const genresResponse = await app.inject({
      method: 'POST',
      url: '/api/spotify/genres',
    });

    expect(searchResponse.statusCode).toBeGreaterThanOrEqual(400);
    expect(genresResponse.statusCode).toBeGreaterThanOrEqual(400);
    expect(spotifyFactory).not.toHaveBeenCalled();
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
    const request = vi.fn()
      .mockResolvedValueOnce({
        marker: 'first-page',
        items: ['a', 'b'],
        next: 'page-2',
        total: 3,
      })
      .mockResolvedValueOnce({
        marker: 'second-page',
        items: ['c'],
        next: null,
        total: 3,
      });

    const response = await getAllPages(request);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(1, 50, 0);
    expect(request).toHaveBeenNthCalledWith(2, 50, 2);
    expect(response).toEqual({
      marker: 'first-page',
      items: ['a', 'b', 'c'],
      next: 'page-2',
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

    await expect(getAllPages(request)).resolves.toEqual({
      marker: 'first-page',
      items: ['a'],
      next: 'page-2',
      total: 2,
    });
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
      next: 'page-2',
      total: 1,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(50, 0);
  });
});
