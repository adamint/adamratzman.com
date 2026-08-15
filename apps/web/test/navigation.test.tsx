import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  fireEvent,
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
  vi.unstubAllGlobals();
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

  it('renders mobile internal navigation as real links and preserves modifier clicks', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter([
      {
        path: '/',
        Component: () => (
          <ChakraProvider theme={theme}>
            <Navbar />
          </ChakraProvider>
        ),
      },
      {
        path: '/projects',
        Component: () => <h1>Projects page</h1>,
      },
    ]);

    await user.click(await screen.findByRole('button', {
      name: 'Open navigation menu',
    }));
    const projectsLink = screen.getByRole('menuitem', {
      name: 'Online Projects',
    });

    expect(projectsLink).toHaveProperty('tagName', 'A');
    expect(projectsLink).toHaveAttribute('href', '/projects');

    projectsLink.addEventListener('click', event => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(projectsLink, { ctrlKey: true });

    expect(router.state.location.pathname).toBe('/');
  });

  it('closes the mobile menu and navigates when a link is activated with the keyboard', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter([
      {
        path: '/',
        Component: () => (
          <ChakraProvider theme={theme}>
            <Navbar />
          </ChakraProvider>
        ),
      },
      {
        path: '/projects',
        Component: () => (
          <ChakraProvider theme={theme}>
            <Navbar />
            <h1>Projects page</h1>
          </ChakraProvider>
        ),
      },
    ]);

    await user.click(await screen.findByRole('button', {
      name: 'Open navigation menu',
    }));
    const projectsLink = screen.getByRole('menuitem', {
      name: 'Online Projects',
    });
    projectsLink.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Projects page' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/projects');
    expect(screen.getByRole('button', {
      name: 'Open navigation menu',
    })).toBeVisible();
  });

  it('uses exact active matching for mobile internal navigation', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter([
      {
        path: '*',
        Component: () => (
          <ChakraProvider theme={theme}>
            <Navbar />
          </ChakraProvider>
        ),
      },
    ], {
      initialEntries: ['/projects'],
    });

    await user.click(await screen.findByRole('button', {
      name: 'Open navigation menu',
    }));
    expect(screen.getByRole('menuitem', {
      name: 'Online Projects',
    })).toHaveAttribute('aria-current', 'page');

    await act(async () => {
      await router.navigate('/projects/calculator');
    });

    expect(screen.getByRole('menuitem', {
      name: 'Online Projects',
    })).not.toHaveAttribute('aria-current');
  });

  it('uses exact active matching for desktop internal navigation', async () => {
    vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: query.includes('min-width: 48em'),
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }));

    const { router } = renderWithRouter([
      {
        path: '*',
        Component: () => (
          <ChakraProvider theme={theme}>
            <Navbar />
          </ChakraProvider>
        ),
      },
    ], {
      initialEntries: ['/projects'],
    });

    expect(await screen.findByRole('link', {
      name: 'Online Projects',
    })).toHaveAttribute('aria-current', 'page');

    await act(async () => {
      await router.navigate('/projects/calculator');
    });

    expect(screen.getByRole('link', {
      name: 'Online Projects',
    })).not.toHaveAttribute('aria-current');
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

  it('does not focus main content on initial render', async () => {
    const modulePath = '../src/components/routing/RouteFocusManager.tsx';
    const { RouteFocusManager } = await import(/* @vite-ignore */ modulePath) as {
      RouteFocusManager: ComponentType;
    };

    renderWithRouter([
      {
        path: '/',
        Component: () => (
          <>
            <RouteFocusManager />
            <main id="main-content" tabIndex={-1}>
              Initial page
            </main>
          </>
        ),
      },
    ]);

    expect(document.querySelector('#main-content')).not.toHaveFocus();
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

  it('does not focus main content after search-only or hash-only changes', async () => {
    const modulePath = '../src/components/routing/RouteFocusManager.tsx';
    const { RouteFocusManager } = await import(/* @vite-ignore */ modulePath) as {
      RouteFocusManager: ComponentType;
    };

    function RoutedLayout() {
      return (
        <>
          <RouteFocusManager />
          <button type="button">Focus sentinel</button>
          <main id="main-content" tabIndex={-1}>
            Route content
          </main>
        </>
      );
    }

    const { router } = renderWithRouter([
      {
        path: '/',
        Component: RoutedLayout,
      },
    ], {
      initialEntries: ['/?view=first#top'],
    });
    const focusSentinel = screen.getByRole('button', {
      name: 'Focus sentinel',
    });
    focusSentinel.focus();

    await act(async () => {
      await router.navigate('/?view=second#top');
    });
    expect(focusSentinel).toHaveFocus();

    await act(async () => {
      await router.navigate('/?view=second#bottom');
    });
    expect(focusSentinel).toHaveFocus();
  });

  it('replaces the callback history entry after Spotify authentication', async () => {
    localStorage.setItem(
      'spotify_redirect_after_auth',
      '/contact?from=spotify#complete',
    );
    const postSpy = mockSpotifyTokenExchange();
    const { router } = renderSpotifyCallback({
      initialEntries: [
        '/before',
        '/projects/spotify/callback?code=callback-code',
      ],
      initialIndex: 1,
    });

    expect(await screen.findByRole('heading', { name: 'Contact page' })).toBeVisible();
    expect(router.state.location).toMatchObject({
      pathname: '/contact',
      search: '?from=spotify',
      hash: '#complete',
    });
    expect(router.state.historyAction).toBe('REPLACE');
    expect(postSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole('heading', { name: 'Before callback' })).toBeVisible();
  });

  it('processes a new callback code after a same-pathname search change once', async () => {
    localStorage.setItem(
      'spotify_pkce_callback_code',
      JSON.stringify('previous-code'),
    );
    const postSpy = mockSpotifyTokenExchange();
    const { router } = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=previous-code',
      ],
    });

    await waitFor(() => {
      expect(postSpy).not.toHaveBeenCalled();
    });

    await act(async () => {
      await router.navigate('/projects/spotify/callback?code=new-code');
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(postSpy).toHaveBeenCalledTimes(1);
    const requestParams = postSpy.mock.calls[0]?.[1] as URLSearchParams;
    expect(requestParams.get('code')).toBe('new-code');
  });

  it.each([
    '//example.com/steal',
    'https://example.com/steal',
    'contact',
  ])('rejects unsafe stored Spotify redirect %s', async (storedRedirect) => {
    localStorage.setItem('spotify_redirect_after_auth', storedRedirect);
    mockSpotifyTokenExchange();
    const { router } = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code',
      ],
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(router.state.location).toMatchObject({
      pathname: '/projects/spotify',
      search: '',
      hash: '',
    });
    expect(router.state.historyAction).toBe('REPLACE');
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

function mockSpotifyTokenExchange() {
  return vi.spyOn(axios, 'post').mockResolvedValue({
    data: {
      access_token: 'access-token',
      expires_in: 3600,
      refresh_token: 'refresh-token',
      scope: 'user-top-read',
      token_type: 'Bearer',
    },
  });
}

function renderSpotifyCallback({
  initialEntries,
  initialIndex = 0,
}: {
  initialEntries: string[];
  initialIndex?: number;
}) {
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
    {
      path: '/projects/spotify',
      Component: () => <h1>Spotify projects</h1>,
    },
  ];

  return renderWithRouter(routes, {
    initialEntries,
    initialIndex,
  });
}
