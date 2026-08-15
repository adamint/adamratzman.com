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
import {
  SpotifyConfigurationError,
  type SpotifyClient,
  type SpotifyClientFactory,
} from '../spotify/client.js';
import { getAllPages } from '../spotify/pagination.js';

export type SpotifyRouteDependencies = {
  spotifyFactory: SpotifyClientFactory;
};

const invalidRequestError = new ApiError(400, 'invalid_request', 'The request body is invalid.');
const spotifyGetRouteOptions = { exposeHeadRoute: false };
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

function requireField<T>(value: T | null | undefined, description: string): NonNullable<T> {
  if (value == null) {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

function requireBody<Body>(
  response: { body?: Body | null | undefined },
  description: string,
): Body {
  return requireField(response.body, `${description} body`);
}

function requireArray<Item>(
  value: Item[] | null | undefined,
  description: string,
): Item[] {
  if (!Array.isArray(value)) {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

function requireNumber(value: number | null | undefined, description: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

function requirePage<Page extends { items?: Item[] | null | undefined }, Item>(
  page: Page | null | undefined,
  description: string,
): Page & { items: Item[] } {
  const response = requireField(page, description);
  requireArray(response.items, `${description} items`);
  return response as Page & { items: Item[] };
}

function projectSpotifyError(error: unknown) {
  const name = error instanceof Error ? error.name : undefined;
  const message = error instanceof Error ? error.message : undefined;
  const code = (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  )
    ? error.code
    : undefined;
  const statusCode = (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  )
    ? error.statusCode
    : undefined;

  return {
    name,
    message,
    code,
    statusCode,
  };
}

async function withSpotify<T>(
  request: FastifyRequest,
  spotifyFactory: SpotifyClientFactory,
  callback: (spotify: SpotifyClient) => Promise<T>,
): Promise<T> {
  try {
    const spotify = await spotifyFactory();
    return await callback(spotify);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    request.log.error({ err: projectSpotifyError(error) }, 'Spotify request failed');

    if (error instanceof SpotifyConfigurationError) {
      throw new ApiError(500, 'spotify_not_configured', 'Spotify is not configured.');
    }

    throw new ApiError(502, 'spotify_upstream_error', 'Spotify could not complete the request.');
  }
}

async function getGenres(request: FastifyRequest, spotifyFactory: SpotifyClientFactory) {
  return withSpotify(request, spotifyFactory, async (spotify) => {
    const body = requireBody(await spotify.getAvailableGenreSeeds(), 'genre seeds');
    return requireArray(body.genres, 'genres');
  });
}

export function registerSpotifyRoutes(
  app: FastifyInstance,
  { spotifyFactory }: SpotifyRouteDependencies,
) {
  app.get('/api/spotify/getAvailableGenreSeeds', spotifyGetRouteOptions, async (request) => (
    getGenres(request, spotifyFactory)
  ));

  app.post('/api/spotify/getPlaylistTracks', async (request) => {
    const { playlistId, limit, offset } = parseInput(getPlaylistTracksRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const body = requireBody(
        await spotify.getPlaylistTracks(playlistId, { limit, offset: offset * limit }),
        'playlist tracks page',
      );

      return requirePage(body, 'playlist tracks page');
    });
  });

  app.post('/api/spotify/getRecommendations', async (request) => {
    const { options } = parseInput(getRecommendationsRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const recommendations = requireBody(
        await spotify.getRecommendations(options),
        'recommendations',
      );
      requireArray(recommendations.tracks, 'recommendation tracks');
      requireArray(recommendations.seeds, 'recommendation seeds');
      return recommendations;
    });
  });

  app.post('/api/spotify/getUserPlaylists', async (request) => {
    const { userId, limit, offset } = parseInput(getUserPlaylistsRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const body = requireBody(
        await spotify.getUserPlaylists(userId, { limit, offset: offset * limit }),
        'user playlists page',
      );

      return requirePage(body, 'user playlists page');
    });
  });

  app.post('/api/spotify/searchArtists', async (request) => {
    const { query, options } = parseInput(searchRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const body = requireBody(await spotify.searchArtists(query, options), 'artist search results');
      return requireField(body.artists, 'artists');
    });
  });

  app.post('/api/spotify/searchTracks', async (request) => {
    const { query, options } = parseInput(searchRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const body = requireBody(await spotify.searchTracks(query, options), 'track search results');
      return requireField(body.tracks, 'tracks');
    });
  });

  app.get('/api/spotify/categories', spotifyGetRouteOptions, async (request) => (
    withSpotify(request, spotifyFactory, async (spotify) => {
      const categories = await getAllPages(async (limit, offset) => (
        requirePage(
          requireField(
            requireBody(await spotify.getCategories({ limit, offset }), 'categories').categories,
            'categories',
          ),
          'categories',
        )
      ));
      return categories.items;
    })
  ));

  app.get('/api/spotify/categories/:categoryId(^.+$)', spotifyGetRouteOptions, async (request): Promise<SpotifyCategoryDetails> => {
    const { categoryId } = parseInput(categoryParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const category = requireBody(await spotify.getCategory(categoryId), 'category detail');
      const categoryPlaylists = requirePage(
        requireField(
          requireBody(
            await spotify.getPlaylistsForCategory(categoryId),
            'category playlists',
          ).playlists,
          'category playlists',
        ),
        'category playlists',
      );

      return {
        category,
        categoryPlaylists,
      };
    });
  });

  app.get('/api/spotify/genres', spotifyGetRouteOptions, async (request) => (
    getGenres(request, spotifyFactory)
  ));

  app.get('/api/spotify/tracks/:trackId(^.+$)', spotifyGetRouteOptions, async (request) => {
    const { trackId } = parseInput(trackParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      requireBody(await spotify.getTrack(trackId), 'track detail')
    ));
  });

  app.get('/api/spotify/artists/:artistId(^.+$)', spotifyGetRouteOptions, async (request): Promise<SpotifyArtistDetails> => {
    const { artistId } = parseInput(artistParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const artist = requireBody(await spotify.getArtist(artistId), 'artist detail');
      const artistTopTracks = requireBody(
        await spotify.getArtistTopTracks(artistId, 'US'),
        'artist top tracks',
      );
      requireArray(artistTopTracks.tracks, 'artist top tracks');
      const artistAlbums = requirePage(
        requireBody(await spotify.getArtistAlbums(artistId, { limit: 50 }), 'artist albums'),
        'artist albums',
      );
      const relatedArtists = requireArray(
        requireBody(
          await spotify.getArtistRelatedArtists(artistId),
          'related artists',
        ).artists,
        'related artists',
      );

      return {
        artist,
        artistTopTracks,
        artistAlbums,
        relatedArtists,
      };
    });
  });

  app.get('/api/spotify/users/:userId(^.+$)', spotifyGetRouteOptions, async (request): Promise<SpotifyUserDetails> => {
    const { userId } = parseInput(userParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const user = requireBody(await spotify.getUser(userId), 'user detail');
      const userPlaylists = requireBody(
        await spotify.getUserPlaylists(userId),
        'user playlists',
      );

      return {
        user,
        totalPlaylists: requireNumber(userPlaylists.total, 'user playlist total'),
      };
    });
  });

  app.get('/api/spotify/playlists/:playlistId(^.+$)', spotifyGetRouteOptions, async (request) => {
    const { playlistId } = parseInput(playlistParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => (
      requireBody(await spotify.getPlaylist(playlistId), 'playlist detail')
    ));
  });
}
