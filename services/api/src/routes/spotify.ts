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

type SpotifyTrackAutocompleteLike = {
  uri?: string | null | undefined;
  name?: string | null | undefined;
  artists?: Array<{ name?: string | null | undefined } | null | undefined> | null | undefined;
};

type SpotifyTrackCardLike = {
  id?: string | null | undefined;
  name?: string | null | undefined;
  artists?: Array<{
    id?: string | null | undefined;
    name?: string | null | undefined;
  } | null | undefined> | null | undefined;
  album?: {
    images?: Array<{ url?: string | null | undefined } | null | undefined> | null | undefined;
  } | null | undefined;
  popularity?: number | null | undefined;
  duration_ms?: number | null | undefined;
  preview_url?: string | null | undefined;
};

type SpotifyRecommendationSeedLike = {
  id?: string | null | undefined;
};

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

function requireString(value: string | null | undefined, description: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

function requireOptionalString(
  value: string | null | undefined,
  description: string,
): string | null | undefined {
  if (value == null) {
    return value;
  }

  return requireString(value, description);
}

function requireBoolean(value: boolean | null | undefined, description: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

function requireBooleanOrNull(
  value: boolean | null | undefined,
  description: string,
): boolean | null {
  if (value === null) {
    return value;
  }

  return requireBoolean(value, description);
}

function requireNumber(value: number | null | undefined, description: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Spotify response did not include ${description}.`);
  }

  return value;
}

function requireObject<Value extends object>(
  value: Value | null | undefined,
  description: string,
): NonNullable<Value> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
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

function requirePageWithTotal<
  Page extends { items?: Item[] | null | undefined; total?: number | null | undefined },
  Item,
>(
  page: Page | null | undefined,
  description: string,
): Page & { items: Item[]; total: number } {
  const response = requirePage(page, description);
  requireNumber(response.total, `${description} total`);
  return response as Page & { items: Item[]; total: number };
}

function requireFirstItem<Item>(
  value: Item[] | null | undefined,
  description: string,
): Item {
  const items = requireArray(value, description);
  return requireField(items[0], `${description}[0]`);
}

function requireStringArray(values: string[] | null | undefined, description: string): string[] {
  const items = requireArray(values, description);
  items.forEach((value, index) => {
    requireString(value, `${description}[${index}]`);
  });
  return items;
}

function requireExternalSpotifyUrl(
  value: { spotify?: string | null | undefined } | null | undefined,
  description: string,
) {
  const externalUrls = requireObject(value, `${description} external_urls`);
  requireString(externalUrls.spotify, `${description} external_urls.spotify`);
  return externalUrls;
}

function requireImageArray(
  value: Array<{ url?: string | null | undefined } | null | undefined> | null | undefined,
  description: string,
  { requireFirst = true }: { requireFirst?: boolean } = {},
) {
  const images = requireArray(value, `${description} images`);
  const firstImage = images[0];
  if (firstImage == null) {
    if (requireFirst) {
      requireFirstItem(images, `${description} images`);
    }
    return images;
  }

  const image = requireObject(firstImage, `${description} images[0]`);
  requireString(image.url, `${description} images[0].url`);
  return images;
}

function validateAutocompleteTrack(
  track: SpotifyTrackAutocompleteLike | null | undefined,
  description: string,
) {
  const response = requireObject(track, description);
  requireString(response.uri, `${description} uri`);
  requireString(response.name, `${description} name`);
  const artists = requireArray(response.artists, `${description} artists`);
  artists.forEach((artist, index) => {
    requireString(artist?.name, `${description} artists[${index}].name`);
  });
  return response;
}

function validateAutocompleteArtist(
  artist: SpotifyApi.ArtistObjectFull | SpotifyApi.ArtistObjectSimplified | null | undefined,
  description: string,
) {
  const response = requireObject(artist, description);
  requireString(response.uri, `${description} uri`);
  requireString(response.name, `${description} name`);
  return response;
}

function validateTrackCard(
  track: SpotifyTrackCardLike | null | undefined,
  description: string,
) {
  const response = requireObject(track, description);
  requireString(response.id, `${description} id`);
  requireString(response.name, `${description} name`);
  const artists = requireArray(response.artists, `${description} artists`);
  artists.forEach((artist, index) => {
    requireString(artist?.id, `${description} artists[${index}].id`);
    requireString(artist?.name, `${description} artists[${index}].name`);
  });
  const album = requireObject(response.album, `${description} album`);
  requireImageArray(album.images, `${description} album`);
  requireNumber(response.popularity, `${description} popularity`);
  requireNumber(response.duration_ms, `${description} duration_ms`);
  requireOptionalString(response.preview_url, `${description} preview_url`);
  return response;
}

function validateTrackDetail(
  track: SpotifyApi.SingleTrackResponse | null | undefined,
  description: string,
) {
  const response = requireObject(track, description);
  requireString(response.id, `${description} id`);
  requireString(response.name, `${description} name`);
  const artists = requireArray(response.artists, `${description} artists`);
  artists.forEach((artist, index) => {
    requireString(artist?.id, `${description} artists[${index}].id`);
    requireString(artist?.name, `${description} artists[${index}].name`);
  });
  requireExternalSpotifyUrl(response.external_urls, description);
  const album = requireObject(response.album, `${description} album`);
  requireImageArray(album.images, `${description} album`);
  return response;
}

function validateEpisodeCard(
  episode: SpotifyApi.EpisodeObjectFull | null | undefined,
  description: string,
) {
  const response = requireObject(episode, description);
  requireString(response.id, `${description} id`);
  requireExternalSpotifyUrl(response.external_urls, description);
  requireImageArray(response.images, description);
  requireString(response.name, `${description} name`);
  requireNumber(response.duration_ms, `${description} duration_ms`);
  requireString(response.release_date, `${description} release_date`);
  requireOptionalString(response.description, `${description} description`);
  const show = requireObject(response.show, `${description} show`);
  requireExternalSpotifyUrl(show.external_urls, `${description} show`);
  requireString(show.name, `${description} show.name`);
  return response;
}

function isEpisodeObject(
  track: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObjectFull,
): track is SpotifyApi.EpisodeObjectFull {
  return 'show' in track;
}

function validatePlaylistSummary(
  playlist: SpotifyApi.PlaylistObjectFull | SpotifyApi.PlaylistObjectSimplified | null | undefined,
  description: string,
) {
  const response = requireObject(playlist, description);
  requireString(response.id, `${description} id`);
  requireString(response.name, `${description} name`);
  requireImageArray(response.images, description);
  const owner = requireObject(response.owner, `${description} owner`);
  requireString(owner.id, `${description} owner.id`);
  requireString(owner.display_name, `${description} owner.display_name`);
  const tracks = requireObject(response.tracks, `${description} tracks`);
  requireNumber(tracks.total, `${description} tracks.total`);
  requireOptionalString(response.description, `${description} description`);
  return response;
}

function validatePlaylistDetail(
  playlist: SpotifyApi.PlaylistObjectFull | null | undefined,
  description: string,
) {
  const response = requireObject(playlist, description);
  requireString(response.id, `${description} id`);
  requireString(response.name, `${description} name`);
  requireImageArray(response.images, description, { requireFirst: false });
  const owner = requireObject(response.owner, `${description} owner`);
  requireString(owner.id, `${description} owner.id`);
  requireOptionalString(owner.display_name, `${description} owner.display_name`);
  if (owner.followers != null) {
    const ownerFollowers = requireObject(owner.followers, `${description} owner.followers`);
    requireNumber(ownerFollowers.total, `${description} owner.followers.total`);
  }
  const tracks = requireObject(response.tracks, `${description} tracks`);
  requireNumber(tracks.total, `${description} tracks.total`);
  requireExternalSpotifyUrl(response.external_urls, description);
  const followers = requireObject(response.followers, `${description} followers`);
  requireNumber(followers.total, `${description} followers.total`);
  requireBooleanOrNull(response.public, `${description} public`);
  requireBoolean(response.collaborative, `${description} collaborative`);
  requireOptionalString(response.description, `${description} description`);
  return response;
}

function validateCategory(
  category: SpotifyApi.CategoryObject | SpotifyApi.SingleCategoryResponse | null | undefined,
  description: string,
  { requireId = true }: { requireId?: boolean } = {},
) {
  const response = requireObject(category, description);
  if (requireId) {
    requireString(response.id, `${description} id`);
  }
  requireString(response.name, `${description} name`);
  requireImageArray(response.icons, `${description} icons`);
  return response;
}

function validateArtistDetail(
  artist: SpotifyApi.SingleArtistResponse | null | undefined,
  description: string,
) {
  const response = requireObject(artist, description);
  requireString(response.id, `${description} id`);
  requireString(response.name, `${description} name`);
  requireExternalSpotifyUrl(response.external_urls, description);
  requireImageArray(response.images, description);
  requireNumber(response.popularity, `${description} popularity`);
  const followers = requireObject(response.followers, `${description} followers`);
  requireNumber(followers.total, `${description} followers.total`);
  requireStringArray(response.genres, `${description} genres`);
  return response;
}

function validateRelatedArtist(
  artist: SpotifyApi.ArtistObjectFull | SpotifyApi.ArtistObjectSimplified | null | undefined,
  description: string,
) {
  const response = requireObject(artist, description);
  requireString(response.id, `${description} id`);
  requireString(response.name, `${description} name`);
  return response;
}

function validateUserDetail(
  user: SpotifyApi.UserProfileResponse | null | undefined,
  description: string,
) {
  const response = requireObject(user, description);
  requireString(response.id, `${description} id`);
  requireExternalSpotifyUrl(response.external_urls, description);
  requireOptionalString(response.display_name, `${description} display_name`);
  if (response.images != null) {
    requireImageArray(response.images, description, { requireFirst: false });
  }
  if (response.followers != null) {
    const followers = requireObject(response.followers, `${description} followers`);
    requireNumber(followers.total, `${description} followers.total`);
  }
  return response;
}

function validatePlaylistTrackPage(
  page: SpotifyApi.PlaylistTrackResponse | null | undefined,
  description: string,
) {
  const response = requirePageWithTotal(page, description);
  response.items.forEach((playlistTrack, index) => {
    const item = requireObject(playlistTrack, `${description} items[${index}]`);
    const track = item.track;
    if (track == null) {
      return;
    }

    const trackObject = requireObject(track, `${description} items[${index}].track`);
    if (isEpisodeObject(trackObject)) {
      validateEpisodeCard(trackObject, `${description} items[${index}].track`);
      return;
    }

    validateTrackCard(trackObject, `${description} items[${index}].track`);
  });
  return response;
}

function validatePlaylistPage(
  page: SpotifyApi.ListOfUsersPlaylistsResponse | null | undefined,
  description: string,
) {
  const response = requirePageWithTotal(page, description);
  response.items.forEach((playlist, index) => {
    validatePlaylistSummary(playlist, `${description} items[${index}]`);
  });
  return response;
}

function validateRecommendationSeed(
  seed: SpotifyRecommendationSeedLike | null | undefined,
  description: string,
) {
  const response = requireObject(seed, description);
  requireString(response.id, `${description} id`);
  return response;
}

function readSpotifyErrorStatusCode(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'statusCode');
    if (descriptor === undefined || !('value' in descriptor)) {
      return undefined;
    }

    const statusCode: unknown = descriptor.value;
    if (typeof statusCode === 'number' && Number.isFinite(statusCode)) {
      return statusCode;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function projectSpotifyError(error: unknown) {
  const statusCode = readSpotifyErrorStatusCode(error);

  return {
    classification: error instanceof SpotifyConfigurationError
      ? 'spotify_configuration_error'
      : 'spotify_request_failure',
    ...(statusCode !== undefined ? { statusCode } : {}),
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

    request.log.error({
      err: projectSpotifyError(error),
      method: request.method,
      route: request.routeOptions.url,
    }, 'Spotify request failed');

    if (error instanceof SpotifyConfigurationError) {
      throw new ApiError(500, 'spotify_not_configured', 'Spotify is not configured.');
    }

    throw new ApiError(502, 'spotify_upstream_error', 'Spotify could not complete the request.');
  }
}

async function getGenres(request: FastifyRequest, spotifyFactory: SpotifyClientFactory) {
  return withSpotify(request, spotifyFactory, async (spotify) => {
    const body = requireBody(await spotify.getAvailableGenreSeeds(), 'genre seeds');
    return requireStringArray(body.genres, 'genres');
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

      return validatePlaylistTrackPage(body, 'playlist tracks page');
    });
  });

  app.post('/api/spotify/getRecommendations', async (request) => {
    const { options } = parseInput(getRecommendationsRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const recommendations = requireBody(
        await spotify.getRecommendations(options),
        'recommendations',
      );
      const tracks = requireArray(recommendations.tracks, 'recommendation tracks');
      tracks.forEach((track, index) => {
        validateTrackCard(track, `recommendation tracks[${index}]`);
      });
      const seeds = requireArray(recommendations.seeds, 'recommendation seeds');
      seeds.forEach((seed, index) => {
        validateRecommendationSeed(seed, `recommendation seeds[${index}]`);
      });
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

      return validatePlaylistPage(body, 'user playlists page');
    });
  });

  app.post('/api/spotify/searchArtists', async (request) => {
    const { query, options } = parseInput(searchRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const body = requireBody(await spotify.searchArtists(query, options), 'artist search results');
      const artists = requirePage(requireField(body.artists, 'artists'), 'artist search results');
      artists.items.forEach((artist, index) => {
        validateAutocompleteArtist(artist, `artist search results items[${index}]`);
      });
      return artists;
    });
  });

  app.post('/api/spotify/searchTracks', async (request) => {
    const { query, options } = parseInput(searchRequestSchema, request.body);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const body = requireBody(await spotify.searchTracks(query, options), 'track search results');
      const tracks = requirePage(requireField(body.tracks, 'tracks'), 'track search results');
      tracks.items.forEach((track, index) => {
        validateAutocompleteTrack(track, `track search results items[${index}]`);
      });
      return tracks;
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
      categories.items.forEach((category, index) => {
        validateCategory(category, `categories items[${index}]`);
      });
      return categories.items;
    })
  ));

  app.get('/api/spotify/categories/:categoryId(^.+$)', spotifyGetRouteOptions, async (request): Promise<SpotifyCategoryDetails> => {
    const { categoryId } = parseInput(categoryParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const category = validateCategory(
        requireBody(await spotify.getCategory(categoryId), 'category detail'),
        'category detail',
        { requireId: false },
      );
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
      categoryPlaylists.items.forEach((playlist, index) => {
        validatePlaylistSummary(playlist, `category playlists items[${index}]`);
      });

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
      validateTrackDetail(
        requireBody(await spotify.getTrack(trackId), 'track detail'),
        'track detail',
      )
    ));
  });

  app.get('/api/spotify/artists/:artistId(^.+$)', spotifyGetRouteOptions, async (request): Promise<SpotifyArtistDetails> => {
    const { artistId } = parseInput(artistParamsSchema, request.params);
    return withSpotify(request, spotifyFactory, async (spotify) => {
      const artist = validateArtistDetail(
        requireBody(await spotify.getArtist(artistId), 'artist detail'),
        'artist detail',
      );
      const artistTopTracks = requireBody(
        await spotify.getArtistTopTracks(artistId, 'US'),
        'artist top tracks',
      );
      const topTracks = requireArray(artistTopTracks.tracks, 'artist top tracks');
      topTracks.forEach((track, index) => {
        validateTrackCard(track, `artist top tracks[${index}]`);
      });
      const artistAlbums = requirePageWithTotal(
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
      relatedArtists.forEach((relatedArtist, index) => {
        validateRelatedArtist(relatedArtist, `related artists[${index}]`);
      });

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
      const user = validateUserDetail(
        requireBody(await spotify.getUser(userId), 'user detail'),
        'user detail',
      );
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
      validatePlaylistDetail(
        requireBody(await spotify.getPlaylist(playlistId), 'playlist detail'),
        'playlist detail',
      )
    ));
  });
}
