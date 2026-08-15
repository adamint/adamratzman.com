import type {
  SpotifyArtistDetailsData,
  SpotifyCategoryDetailsData,
  SpotifyCategoryListItem,
  SpotifyPlaylistDetails,
  SpotifyTrackDetails,
  SpotifyUserDetailsData,
} from './spotifyLoaderTypes';
import { replace, type LoaderFunctionArgs } from 'react-router-dom';
import { ApiClientError, fetchJson } from './client';
import {
  isSpotifyArtistDetails,
  isSpotifyCategoriesResponse,
  isSpotifyCategoryDetails,
  isSpotifyGenresResponse,
  isSpotifyPlaylistResponse,
  isSpotifyTrackResponse,
  isSpotifyUserDetails,
} from './spotifyLoaderValidation';

type SpotifyLoaderArgs = Pick<LoaderFunctionArgs, 'params' | 'request'>;

export async function categoriesLoader({ request }: SpotifyLoaderArgs) {
  const categories = await loadOrReplace<SpotifyCategoryListItem[]>(
    '/api/spotify/categories',
    request.signal,
    {
      invalidResponsePath: '/projects',
      isValid: isSpotifyCategoriesResponse,
      requestErrorPath: '/projects',
    },
  );

  return { categories };
}

export async function categoryLoader({ params, request }: SpotifyLoaderArgs) {
  const categoryId = requireParam(params.categoryId, '/projects/spotify/categories');
  return loadOrReplace<SpotifyCategoryDetailsData>(
    `/api/spotify/categories/${encodeURIComponent(categoryId)}`,
    request.signal,
    {
      invalidResponsePath: '/projects/spotify/categories',
      isValid: isSpotifyCategoryDetails,
      requestErrorPath: error => error.status === 0 || error.status >= 500
        ? '/projects'
        : '/projects/spotify/categories',
    },
  );
}

export async function genresLoader({ request }: SpotifyLoaderArgs) {
  const genres = await loadOrReplace<string[]>(
    '/api/spotify/genres',
    request.signal,
    {
      invalidResponsePath: '/projects',
      isValid: isSpotifyGenresResponse,
      requestErrorPath: '/projects',
    },
  );

  return { genres };
}

export async function artistLoader({ params, request }: SpotifyLoaderArgs) {
  const artistId = requireParam(params.artistId, '/projects');
  return loadOrReplace<SpotifyArtistDetailsData>(
    `/api/spotify/artists/${encodeURIComponent(artistId)}`,
    request.signal,
    {
      invalidResponsePath: '/projects',
      isValid: isSpotifyArtistDetails,
      requestErrorPath: '/projects',
    },
  );
}

export async function trackLoader({ params, request }: SpotifyLoaderArgs) {
  const trackId = requireParam(params.trackId, '/projects');
  const track = await loadOrReplace<SpotifyTrackDetails>(
    `/api/spotify/tracks/${encodeURIComponent(trackId)}`,
    request.signal,
    {
      invalidResponsePath: '/projects',
      isValid: isSpotifyTrackResponse,
      requestErrorPath: '/projects',
    },
  );

  return { track };
}

export async function playlistLoader({ params, request }: SpotifyLoaderArgs) {
  const playlistId = requireParam(params.playlistId, '/projects');
  const playlist = await loadOrReplace<SpotifyPlaylistDetails>(
    `/api/spotify/playlists/${encodeURIComponent(playlistId)}`,
    request.signal,
    {
      invalidResponsePath: '/projects',
      isValid: isSpotifyPlaylistResponse,
      requestErrorPath: '/projects',
    },
  );

  return { playlist, playlistId };
}

export async function userLoader({ params, request }: SpotifyLoaderArgs) {
  const userId = requireParam(params.userId, '/projects');
  const userDetails = await loadOrReplace<SpotifyUserDetailsData>(
    `/api/spotify/users/${encodeURIComponent(userId)}`,
    request.signal,
    {
      invalidResponsePath: '/projects',
      isValid: isSpotifyUserDetails,
      requestErrorPath: '/projects',
    },
  );

  return { ...userDetails, userId };
}

function requireParam(value: string | undefined, replacePath: string) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    replaceRoute(replacePath);
  }

  return normalizedValue;
}

async function loadOrReplace<T>(
  path: string,
  signal: AbortSignal,
  {
    invalidResponsePath,
    isValid,
    requestErrorPath,
  }: {
    invalidResponsePath: string;
    isValid: (value: unknown) => value is T;
    requestErrorPath: string | ((error: ApiClientError) => string);
  },
) {
  let response: unknown;
  try {
    response = await fetchJson<unknown>(path, { signal });
  } catch (error) {
    if (!(error instanceof ApiClientError)) {
      throw error;
    }

    replaceRoute(typeof requestErrorPath === 'function'
      ? requestErrorPath(error)
      : requestErrorPath);
  }

  if (!isValid(response)) {
    replaceRoute(invalidResponsePath);
  }

  return response;
}

function replaceRoute(path: string): never {
  // React Router replaces are intentionally thrown responses.
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw replace(path);
}
