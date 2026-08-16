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
import { spotifyAuthStorageKeys } from '../src/spotify-utils/auth/SpotifyAuthUtils';
import { SpotifyCallbackIngestionTokenProducerComponent } from '../src/spotify-utils/auth/SpotifyCallbackIngestionTokenProducerComponent';
import { SpotifyLoginButton } from '../src/spotify-utils/auth/SpotifyLoginButton';
import { SpotifyLogoutButton } from '../src/spotify-utils/auth/SpotifyLogoutButton';
import * as SpotifyRedirectModule from '../src/spotify-utils/auth/RedirectToSpotifyLogin';
import { theme } from '../src/theme';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function PersistentNavbarLayout() {
  return (
    <ChakraProvider theme={theme}>
      <Navbar />
      <Outlet />
    </ChakraProvider>
  );
}

describe('navigation primitives', () => {
  it('uses an explicit AA foreground on Spotify authentication buttons', () => {
    localStorage.setItem('chakra-ui-color-mode', 'dark');

    render(
      <ChakraProvider theme={theme}>
        <SpotifyLoginButton
          scopes={['user-top-read']}
          clientId="client-id"
          redirectUri="https://example.com/projects/spotify/callback"
          setCodeVerifier={vi.fn()}
          redirectPathAfter="/projects/spotify/mytop"
        />
        <SpotifyLogoutButton setSpotifyTokenInfo={vi.fn()} />
      </ChakraProvider>,
    );

    for (const button of screen.getAllByRole('button')) {
      const generatedClass = button.className.split(' ').at(-1);
      const baseRules = Array.from(document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules))
        .filter(rule => (
          (rule as CSSStyleRule).selectorText === `.${generatedClass}`
        )) as CSSStyleRule[];

      expect(baseRules.some(rule => (
        rule.style.color === 'var(--chakra-colors-gray-900)'
      ))).toBe(true);

      const stateRules = Array.from(document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules))
        .filter(rule => (
          (rule as CSSStyleRule).selectorText?.includes(`.${generatedClass}:`)
        )) as CSSStyleRule[];
      expect(stateRules.some(rule => (
        rule.selectorText.includes(':hover')
        && hasCssColor(rule, '#1ed760', 'rgb(30, 215, 96)')
      ))).toBe(true);
      expect(stateRules.some(rule => (
        rule.selectorText.includes(':active')
        && hasCssColor(rule, '#169b45', 'rgb(22, 155, 69)')
      ))).toBe(true);
    }
  });

  it('uses the Spotify login title as the route h1', () => {
    renderWithRouter([{
      path: '/',
      Component: () => (
        <ChakraProvider theme={theme}>
          <SpotifyLoginButton
            scopes={['user-top-read']}
            clientId="client-id"
            redirectUri="https://example.com/projects/spotify/callback"
            setCodeVerifier={vi.fn()}
            redirectPathAfter="/projects/spotify/mytop"
            title="View your Spotify top tracks and artists"
          />
        </ChakraProvider>
      ),
    }]);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'View your Spotify top tracks and artists',
    })).toBeVisible();
  });

  function hasCssColor(
    rule: CSSStyleRule,
    hex: string,
    rgb: string,
  ) {
    const cssText = rule.cssText.toLowerCase();
    return cssText.includes(hex) || cssText.includes(rgb);
  }

  it('shows a generic error when Spotify login URL generation fails', async () => {
    const user = userEvent.setup();
    const setCodeVerifier = vi.fn();
    localStorage.setItem(spotifyAuthStorageKeys.consumedCallbackCode, JSON.stringify('callback-code'));
    vi.spyOn(SpotifyRedirectModule, 'redirectToSpotifyLogin').mockImplementation(
      (codeVerifier, redirectPathAfter, setVerifier) => {
        localStorage.removeItem(spotifyAuthStorageKeys.consumedCallbackCode);
        localStorage.setItem(spotifyAuthStorageKeys.verifier, codeVerifier);
        localStorage.setItem(spotifyAuthStorageKeys.state, 'generated-state');
        localStorage.setItem(spotifyAuthStorageKeys.redirectAfterAuth, redirectPathAfter);
        setVerifier(codeVerifier);
        return Promise.reject(new Error('RAW_PRIVATE_AUTHORIZATION_ERROR'));
      },
    );

    render(
      <ChakraProvider theme={theme}>
        <SpotifyLoginButton
          scopes={['user-top-read']}
          clientId="client-id"
          redirectUri="https://example.com/projects/spotify/callback"
          setCodeVerifier={setCodeVerifier}
          redirectPathAfter="/projects/spotify/mytop"
        />
      </ChakraProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Log in with Spotify' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in is temporarily unavailable. Please try again.',
    );
    expect(document.body).not.toHaveTextContent('RAW_PRIVATE_AUTHORIZATION_ERROR');
    expect(localStorage.getItem(spotifyAuthStorageKeys.verifier)).toBeNull();
    expect(localStorage.getItem(spotifyAuthStorageKeys.state)).toBeNull();
    expect(localStorage.getItem(spotifyAuthStorageKeys.redirectAfterAuth)).toBeNull();
    expect(localStorage.getItem(spotifyAuthStorageKeys.consumedCallbackCode)).toBe(
      JSON.stringify('callback-code'),
    );
    expect(setCodeVerifier).toHaveBeenNthCalledWith(1, expect.any(String));
    expect(setCodeVerifier).toHaveBeenLastCalledWith(undefined);
  });

  it('shows a generic error when callback marker storage lookup throws during Spotify login', async () => {
    const user = userEvent.setup();
    const setCodeVerifier = vi.fn();
    const redirectSpy = vi.spyOn(SpotifyRedirectModule, 'redirectToSpotifyLogin');
    const originalGetItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem')?.value as (
      this: Storage,
      key: string,
    ) => string | null;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === spotifyAuthStorageKeys.consumedCallbackCode) {
        throw new DOMException('blocked', 'SecurityError');
      }

      return Reflect.apply(originalGetItem, this, [key]);
    });

    render(
      <ChakraProvider theme={theme}>
        <SpotifyLoginButton
          scopes={['user-top-read']}
          clientId="client-id"
          redirectUri="https://example.com/projects/spotify/callback"
          setCodeVerifier={setCodeVerifier}
          redirectPathAfter="/projects/spotify/mytop"
        />
      </ChakraProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Log in with Spotify' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in is temporarily unavailable. Please try again.',
    );
    expect(redirectSpy).not.toHaveBeenCalled();
    expect(setCodeVerifier).toHaveBeenLastCalledWith(undefined);
  });

  it('continues Spotify auth rejection cleanup after a storage removal fails', async () => {
    const user = userEvent.setup();
    let reactCodeVerifier: string | undefined = 'seeded-verifier';
    const setCodeVerifier = vi.fn((newVerifier: string | null | undefined) => {
      reactCodeVerifier = newVerifier ?? undefined;
    });
    localStorage.setItem(spotifyAuthStorageKeys.verifier, 'seeded-verifier');
    localStorage.setItem(spotifyAuthStorageKeys.state, 'seeded-state');
    localStorage.setItem(
      spotifyAuthStorageKeys.redirectAfterAuth,
      '/projects/spotify/mytop',
    );
    localStorage.setItem(
      spotifyAuthStorageKeys.consumedCallbackCode,
      JSON.stringify('callback-code'),
    );
    const originalRemoveItem = Object.getOwnPropertyDescriptor(
      Storage.prototype,
      'removeItem',
    )?.value as (this: Storage, key: string) => void;
    vi.spyOn(SpotifyRedirectModule, 'redirectToSpotifyLogin').mockImplementation(
      (codeVerifier, _redirectPathAfter, setVerifier) => {
        Reflect.apply(originalRemoveItem, localStorage, [
          spotifyAuthStorageKeys.consumedCallbackCode,
        ]);
        setVerifier(codeVerifier);
        return Promise.reject(new Error('RAW_PRIVATE_AUTHORIZATION_ERROR'));
      },
    );
    let removalFailed = false;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (!removalFailed && key === spotifyAuthStorageKeys.verifier) {
        removalFailed = true;
        throw new DOMException('blocked', 'SecurityError');
      }

      return Reflect.apply(originalRemoveItem, this, [key]);
    });

    render(
      <ChakraProvider theme={theme}>
        <SpotifyLoginButton
          scopes={['user-top-read']}
          clientId="client-id"
          redirectUri="https://example.com/projects/spotify/callback"
          setCodeVerifier={setCodeVerifier}
          redirectPathAfter="/projects/spotify/mytop"
        />
      </ChakraProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Log in with Spotify' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in is temporarily unavailable. Please try again.',
    );
    expect(document.body).not.toHaveTextContent('RAW_PRIVATE_AUTHORIZATION_ERROR');
    expect(localStorage.getItem(spotifyAuthStorageKeys.verifier)).toBe('seeded-verifier');
    expect(localStorage.getItem(spotifyAuthStorageKeys.state)).toBeNull();
    expect(localStorage.getItem(spotifyAuthStorageKeys.redirectAfterAuth)).toBeNull();
    expect(localStorage.getItem(spotifyAuthStorageKeys.consumedCallbackCode)).toBe(
      JSON.stringify('callback-code'),
    );
    expect(reactCodeVerifier).toBeUndefined();
    expect(setCodeVerifier).toHaveBeenLastCalledWith(undefined);
  });

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

  it('inherits the semantic link color in Chakra router links', () => {
    renderWithRouter([
      {
        path: '/',
        Component: () => (
          <ChakraProvider theme={theme}>
            <ChakraRouterLink href="/destination">Destination</ChakraRouterLink>
          </ChakraProvider>
        ),
      },
    ]);

    expect(getComputedStyle(screen.getByRole('link', {
      name: 'Destination',
    })).color).toBe('var(--chakra-colors-link)');
  });

  it('merges and de-duplicates rel tokens for internal links opened in a new tab', () => {
    renderWithRouter([
      {
        path: '/',
        Component: () => (
          <ChakraProvider theme={theme}>
            <ChakraRouterLink
              href="/destination"
              rel="nofollow NOOPENER nofollow"
              target="_blank"
            >
              Internal with rel
            </ChakraRouterLink>
          </ChakraProvider>
        ),
      },
    ]);

    expect(screen.getByRole('link', { name: 'Internal with rel' })).toHaveAttribute(
      'rel',
      'nofollow NOOPENER noreferrer',
    );
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
    expect(screen.getByRole('link', { name: 'External destination' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: 'External destination' })).not.toHaveAttribute(
      'data-discover',
    );
  });

  it('merges and de-duplicates explicit external link rel tokens', () => {
    render(
      <ChakraProvider theme={theme}>
        <ChakraRouterLink
          href="https://example.com/path"
          rel="nofollow noopener nofollow"
          target="_blank"
        >
          External with rel
        </ChakraRouterLink>
      </ChakraProvider>,
    );

    expect(screen.getByRole('link', { name: 'External with rel' })).toHaveAttribute(
      'rel',
      'nofollow noopener noreferrer',
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
        Component: PersistentNavbarLayout,
        children: [
          { index: true, Component: () => null },
          {
            path: 'projects',
            Component: () => <h1>Projects page</h1>,
          },
        ],
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

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      button: 1,
      cancelable: true,
    });
    fireEvent(projectsLink, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(router.state.location.pathname).toBe('/');
  });

  it('closes the mobile menu and navigates when a link is activated with the keyboard', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter([
      {
        path: '/',
        Component: PersistentNavbarLayout,
        children: [
          { index: true, Component: () => null },
          {
            path: 'projects',
            Component: () => <h1>Projects page</h1>,
          },
        ],
      },
    ]);

    const menuButton = await screen.findByRole('button', {
      name: 'Open navigation menu',
    });
    await user.click(menuButton);
    const projectsLink = screen.getByRole('menuitem', {
      name: 'Online Projects',
    });
    projectsLink.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Projects page' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/projects');
    expect(screen.getByRole('button', {
      name: 'Open navigation menu',
    })).toBe(menuButton);
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
    expect(screen.getByRole('navigation', {
      name: 'Primary navigation',
    })).toBeVisible();
    expect(screen.queryByRole('heading', {
      name: 'Adam Ratzman',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', {
      name: 'Online Projects',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'GitHub',
    })).toHaveAttribute('rel', 'noopener noreferrer');

    await act(async () => {
      await router.navigate('/projects/calculator');
    });

    expect(screen.getByRole('link', {
      name: 'Online Projects',
    })).not.toHaveAttribute('aria-current');
  });

  it('restores desktop navbar labels and navigation link treatment', () => {
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

    renderWithRouter([{
      path: '*',
      Component: () => (
        <ChakraProvider theme={theme}>
          <Navbar />
        </ChakraProvider>
      ),
    }]);

    for (const linkName of ['Adam Ratzman', 'Online Projects']) {
      const link = screen.getByRole('link', {
        name: linkName,
      });
      const label = link.querySelector('span');

      expect(label).not.toBeNull();
      expect(getComputedStyle(label as HTMLSpanElement).fontSize).toBe('var(--chakra-fontSizes-md)');
      expect(getComputedStyle(label as HTMLSpanElement).lineHeight).toBe('1.2');
      expect(getComputedStyle(link).textDecoration).toBe('none');
    }
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
        '/projects/spotify/callback?code=callback-code&state=callback-state',
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
    expect(localStorage.getItem('spotify_code_verifier')).toBeNull();
    expect(localStorage.getItem('spotify-state')).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();

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
        '/projects/spotify/callback?code=previous-code&state=callback-state',
      ],
    });

    await waitFor(() => {
      expect(postSpy).not.toHaveBeenCalled();
    });

    await act(async () => {
      await router.navigate('/projects/spotify/callback?code=new-code&state=callback-state');
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(postSpy).toHaveBeenCalledTimes(1);
    const requestParams = postSpy.mock.calls[0]?.[1] as URLSearchParams;
    expect(requestParams.get('code')).toBe('new-code');
  });

  it('does not replay a successfully consumed callback code after remounting', async () => {
    const postSpy = mockSpotifyTokenExchange();
    const firstRender = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(postSpy).toHaveBeenCalledTimes(1);

    firstRender.unmount();
    const replayRender = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
      seedTransaction: false,
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBe(
      JSON.stringify('callback-code'),
    );

    replayRender.unmount();
    renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=new-code&state=callback-state',
      ],
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(postSpy).toHaveBeenCalledTimes(2);
    const requestParams = postSpy.mock.calls[1]?.[1] as URLSearchParams;
    expect(requestParams.get('code')).toBe('new-code');
  });

  it('keeps the callback request guard active while navigation is pending', async () => {
    localStorage.setItem(
      'spotify_pkce_callback_code',
      JSON.stringify('previous-code'),
    );
    localStorage.setItem(
      'spotify_redirect_after_auth',
      '/projects/spotify',
    );
    const postSpy = mockSpotifyTokenExchange();
    let finishNavigation: () => void = () => undefined;
    const pendingNavigation = new Promise<void>((resolve) => {
      finishNavigation = resolve;
    });
    const { router } = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
      spotifyProjectLoader: () => pendingNavigation,
    });

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(router.state.navigation.state).toBe('loading');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    expect(postSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishNavigation();
      await pendingNavigation;
    });
    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
  });

  it('keeps a failed callback code consumed and clears the transaction', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(
      new Error('invalid one-time code'),
    );
    const firstRender = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in could not be completed',
    );
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(localStorage.getItem('spotify_pkce_callback_code')).toBe(
        JSON.stringify('callback-code'),
      );
    });
    expect(localStorage.getItem('spotify_code_verifier')).toBeNull();
    expect(localStorage.getItem('spotify-state')).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();

    firstRender.unmount();
    renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
      seedTransaction: false,
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid token exchange response without authenticating or navigating', async () => {
    localStorage.setItem(
      'spotify_redirect_after_auth',
      '/contact?from=spotify#complete',
    );
    const postSpy = mockSpotifyTokenExchange({
      refresh_token: undefined,
    });
    const { router, setSpotifyTokenInfo } = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in could not be completed',
    );
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(setSpotifyTokenInfo).not.toHaveBeenCalled();
    expect(localStorage.getItem('spotify_token')).toBeNull();
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBe(
      JSON.stringify('callback-code'),
    );
    expect(localStorage.getItem('spotify_code_verifier')).toBeNull();
    expect(localStorage.getItem('spotify-state')).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();
    expect(router.state.location.pathname).toBe('/projects/spotify/callback');
  });

  it('rejects a mismatched callback state without exchanging the code', async () => {
    const postSpy = vi.spyOn(axios, 'post');
    const { setCodeVerifier } = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=wrong-state',
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in could not be completed',
    );
    expect(postSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('spotify_code_verifier')).toBeNull();
    expect(localStorage.getItem('spotify-state')).toBeNull();
    expect(setCodeVerifier).toHaveBeenCalledWith(null);
  });

  it('rejects a callback without state without exchanging the code', async () => {
    const postSpy = vi.spyOn(axios, 'post');
    const { setCodeVerifier } = renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?code=callback-code',
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in could not be completed',
    );
    expect(postSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('spotify_code_verifier')).toBeNull();
    expect(localStorage.getItem('spotify-state')).toBeNull();
    expect(setCodeVerifier).toHaveBeenCalledWith(null);
  });

  it('rejects matching callback state when the verifier is absent', async () => {
    localStorage.setItem('spotify-state', 'callback-state');
    localStorage.setItem('spotify_redirect_after_auth', '/contact');
    const postSpy = vi.spyOn(axios, 'post');
    const { setCodeVerifier } = renderSpotifyCallback({
      codeVerifier: null,
      initialEntries: [
        '/projects/spotify/callback?code=callback-code&state=callback-state',
      ],
      seedTransaction: false,
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in could not be completed',
    );
    expect(postSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('spotify_code_verifier')).toBeNull();
    expect(localStorage.getItem('spotify-state')).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBe(
      JSON.stringify('callback-code'),
    );
    expect(setCodeVerifier).toHaveBeenCalledWith(null);
  });

  it('does not expose provider denial details', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderSpotifyCallback({
      initialEntries: [
        '/projects/spotify/callback?error=access_denied&error_description=RAW_PRIVATE_PROVIDER_TEXT&state=callback-state',
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in could not be completed',
    );
    expect(document.body).not.toHaveTextContent('RAW_PRIVATE_PROVIDER_TEXT');
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
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
        '/projects/spotify/callback?code=callback-code&state=callback-state',
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

describe('web dependency scope', () => {
  it('removes randomcolor from the web package and source', () => {
    const webPackage = JSON.parse(
      readFileSync(`${process.cwd()}/package.json`, 'utf8'),
    ) as PackageManifest;
    const sourceMatches = collectSourceFiles(`${process.cwd()}/src`).filter(
      filePath => readFileSync(filePath, 'utf8').includes('randomcolor'),
    );

    expect(webPackage.dependencies).not.toHaveProperty('randomcolor');
    expect(webPackage.devDependencies).not.toHaveProperty('@types/randomcolor');
    expect(sourceMatches).toEqual([]);
  });
});

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }

    return /\.(?:[cm]?[jt]sx?|json)$/u.test(entry.name) ? [path] : [];
  });
}

