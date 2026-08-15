import { type ComponentType } from 'react';
import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from './AppShell';
import {
  loadSpotifyArtistRouteData,
  loadSpotifyCategoriesRouteData,
  loadSpotifyCategoryRouteData,
  loadSpotifyGenreListRouteData,
  loadSpotifyPlaylistRouteData,
  loadSpotifyTrackRouteData,
  loadSpotifyUserRouteData,
} from './api/spotifyLoaders';

type LazyPageModule = {
  default: ComponentType;
};

type AppRouteSpec = Omit<RouteObject, 'children' | 'index' | 'path'> & {
  publicPath: string;
};

function lazyPage(loadPage: () => Promise<LazyPageModule>) {
  return async () => {
    const module = await loadPage();

    return {
      Component: module.default,
    };
  };
}

function createChildRoute({
  publicPath,
  ...route
}: AppRouteSpec): RouteObject {
  if (publicPath === '/') {
    return {
      ...route,
      index: true,
    } as RouteObject;
  }

  return {
    ...route,
    path: publicPath === '*' ? '*' : publicPath.slice(1),
  } as RouteObject;
}

const appRouteSpecs: AppRouteSpec[] = [
  { publicPath: '/', lazy: lazyPage(() => import('./pages/index')) },
  { publicPath: '/academics', lazy: lazyPage(() => import('./pages/academics')) },
  { publicPath: '/academics/bachelors', lazy: lazyPage(() => import('./pages/academics/bachelors')) },
  { publicPath: '/academics/masters', lazy: lazyPage(() => import('./pages/academics/masters')) },
  { publicPath: '/academics/mba', lazy: lazyPage(() => import('./pages/academics/mba')) },
  { publicPath: '/contact', lazy: lazyPage(() => import('./pages/contact')) },
  { publicPath: '/portfolio', lazy: lazyPage(() => import('./pages/portfolio')) },
  { publicPath: '/projects', lazy: lazyPage(() => import('./pages/projects')) },
  { publicPath: '/projects/calculator', lazy: lazyPage(() => import('./pages/projects/calculator')) },
  { publicPath: '/projects/character-counter', lazy: lazyPage(() => import('./pages/projects/character-counter')) },
  { publicPath: '/projects/conversion/base-converter', lazy: lazyPage(() => import('./pages/projects/conversion/base-converter')) },
  { publicPath: '/projects/spotify', element: <Navigate replace to="/projects" /> },
  {
    publicPath: '/projects/spotify/artists/:artistId',
    loader: loadSpotifyArtistRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/artists/[artistId]')),
  },
  { publicPath: '/projects/spotify/callback', lazy: lazyPage(() => import('./pages/projects/spotify/callback')) },
  {
    publicPath: '/projects/spotify/categories',
    loader: loadSpotifyCategoriesRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/categories')),
  },
  {
    publicPath: '/projects/spotify/categories/:categoryId',
    loader: loadSpotifyCategoryRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/categories/[categoryId]')),
  },
  { publicPath: '/projects/spotify/generate-token', lazy: lazyPage(() => import('./pages/projects/spotify/generate-token')) },
  {
    publicPath: '/projects/spotify/genres/list',
    loader: loadSpotifyGenreListRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/genres/list')),
  },
  { publicPath: '/projects/spotify/mytop', lazy: lazyPage(() => import('./pages/projects/spotify/mytop')) },
  {
    publicPath: '/projects/spotify/playlists/:playlistId',
    loader: loadSpotifyPlaylistRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/playlists/[playlistId]')),
  },
  { publicPath: '/projects/spotify/recommend', lazy: lazyPage(() => import('./pages/projects/spotify/recommend')) },
  {
    publicPath: '/projects/spotify/recommend/create-playlist',
    lazy: lazyPage(() => import('./pages/projects/spotify/recommend/create-playlist')),
  },
  {
    publicPath: '/projects/spotify/tracks/:trackId',
    loader: loadSpotifyTrackRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/tracks/[trackId]')),
  },
  {
    publicPath: '/projects/spotify/users/:userId',
    loader: loadSpotifyUserRouteData,
    lazy: lazyPage(() => import('./pages/projects/spotify/users/[userId]')),
  },
  { publicPath: '*', lazy: lazyPage(() => import('./pages/404')) },
];

export function RouterLoadingFallback() {
  return (
    <div
      role="status"
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      Loading…
    </div>
  );
}

export function RootRouteErrorBoundary() {
  return (
    <main
      style={{
        margin: '4rem auto',
        maxWidth: '48rem',
        padding: '0 1.5rem',
      }}
    >
      <h1>Sorry, this page could not be loaded.</h1>
      <p>Please try again, or return to the home page.</p>
      <a href="/">Return home</a>
    </main>
  );
}

export const routePaths = appRouteSpecs.map(({ publicPath }) => publicPath);

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: AppShell,
    ErrorBoundary: RootRouteErrorBoundary,
    HydrateFallback: RouterLoadingFallback,
    children: appRouteSpecs.map(createChildRoute),
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
