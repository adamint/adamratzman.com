import { cleanup, screen, waitFor } from '@testing-library/react';
import { type ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../src/AppShell';
import {
  RootRouteErrorBoundary,
  routePaths,
  routes,
} from '../src/router';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  });
}

describe('route table', () => {
  it('preserves the exact public path order', () => {
    expect(routePaths).toEqual([
      '/',
      '/academics',
      '/academics/bachelors',
      '/academics/masters',
      '/academics/mba',
      '/contact',
      '/portfolio',
      '/projects',
      '/projects/calculator',
      '/projects/character-counter',
      '/projects/conversion/base-converter',
      '/projects/spotify',
      '/projects/spotify/artists/:artistId',
      '/projects/spotify/callback',
      '/projects/spotify/categories',
      '/projects/spotify/categories/:categoryId',
      '/projects/spotify/generate-token',
      '/projects/spotify/genres/list',
      '/projects/spotify/mytop',
      '/projects/spotify/playlists/:playlistId',
      '/projects/spotify/recommend',
      '/projects/spotify/recommend/create-playlist',
      '/projects/spotify/tracks/:trackId',
      '/projects/spotify/users/:userId',
      '*',
    ]);
  });
});

describe('memory router integration', () => {
  it('renders a static route inside AppShell', async () => {
    renderWithRouter(routes, {
      initialEntries: ['/projects/character-counter'],
    });

    expect(await screen.findByRole('heading', {
      name: 'Character Counter',
    })).toBeVisible();
    expect(document.querySelector('#main-content')).toBeInTheDocument();
    expect(screen.getByText('Adam Ratzman - © 2021')).toBeVisible();
  });

  it('follows the Spotify root redirect', async () => {
    const { router } = renderWithRouter(routes, {
      initialEntries: ['/projects/spotify'],
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
    });
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  it('renders the not-found route inside AppShell', async () => {
    renderWithRouter(routes, { initialEntries: ['/does-not-exist'] });

    expect(await screen.findByRole('heading', {
      name: /that page wasn't found/i,
    })).toBeVisible();
    expect(document.querySelector('#main-content')).toBeInTheDocument();
  });

  it('renders loader data returned by a Spotify route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([
      {
        id: 'focus',
        icons: [{ url: 'https://example.com/focus.png' }],
        name: 'Focus',
      },
    ])));

    renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/categories'],
    });

    expect(await screen.findByRole('heading', { name: 'Focus' })).toBeVisible();
  });

  it('redirects safely when a Spotify loader fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('internal API detail', { status: 503 }),
    ));

    const { router } = renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/categories'],
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects');
    });
    expect(screen.queryByText(/internal API detail/i)).not.toBeInTheDocument();
  });

  it('shows a visible fallback while an initial lazy route loads', async () => {
    let resolvePage: ((module: { Component: ComponentType }) => void) | undefined;
    const lazyPage = new Promise<{ Component: ComponentType }>((resolve) => {
      resolvePage = resolve;
    });

    renderWithRouter([
      {
        path: '/',
        children: [
          {
            index: true,
            lazy: () => lazyPage,
          },
        ],
      },
    ]);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');

    resolvePage?.({ Component: () => <h1>Lazy route loaded</h1> });

    expect(await screen.findByRole('heading', { name: 'Lazy route loaded' })).toBeVisible();
  });

  it('replaces raw router failures with a user-safe root error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderWithRouter([
      {
        path: '/',
        Component: AppShell,
        ErrorBoundary: RootRouteErrorBoundary,
        children: [
          {
            path: 'broken',
            loader: () => {
              throw new Error('GET https://internal.example/api failed with status 500');
            },
            Component: () => <div>unreachable</div>,
          },
        ],
      },
    ], {
      initialEntries: ['/broken'],
    });

    expect(await screen.findByRole('heading', {
      name: 'Sorry, this page could not be loaded.',
    })).toBeVisible();
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal\.example|status 500/i)).not.toBeInTheDocument();
  });
});
