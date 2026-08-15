import type { SpotifyArtistDetails, SpotifyCategoryDetails, SpotifyUserDetails } from '@adamratzman/contracts';
import { type ComponentType } from 'react';
import {
  Navigate,
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs,
  type RouteObject,
  useLoaderData,
} from 'react-router-dom';
import { AppShell } from './AppShell';

type LazyPageModule<TProps = Record<string, never>> = {
  default: ComponentType<TProps>;
};

type AppChildRoute = {
  fullPath: string;
  route: RouteObject;
};

const jsonRequestInit = {
  headers: {
    accept: 'application/json',
  },
} as const;

function createLoaderDataComponent<TProps extends Record<string, unknown>>(Page: ComponentType<TProps>) {
  return function LoaderDataPage() {
    const data = useLoaderData() as TProps;
    return <Page {...data} />;
  };
}

function lazyPage(loadPage: () => Promise<LazyPageModule>) {
  return async () => {
    const module = await loadPage();

    return {
      Component: module.default,
    };
  };
}

function lazyLoaderPage<TProps extends Record<string, unknown>>(
  loadPage: () => Promise<LazyPageModule<TProps>>,
) {
  return async () => {
    const module = await loadPage();

    return {
      Component: createLoaderDataComponent(module.default),
    };
  };
}

