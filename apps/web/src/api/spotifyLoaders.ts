import type {
  SpotifyArtistDetails,
  SpotifyCategoryDetails,
  SpotifyUserDetails,
} from '@adamratzman/contracts';
import { redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { fetchJson } from './client';

type SpotifyLoaderArgs = Pick<LoaderFunctionArgs, 'params'>;

export async function categoriesLoader() {
  const categories = await loadOrRedirect<SpotifyApi.CategoryObject[]>(
    '/api/spotify/categories',
    '/projects',
  );

  return { categories };
}

export async function categoryLoader({ params }: SpotifyLoaderArgs) {
  const categoryId = requireParam(params.categoryId, '/projects/spotify/categories');
  return loadOrRedirect<SpotifyCategoryDetails>(
    `/api/spotify/categories/${encodeURIComponent(categoryId)}`,
    '/projects/spotify/categories',
  );
}

export async function genresLoader() {
  const genres = await loadOrRedirect<string[]>(
    '/api/spotify/genres',
    '/projects',
  );

  return { genres };
}

export async function artistLoader({ params }: SpotifyLoaderArgs) {
  const artistId = requireParam(params.artistId, '/projects');
  return loadOrRedirect<SpotifyArtistDetails>(
    `/api/spotify/artists/${encodeURIComponent(artistId)}`,
    '/projects',
  );
}

export async function trackLoader({ params }: SpotifyLoaderArgs) {
  const trackId = requireParam(params.trackId, '/projects');
  const track = await loadOrRedirect<SpotifyApi.SingleTrackResponse>(
    `/api/spotify/tracks/${encodeURIComponent(trackId)}`,
    '/projects',
  );

  return { track };
}

export async function playlistLoader({ params }: SpotifyLoaderArgs) {
  const playlistId = requireParam(params.playlistId, '/projects');
  const playlist = await loadOrRedirect<SpotifyApi.SinglePlaylistResponse>(
    `/api/spotify/playlists/${encodeURIComponent(playlistId)}`,
    '/projects',
  );

  return { playlist };
}

export async function userLoader({ params }: SpotifyLoaderArgs) {
  const userId = requireParam(params.userId, '/projects');
  return loadOrRedirect<SpotifyUserDetails>(
    `/api/spotify/users/${encodeURIComponent(userId)}`,
    '/projects',
  );
}

function requireParam(value: string | undefined, redirectPath: string) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    // React Router redirects are intentionally thrown responses.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect(redirectPath);
  }

  return normalizedValue;
}

async function loadOrRedirect<T>(path: string, redirectPath: string) {
  try {
    return await fetchJson<T>(path);
  } catch {
    // React Router redirects are intentionally thrown responses.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect(redirectPath);
  }
}
