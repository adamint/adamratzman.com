import { type ComponentType } from 'react';
import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from './AppShell';
import {
  artistLoader,
  categoriesLoader,
  categoryLoader,
  genresLoader,
  playlistLoader,
  trackLoader,
  userLoader,
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
  { publicPath: '/', lazy: lazyPage(() => import('./routes/index')) },
  { publicPath: '/academics', lazy: lazyPage(() => import('./routes/academics')) },
  { publicPath: '/academics/bachelors', lazy: lazyPage(() => import('./routes/academics/bachelors')) },
  { publicPath: '/academics/masters', lazy: lazyPage(() => import('./routes/academics/masters')) },
  { publicPath: '/academics/mba', lazy: lazyPage(() => import('./routes/academics/mba')) },
  { publicPath: '/contact', lazy: lazyPage(() => import('./routes/contact')) },
  { publicPath: '/portfolio', lazy: lazyPage(() => import('./routes/portfolio')) },
  { publicPath: '/projects', lazy: lazyPage(() => import('./routes/projects')) },
  { publicPath: '/projects/calculator', lazy: lazyPage(() => import('./routes/projects/calculator')) },
  { publicPath: '/projects/character-counter', lazy: lazyPage(() => import('./routes/projects/character-counter')) },
  { publicPath: '/projects/conversion/base-converter', lazy: lazyPage(() => import('./routes/projects/conversion/base-converter')) },
  { publicPath: '/projects/spotify', element: <Navigate replace to="/projects" /> },
  {
    publicPath: '/projects/spotify/artists/:artistId',
    loader: artistLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/artists/[artistId]')),
  },
  { publicPath: '/projects/spotify/callback', lazy: lazyPage(() => import('./routes/projects/spotify/callback')) },
  {
    publicPath: '/projects/spotify/categories',
    loader: categoriesLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/categories')),
  },
  {
    publicPath: '/projects/spotify/categories/:categoryId',
    loader: categoryLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/categories/[categoryId]')),
  },
  { publicPath: '/projects/spotify/generate-token', lazy: lazyPage(() => import('./routes/projects/spotify/generate-token')) },
  {
    publicPath: '/projects/spotify/genres/list',
    loader: genresLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/genres/list')),
  },
  { publicPath: '/projects/spotify/mytop', lazy: lazyPage(() => import('./routes/projects/spotify/mytop')) },
  {
    publicPath: '/projects/spotify/playlists/:playlistId',
    loader: playlistLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/playlists/[playlistId]')),
  },
  { publicPath: '/projects/spotify/recommend', lazy: lazyPage(() => import('./routes/projects/spotify/recommend')) },
  {
    publicPath: '/projects/spotify/recommend/create-playlist',
    lazy: lazyPage(() => import('./routes/projects/spotify/recommend/create-playlist')),
  },
  {
    publicPath: '/projects/spotify/tracks/:trackId',
    loader: trackLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/tracks/[trackId]')),
  },
  {
    publicPath: '/projects/spotify/users/:userId',
    loader: userLoader,
    lazy: lazyPage(() => import('./routes/projects/spotify/users/[userId]')),
  },
  { publicPath: '*', lazy: lazyPage(() => import('./routes/404')) },
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
