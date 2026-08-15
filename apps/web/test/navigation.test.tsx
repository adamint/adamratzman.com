import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { type ComponentType } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import {
  Link,
  Outlet,
  type RouteObject,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from '../src/components/nav/Navbar';
import { ChakraRouterLink } from '../src/components/utils/ChakraRouterLink';
import { SpotifyCallbackIngestionTokenProducerComponent } from '../src/spotify-utils/auth/SpotifyCallbackIngestionTokenProducerComponent';
import { theme } from '../src/theme';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('navigation primitives', () => {
  it('uses React Router navigation for internal Chakra links', async () => {
    const user = userEvent.setup();

    const { router } = renderWithRouter([
      {
        path: '/',
        Component: () => (
          <ChakraProvider theme={theme}>
            <ChakraRouterLink href="/destination">Destination</ChakraRouterLink>
          </ChakraProvider>
        ),
      },
      {
        path: '/destination',
        Component: () => <h1>Destination page</h1>,
      },
    ]);

    await user.click(screen.getByRole('link', { name: 'Destination' }));

    expect(router.state.location.pathname).toBe('/destination');
    expect(await screen.findByRole('heading', { name: 'Destination page' })).toBeVisible();
  });

  it('renders protocol-relative Chakra links as normal anchors', () => {
    render(
      <ChakraProvider theme={theme}>
        <ChakraRouterLink href="//example.com/path" target="_blank">
          External destination
        </ChakraRouterLink>
      </ChakraProvider>,
    );

    expect(screen.getByRole('link', { name: 'External destination' })).toHaveAttribute(
      'href',
      '//example.com/path',
    );
    expect(screen.getByRole('link', { name: 'External destination' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: 'External destination' })).not.toHaveAttribute(
      'data-discover',
    );
  });

  it('gives the mobile menu control an accessible name', async () => {
    renderWithRouter([
      {
        path: '/',
        Component: () => (
          <ChakraProvider theme={theme}>
            <Navbar />
          </ChakraProvider>
        ),
      },
    ]);

    expect(await screen.findByRole('button', {
      name: 'Open navigation menu',
    })).toBeVisible();
  });

  it('sets the document title through PageTitle', async () => {
    const modulePath = '../src/components/meta/PageTitle.tsx';
    const { PageTitle } = await import(/* @vite-ignore */ modulePath) as {
      PageTitle: ComponentType<{ title: string }>;
    };

    render(
      <HelmetProvider>
        <PageTitle title="Contact Me" />
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.title).toBe('Contact Me | Adam Ratzman');
    });
  });

  it('focuses main content after pathname changes', async () => {
    const modulePath = '../src/components/routing/RouteFocusManager.tsx';
    const { RouteFocusManager } = await import(/* @vite-ignore */ modulePath) as {
      RouteFocusManager: ComponentType;
    };
    const user = userEvent.setup();

    function RoutedLayout() {
      return (
        <>
          <RouteFocusManager />
          <Link to="/second">Second page</Link>
          <main id="main-content" tabIndex={-1}>
            <Outlet />
          </main>
        </>
      );
    }

    renderWithRouter([
      {
        path: '/',
        Component: RoutedLayout,
        children: [
          { index: true, Component: () => <h1>First page</h1> },
          { path: 'second', Component: () => <h1>Second page</h1> },
        ],
      },
    ]);

    await user.click(screen.getByRole('link', { name: 'Second page' }));

    expect(await screen.findByRole('heading', { name: 'Second page' })).toBeVisible();
    await waitFor(() => {
      expect(document.querySelector('#main-content')).toHaveFocus();
    });
  });

  it('replaces the callback history entry after Spotify authentication', async () => {
    window.history.replaceState(
      {},
      '',
      '/projects/spotify/callback?code=callback-code',
    );
    localStorage.setItem('spotify_redirect_after_auth', '/contact');
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        access_token: 'access-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
        scope: 'user-top-read',
        token_type: 'Bearer',
      },
    });

    const setSpotifyTokenInfo = vi.fn();
    const routes: RouteObject[] = [
      { path: '/before', Component: () => <h1>Before callback</h1> },
      {
        path: '/projects/spotify/callback',
        Component: () => (
          <SpotifyCallbackIngestionTokenProducerComponent
            clientId="client-id"
            codeVerifier="code-verifier"
            redirectUri="https://example.com/projects/spotify/callback"
            setSpotifyTokenInfo={setSpotifyTokenInfo}
          />
        ),
      },
      { path: '/contact', Component: () => <h1>Contact page</h1> },
    ];
    const { router } = renderWithRouter(routes, {
      initialEntries: [
        '/before',
        '/projects/spotify/callback?code=callback-code',
      ],
      initialIndex: 1,
    });

    expect(await screen.findByRole('heading', { name: 'Contact page' })).toBeVisible();
    expect(router.state.historyAction).toBe('REPLACE');

    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole('heading', { name: 'Before callback' })).toBeVisible();
  });
});

describe('Next compatibility removal', () => {
  it('contains no Next imports, aliases, or compatibility directory', () => {
    const webRoot = `${process.cwd()}/`;
    const frameworkName = ['ne', 'xt'].join('');
    const compatibilityDirectory = `${webRoot}src/compat/${frameworkName}`;
    const importPattern = new RegExp(
      String.raw`(?:from\s+['"]${frameworkName}(?:/|['"])|import\(\s*['"]${frameworkName}(?:/|['"])|${frameworkName}/)`,
      'u',
    );
    const filesToScan = [
      ...collectSourceFiles(`${webRoot}src`),
      ...collectSourceFiles(`${webRoot}test`),
      `${webRoot}tsconfig.json`,
      `${webRoot}vite.config.ts`,
    ];
    const matches = filesToScan.flatMap((filePath) => {
      const relativePath = filePath.slice(webRoot.length);
      const lines = readFileSync(filePath, 'utf8').split('\n');

      return lines.flatMap((line, index) => (
        importPattern.test(line)
          ? [`${relativePath}:${index + 1}: ${line.trim()}`]
          : []
      ));
    });

    expect({
      compatibilityDirectoryExists: existsSync(compatibilityDirectory),
      matches,
    }).toEqual({
      compatibilityDirectoryExists: false,
      matches: [],
    });
  });
});

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }

    return /\.(?:[cm]?[jt]sx?|json)$/u.test(entry.name) ? [path] : [];
  });
}
