import type {
  SpotifyArtistDetails,
  SpotifyCategoryDetails,
  SpotifyUserDetails,
} from '@adamratzman/contracts';
import {
  redirect,
  type LoaderFunctionArgs,
} from 'react-router-dom';
import { fetchJson } from './client';

const projectsPath = '/projects';
const spotifyCategoriesPath = '/projects/spotify/categories';

function requireRouteParam(
  params: LoaderFunctionArgs['params'],
  paramName: string,
  destination: string,
) {
  const value = params[paramName];
  return value ? encodeURIComponent(value) : redirect(destination);
}

async function fetchJsonOrRedirect<T>(path: string, destination: string) {
  try {
    return await fetchJson<T>(path);
  } catch {
    return redirect(destination);
  }
}

export async function loadSpotifyArtistRouteData({
  params,
}: LoaderFunctionArgs): Promise<SpotifyArtistDetails | Response> {
  const artistId = requireRouteParam(params, 'artistId', projectsPath);
  if (artistId instanceof Response) {
    return artistId;
  }

  return fetchJsonOrRedirect<SpotifyArtistDetails>(
    `/api/spotify/artists/${artistId}`,
    projectsPath,
  );
}

export async function loadSpotifyCategoriesRouteData(): Promise<
  { categories: SpotifyApi.CategoryObject[] } | Response
> {
  const categories = await fetchJsonOrRedirect<SpotifyApi.CategoryObject[]>(
    '/api/spotify/categories',
    projectsPath,
  );

  return categories instanceof Response ? categories : { categories };
}

export async function loadSpotifyCategoryRouteData({
  params,
}: LoaderFunctionArgs): Promise<SpotifyCategoryDetails | Response> {
  const categoryId = requireRouteParam(params, 'categoryId', spotifyCategoriesPath);
  if (categoryId instanceof Response) {
    return categoryId;
  }

  return fetchJsonOrRedirect<SpotifyCategoryDetails>(
    `/api/spotify/categories/${categoryId}`,
    spotifyCategoriesPath,
  );
}

export async function loadSpotifyGenreListRouteData(): Promise<
  { genres: string[] } | Response
> {
  const genres = await fetchJsonOrRedirect<string[]>(
    '/api/spotify/genres',
    projectsPath,
  );

  return genres instanceof Response ? genres : { genres };
}

export async function loadSpotifyPlaylistRouteData({
  params,
}: LoaderFunctionArgs): Promise<{ playlist: SpotifyApi.PlaylistObjectFull } | Response> {
  const playlistId = requireRouteParam(params, 'playlistId', projectsPath);
  if (playlistId instanceof Response) {
    return playlistId;
  }

  const playlist = await fetchJsonOrRedirect<SpotifyApi.PlaylistObjectFull>(
    `/api/spotify/playlists/${playlistId}`,
    projectsPath,
  );

  return playlist instanceof Response ? playlist : { playlist };
}

export async function loadSpotifyTrackRouteData({
  params,
}: LoaderFunctionArgs): Promise<{ track: SpotifyApi.SingleTrackResponse } | Response> {
  const trackId = requireRouteParam(params, 'trackId', projectsPath);
  if (trackId instanceof Response) {
    return trackId;
  }

  const track = await fetchJsonOrRedirect<SpotifyApi.SingleTrackResponse>(
    `/api/spotify/tracks/${trackId}`,
    projectsPath,
  );

  return track instanceof Response ? track : { track };
}

export async function loadSpotifyUserRouteData({
  params,
}: LoaderFunctionArgs): Promise<SpotifyUserDetails | Response> {
  const userId = requireRouteParam(params, 'userId', projectsPath);
  if (userId instanceof Response) {
    return userId;
  }

  return fetchJsonOrRedirect<SpotifyUserDetails>(
    `/api/spotify/users/${userId}`,
    projectsPath,
  );
}