async function fetchRouteJson<T>(path: string): Promise<T> {
  const response = await fetch(path, jsonRequestInit);

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function fetchRouteJsonOrRedirect<T>(
  path: string,
  destination: string,
): Promise<T | Response> {
  try {
    return await fetchRouteJson<T>(path);
  } catch {
    return redirect(destination);
  }
}

function requireRouteParam(
  params: LoaderFunctionArgs['params'],
  paramName: string,
  destination: string,
) {
  const value = params[paramName];

  if (!value) {
    return redirect(destination);
  }

  return encodeURIComponent(value);
}

export async function loadSpotifyArtistRouteData({
  params,
}: LoaderFunctionArgs): Promise<SpotifyArtistDetails | Response> {
  const artistId = requireRouteParam(params, 'artistId', '/projects/spotify');
  if (artistId instanceof Response) {
    return artistId;
  }

  return fetchRouteJsonOrRedirect<SpotifyArtistDetails>(
    `/api/spotify/artists/${artistId}`,
    '/projects/spotify',
  );
}

export async function loadSpotifyCategoriesRouteData(): Promise<{ categories: SpotifyApi.CategoryObject[] }> {
  return {
    categories: await fetchRouteJson<SpotifyApi.CategoryObject[]>('/api/spotify/categories'),
  };
}

export async function loadSpotifyCategoryRouteData({
  params,
}: LoaderFunctionArgs): Promise<SpotifyCategoryDetails | Response> {
  const categoryId = requireRouteParam(params, 'categoryId', '/projects/spotify/categories');
  if (categoryId instanceof Response) {
    return categoryId;
  }

  return fetchRouteJsonOrRedirect<SpotifyCategoryDetails>(
    `/api/spotify/categories/${categoryId}`,
    '/projects/spotify/categories',
  );
}

export async function loadSpotifyGenreListRouteData(): Promise<{ genres: string[] }> {
  return {
    genres: await fetchRouteJson<string[]>('/api/spotify/genres'),
  };
}

export async function loadSpotifyPlaylistRouteData({
  params,
}: LoaderFunctionArgs): Promise<{ playlist: SpotifyApi.PlaylistObjectFull } | Response> {
  const playlistId = requireRouteParam(params, 'playlistId', '/projects/spotify');
  if (playlistId instanceof Response) {
    return playlistId;
  }

  const playlist = await fetchRouteJsonOrRedirect<SpotifyApi.PlaylistObjectFull>(
    `/api/spotify/playlists/${playlistId}`,
    '/projects/spotify',
  );
  if (playlist instanceof Response) {
    return playlist;
  }

  return { playlist };
}

export async function loadSpotifyTrackRouteData({
  params,
}: LoaderFunctionArgs): Promise<{ track: SpotifyApi.SingleTrackResponse } | Response> {
  const trackId = requireRouteParam(params, 'trackId', '/projects/spotify');
  if (trackId instanceof Response) {
    return trackId;
  }

  const track = await fetchRouteJsonOrRedirect<SpotifyApi.SingleTrackResponse>(
    `/api/spotify/tracks/${trackId}`,
    '/projects/spotify',
  );
  if (track instanceof Response) {
    return track;
  }

  return { track };
}

export async function loadSpotifyUserRouteData({
  params,
}: LoaderFunctionArgs): Promise<SpotifyUserDetails | Response> {
  const userId = requireRouteParam(params, 'userId', '/projects/spotify');
  if (userId instanceof Response) {
    return userId;
  }

  return fetchRouteJsonOrRedirect<SpotifyUserDetails>(
    `/api/spotify/users/${userId}`,
    '/projects/spotify',
  );
}

const appChildRoutes: AppChildRoute[] = [
  {
    fullPath: '/',
    route: { index: true, lazy: lazyPage(() => import('./pages/index')) },
  },
  {
    fullPath: '/academics',
    route: { path: 'academics', lazy: lazyPage(() => import('./pages/academics')) },
  },
  {
    fullPath: '/academics/bachelors',
    route: { path: 'academics/bachelors', lazy: lazyPage(() => import('./pages/academics/bachelors')) },
  },
  {
    fullPath: '/academics/masters',
    route: { path: 'academics/masters', lazy: lazyPage(() => import('./pages/academics/masters')) },
  },
  {
    fullPath: '/academics/mba',
    route: { path: 'academics/mba', lazy: lazyPage(() => import('./pages/academics/mba')) },
  },
  {
    fullPath: '/contact',
    route: { path: 'contact', lazy: lazyPage(() => import('./pages/contact')) },
  },
  {
    fullPath: '/portfolio',
    route: { path: 'portfolio', lazy: lazyPage(() => import('./pages/portfolio')) },
  },
  {
    fullPath: '/projects',
    route: { path: 'projects', lazy: lazyPage(() => import('./pages/projects')) },
  },
  {
    fullPath: '/projects/calculator',
    route: { path: 'projects/calculator', lazy: lazyPage(() => import('./pages/projects/calculator')) },
  },
  {
    fullPath: '/projects/character-counter',
    route: { path: 'projects/character-counter', lazy: lazyPage(() => import('./pages/projects/character-counter')) },
  },
  {
    fullPath: '/projects/conversion/base-converter',
    route: { path: 'projects/conversion/base-converter', lazy: lazyPage(() => import('./pages/projects/conversion/base-converter')) },
  },
  {
    fullPath: '/projects/spotify',
    route: { path: 'projects/spotify', element: <Navigate replace to="/projects" /> },
  },
  {
    fullPath: '/projects/spotify/artists/:artistId',
    route: {
      path: 'projects/spotify/artists/:artistId',
      loader: loadSpotifyArtistRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/artists/[artistId]')),
    },
  },
  {
    fullPath: '/projects/spotify/callback',
    route: { path: 'projects/spotify/callback', lazy: lazyPage(() => import('./pages/projects/spotify/callback')) },
  },
  {
    fullPath: '/projects/spotify/categories',
    route: {
      path: 'projects/spotify/categories',
      loader: loadSpotifyCategoriesRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/categories')),
    },
  },
  {
    fullPath: '/projects/spotify/categories/:categoryId',
    route: {
      path: 'projects/spotify/categories/:categoryId',
      loader: loadSpotifyCategoryRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/categories/[categoryId]')),
    },
  },
  {
    fullPath: '/projects/spotify/generate-token',
    route: { path: 'projects/spotify/generate-token', lazy: lazyPage(() => import('./pages/projects/spotify/generate-token')) },
  },
  {
    fullPath: '/projects/spotify/genres/list',
    route: {
      path: 'projects/spotify/genres/list',
      loader: loadSpotifyGenreListRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/genres/list')),
    },
  },
  {
    fullPath: '/projects/spotify/mytop',
    route: { path: 'projects/spotify/mytop', lazy: lazyPage(() => import('./pages/projects/spotify/mytop')) },
  },
  {
    fullPath: '/projects/spotify/playlists/:playlistId',
    route: {
      path: 'projects/spotify/playlists/:playlistId',
      loader: loadSpotifyPlaylistRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/playlists/[playlistId]')),
    },
  },
  {
    fullPath: '/projects/spotify/recommend',
    route: { path: 'projects/spotify/recommend', lazy: lazyPage(() => import('./pages/projects/spotify/recommend')) },
  },
  {
    fullPath: '/projects/spotify/recommend/create-playlist',
    route: {
      path: 'projects/spotify/recommend/create-playlist',
      lazy: lazyPage(() => import('./pages/projects/spotify/recommend/create-playlist')),
    },
  },
  {
    fullPath: '/projects/spotify/tracks/:trackId',
    route: {
      path: 'projects/spotify/tracks/:trackId',
      loader: loadSpotifyTrackRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/tracks/[trackId]')),
    },
  },
  {
    fullPath: '/projects/spotify/users/:userId',
    route: {
      path: 'projects/spotify/users/:userId',
      loader: loadSpotifyUserRouteData,
      lazy: lazyLoaderPage(() => import('./pages/projects/spotify/users/[userId]')),
    },
  },
  {
    fullPath: '*',
    route: { path: '*', lazy: lazyPage(() => import('./pages/404')) },
  },
];

export const routePaths = appChildRoutes.map(({ fullPath }) => fullPath);

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppShell,
    children: appChildRoutes.map(({ route }) => route),
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
