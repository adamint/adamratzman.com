import {
  getPlaylistTracksRequestSchema,
  getRecommendationsRequestSchema,
  getUserPlaylistsRequestSchema,
  searchRequestSchema,
  type SpotifyArtistDetails,
  type SpotifyCategoryDetails,
  type SpotifyUserDetails,
} from '@adamratzman/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors.js';
import type { SpotifyClient, SpotifyClientFactory } from '../spotify/client.js';
import { getAllPages } from '../spotify/pagination.js';

export type SpotifyRouteDependencies = {
  spotifyFactory: SpotifyClientFactory;
};

const invalidRequestError = new ApiError(400, 'invalid_request', 'The request body is invalid.');
const routeIdSchema = z.string().trim().min(1).regex(/^[^/]+$/u);
const trackParamsSchema = z.object({ trackId: routeIdSchema });
const playlistParamsSchema = z.object({ playlistId: routeIdSchema });
const artistParamsSchema = z.object({ artistId: routeIdSchema });
const userParamsSchema = z.object({ userId: routeIdSchema });
const categoryParamsSchema = z.object({ categoryId: routeIdSchema });

function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw invalidRequestError;
  }

  return parsed.data;
}

function requireSpotifyValue<T>(value: T | null | undefined, description: string): T {
  if (value == null) {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

async function withSpotify<T>(
  request: FastifyRequest,
  spotifyFactory: SpotifyClientFactory,
  callback: (spotify: SpotifyClient) => Promise<T>,
): Promise<T> {
  const spotify = await spotifyFactory();

  try {
    return await callback(spotify);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    request.log.error({ err: error }, 'Spotify request failed');
    throw new ApiError(502, 'spotify_upstream_error', 'Spotify could not complete the request.');
  }
}

async function getGenres(request: FastifyRequest, spotifyFactory: SpotifyClientFactory) {
  return withSpotify(request, spotifyFactory, async (spotify) => {
    const genres = (await spotify.getAvailableGenreSeeds()).body.genres;
    return requireSpotifyValue(genres, 'genres');
  });
}

export function registerSpotifyRoutes(
  app: FastifyInstance,
  { spotifyFactory }: SpotifyRouteDependencies,
) {
  app.get('/api/spotify/getAvailableGenreSeeds', async (request) => (
    getGenres(request, spotifyFactory)
  ));

  app.post('/api/spotify/getPlaylistTracks', async (request) => {
    const { playlistId, limit, offset } = parseInput(getPlaylistTracksRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      (await spotify.getPlaylistTracks(playlistId, { limit, offset: offset * limit })).body
    ));
  });

  app.post('/api/spotify/getRecommendations', async (request) => {
    const { options } = parseInput(getRecommendationsRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      (await spotify.getRecommendations(options)).body
    ));
  });

  app.post('/api/spotify/getUserPlaylists', async (request) => {
    const { userId, limit, offset } = parseInput(getUserPlaylistsRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      (await spotify.getUserPlaylists(userId, { limit, offset: offset * limit })).body
    ));
  });

  app.post('/api/spotify/searchArtists', async (request) => {
    const { query, options } = parseInput(searchRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const artists = (await spotify.searchArtists(query, options)).body.artists;
      return requireSpotifyValue(artists, 'artists');
    });
  });

  app.post('/api/spotify/searchTracks', async (request) => {
    const { query, options } = parseInput(searchRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const tracks = (await spotify.searchTracks(query, options)).body.tracks;
      return requireSpotifyValue(tracks, 'tracks');
    });
  });

  app.get('/api/spotify/categories', async (request) => (
    withSpotify(request, spotifyFactory, async (spotify) => {
      const categories = await getAllPages(async (limit, offset) => (
        (await spotify.getCategories({ limit, offset })).body.categories
      ));
      return categories.items;
    })
  ));

  app.get('/api/spotify/categories/:categoryId(^.+$)', async (request): Promise<SpotifyCategoryDetails> => {
    const { categoryId } = parseInput(categoryParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const category = (await spotify.getCategory(categoryId)).body;
      const categoryPlaylists = (await spotify.getPlaylistsForCategory(categoryId)).body.playlists;

      return {
        category,
        categoryPlaylists: requireSpotifyValue(categoryPlaylists, 'category playlists'),
      };
    });
  });

  app.get('/api/spotify/genres', async (request) => (
    getGenres(request, spotifyFactory)
  ));

  app.get('/api/spotify/tracks/:trackId(^.+$)', async (request) => {
    const { trackId } = parseInput(trackParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      (await spotify.getTrack(trackId)).body
    ));
  });

  app.get('/api/spotify/artists/:artistId(^.+$)', async (request): Promise<SpotifyArtistDetails> => {
    const { artistId } = parseInput(artistParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const artist = (await spotify.getArtist(artistId)).body;
      const artistTopTracks = (await spotify.getArtistTopTracks(artistId, 'US')).body;
      const artistAlbums = (await spotify.getArtistAlbums(artistId, { limit: 50 })).body;
      const relatedArtists = (await spotify.getArtistRelatedArtists(artistId)).body.artists;

      return {
        artist,
        artistTopTracks,
        artistAlbums,
        relatedArtists: requireSpotifyValue(relatedArtists, 'related artists'),
      };
    });
  });

  app.get('/api/spotify/users/:userId(^.+$)', async (request): Promise<SpotifyUserDetails> => {
    const { userId } = parseInput(userParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const user = (await spotify.getUser(userId)).body;
      const userPlaylists = (await spotify.getUserPlaylists(userId)).body;

      return {
        user,
        totalPlaylists: userPlaylists.total,
      };
    });
  });

  app.get('/api/spotify/playlists/:playlistId(^.+$)', async (request) => {
    const { playlistId } = parseInput(playlistParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      (await spotify.getPlaylist(playlistId)).body
    ));
  });
}