function mockSpotifyTokenExchange(overrides: Record<string, unknown> = {}) {
  return vi.spyOn(axios, 'post').mockResolvedValue({
    data: {
      access_token: 'access-token',
      expires_in: 3600,
      refresh_token: 'refresh-token',
      scope: 'user-top-read',
      token_type: 'Bearer',
      ...overrides,
    },
  });
}

function renderSpotifyCallback({
  codeVerifier = 'code-verifier',
  initialEntries,
  initialIndex = 0,
  spotifyProjectLoader,
  seedTransaction = true,
}: {
  codeVerifier?: string | null;
  initialEntries: string[];
  initialIndex?: number;
  spotifyProjectLoader?: RouteObject['loader'];
  seedTransaction?: boolean;
}) {
  const setSpotifyTokenInfo = vi.fn();
  const setCodeVerifier = vi.fn();
  if (seedTransaction) {
    localStorage.setItem('spotify_code_verifier', 'code-verifier');
    localStorage.setItem('spotify-state', 'callback-state');
  }
  const routes: RouteObject[] = [
    { path: '/before', Component: () => <h1>Before callback</h1> },
    {
      path: '/projects/spotify/callback',
      Component: () => (
        <SpotifyCallbackIngestionTokenProducerComponent
          clientId="client-id"
          codeVerifier={codeVerifier ?? undefined}
          redirectUri="https://example.com/projects/spotify/callback"
          setCodeVerifier={setCodeVerifier}
          setSpotifyTokenInfo={setSpotifyTokenInfo}
        />
      ),
    },
    { path: '/contact', Component: () => <h1>Contact page</h1> },
    {
      path: '/projects/spotify',
      Component: () => <h1>Spotify projects</h1>,
      loader: spotifyProjectLoader,
    },
  ];

  return {
    ...renderWithRouter(routes, {
      initialEntries,
      initialIndex,
    }),
    setCodeVerifier,
    setSpotifyTokenInfo,
  };
}
