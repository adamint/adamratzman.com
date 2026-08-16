import { ChakraProvider } from '@chakra-ui/react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpotifyRouteComponent } from '../src/components/projects/spotify/SpotifyRouteComponent';
import SpotifyGenerateTokenRoute from '../src/routes/projects/spotify/generate-token';
import SpotifyViewMyTopRoute from '../src/routes/projects/spotify/mytop';
import { type SpotifyTokenInfo } from '../src/spotify-utils/auth/SpotifyAuthUtils';
import * as SpotifyAuthUtils from '../src/spotify-utils/auth/SpotifyAuthUtils';
import { theme } from '../src/theme';
import { renderWithRouter } from './render';

const spotifyStoreState = vi.hoisted(() => ({
  codeVerifier: undefined as string | undefined,
  setCodeVerifier: vi.fn((newVerifier: string | null | undefined) => {
    spotifyStoreState.codeVerifier = newVerifier ?? undefined;
  }),
  spotifyTokenInfo: null as SpotifyTokenInfo | null,
  setSpotifyTokenInfo: () => undefined,
  spotifyClientId: 'client-id',
  spotifyRedirectUri: () => 'https://example.com/projects/spotify/callback',
}));

vi.mock('../src/components/utils/useSpotifyStore', () => ({
  useSpotifyStore: (
    selector: (state: typeof spotifyStoreState) => unknown,
  ) => selector(spotifyStoreState),
}));

vi.mock('../src/spotify-utils/auth/SpotifyLoginButton', () => ({
  SpotifyLoginButton: ({
    redirectPathAfter,
    scopes,
    title,
  }: {
    redirectPathAfter: string;
    scopes: string[];
    title?: string;
  }) => (
    <>
      {title && <h1>{title}</h1>}
      <div
        data-redirect-path={redirectPathAfter}
        data-scopes={scopes.join(' ')}
        data-testid="spotify-login"
      />
    </>
  ),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  spotifyStoreState.codeVerifier = undefined;
  spotifyStoreState.spotifyTokenInfo = null;
  spotifyStoreState.setCodeVerifier.mockClear();
  vi.restoreAllMocks();
});

describe('Spotify route authentication', () => {
  it.each([
    {
      Component: SpotifyGenerateTokenRoute,
      documentTitle: 'Generate a Spotify OAuth Token | Adam Ratzman',
      heading: 'Generate a Spotify OAuth Token',
      path: '/projects/spotify/generate-token',
    },
    {
      Component: SpotifyViewMyTopRoute,
      documentTitle: 'Your top Spotify tracks and artists | Adam Ratzman',
      heading: 'View your Spotify top tracks and artists',
      path: '/projects/spotify/mytop',
    },
  ])('keeps route identity visible before Spotify authentication at $path', async ({
    Component,
    documentTitle,
    heading,
    path,
  }) => {
    renderWithRouter([{ path, Component }], {
      initialEntries: [path],
    });

    expect(await screen.findByRole('heading', {
      level: 1,
      name: heading,
    })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    await waitFor(() => {
      expect(document.title).toBe(documentTitle);
    });
  });

  it.each([
    {
      Component: SpotifyGenerateTokenRoute,
      heading: 'Generate a Spotify OAuth Token',
      path: '/projects/spotify/generate-token',
    },
    {
      Component: SpotifyViewMyTopRoute,
      heading: 'Your top tracks and artists',
      path: '/projects/spotify/mytop',
    },
  ])('renders one h1 after Spotify authentication at $path', async ({
    Component,
    heading,
    path,
  }) => {
    authorizeMyTop();
    mockMyTopApi(
      vi.fn().mockResolvedValue(emptyTopPage()),
      vi.fn().mockResolvedValue(emptyTopPage()),
    );

    renderWithRouter([{ path, Component }], {
      initialEntries: [path],
    });

    expect(await screen.findByRole('heading', {
      level: 1,
      name: heading,
    })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('uses an AA-contrast palette for the access-token copy button', async () => {
    authorizeMyTop();

    renderWithRouter([{
      path: '/projects/spotify/generate-token',
      Component: () => (
        <ChakraProvider theme={theme}>
          <SpotifyGenerateTokenRoute />
        </ChakraProvider>
      ),
    }], {
      initialEntries: ['/projects/spotify/generate-token'],
    });

    const button = await screen.findByRole('button', {
      name: 'Copy access token',
    });
    expectButtonPalette(button, 'blue');
  });

  it('shows a generic error when generated Spotify login URL creation fails', async () => {
    const tokenInfo: SpotifyTokenInfo = {
      expiry: Date.now() + 60_000,
      token: {
        access_token: 'access-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
        scope: 'user-top-read',
        token_type: 'Bearer',
      },
    };
    spotifyStoreState.spotifyTokenInfo = tokenInfo;
    spotifyStoreState.codeVerifier = 'seeded-verifier';
    localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));
    localStorage.setItem(SpotifyAuthUtils.spotifyAuthStorageKeys.verifier, 'seeded-verifier');
    localStorage.setItem(SpotifyAuthUtils.spotifyAuthStorageKeys.state, 'seeded-state');
    localStorage.setItem(SpotifyAuthUtils.spotifyAuthStorageKeys.redirectAfterAuth, '/projects/spotify/mytop');
    localStorage.setItem(SpotifyAuthUtils.spotifyAuthStorageKeys.consumedCallbackCode, JSON.stringify('callback-code'));
    vi.spyOn(SpotifyAuthUtils, 'getPkceAuthUrlFull').mockRejectedValue(
      new Error('RAW_PRIVATE_GENERATION_ERROR'),
    );

    renderWithRouter([
      {
        path: '/projects/spotify/generate-token',
        Component: () => (
          <ChakraProvider theme={theme}>
            <SpotifyGenerateTokenRoute />
          </ChakraProvider>
        ),
      },
    ], {
      initialEntries: ['/projects/spotify/generate-token'],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in is temporarily unavailable. Please try again.',
    );
    expect(document.body).not.toHaveTextContent('RAW_PRIVATE_GENERATION_ERROR');
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.verifier)).toBeNull();
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.state)).toBeNull();
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.redirectAfterAuth)).toBeNull();
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.consumedCallbackCode)).toBe(
      JSON.stringify('callback-code'),
    );
    expect(spotifyStoreState.codeVerifier).toBeUndefined();
    expect(spotifyStoreState.setCodeVerifier).toHaveBeenLastCalledWith(undefined);
  });

  it('continues Spotify generated login cleanup after a storage removal fails', async () => {
    const user = userEvent.setup();
    const tokenInfo: SpotifyTokenInfo = {
      expiry: Date.now() + 60_000,
      token: {
        access_token: 'access-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
        scope: 'user-top-read',
        token_type: 'Bearer',
      },
    };
    spotifyStoreState.spotifyTokenInfo = tokenInfo;
    localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));
    localStorage.setItem(SpotifyAuthUtils.spotifyAuthStorageKeys.verifier, 'seeded-verifier');
    localStorage.setItem(SpotifyAuthUtils.spotifyAuthStorageKeys.state, 'seeded-state');
    localStorage.setItem(
      SpotifyAuthUtils.spotifyAuthStorageKeys.redirectAfterAuth,
      '/projects/spotify/mytop',
    );
    localStorage.setItem(
      SpotifyAuthUtils.spotifyAuthStorageKeys.consumedCallbackCode,
      JSON.stringify('callback-code'),
    );
    vi.spyOn(SpotifyAuthUtils, 'createPkceCodeVerifier').mockReturnValue('generated-verifier');
    const authorizationUrlSpy = vi.spyOn(SpotifyAuthUtils, 'getPkceAuthUrlFull').mockResolvedValue(
      'https://accounts.spotify.com/authorize?client_id=client-id&step=initial',
    );
    const originalRemoveItem = Object.getOwnPropertyDescriptor(Storage.prototype, 'removeItem')?.value as (
      this: Storage,
      key: string,
    ) => void;
    let removalFailed = false;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (!removalFailed && key === SpotifyAuthUtils.spotifyAuthStorageKeys.verifier) {
        removalFailed = true;
        throw new DOMException('blocked', 'SecurityError');
      }

      return Reflect.apply(originalRemoveItem, this, [key]);
    });

    renderWithRouter([
      {
        path: '/projects/spotify/generate-token',
        Component: () => (
          <ChakraProvider theme={theme}>
            <SpotifyGenerateTokenRoute />
          </ChakraProvider>
        ),
      },
    ], {
      initialEntries: ['/projects/spotify/generate-token'],
    });

    const generatedLink = await screen.findByRole('link', {
      name: 'https://accounts.spotify.com/authorize?client_id=client-id&step=initial',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const authorizationCallsBeforeClick = authorizationUrlSpy.mock.calls.length;
    let consumedCallbackCodeBeforeClickFailure: string | null | undefined;
    authorizationUrlSpy.mockImplementationOnce(() => {
      consumedCallbackCodeBeforeClickFailure = localStorage.getItem(
        SpotifyAuthUtils.spotifyAuthStorageKeys.consumedCallbackCode,
      );
      return Promise.reject(new Error('RAW_PRIVATE_GENERATION_ERROR'));
    });

    await user.click(generatedLink);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Spotify sign-in is temporarily unavailable. Please try again.',
    );
    expect(authorizationUrlSpy.mock.calls.length).toBe(authorizationCallsBeforeClick + 1);
    expect(consumedCallbackCodeBeforeClickFailure).toBeNull();
    expect(document.body).not.toHaveTextContent('RAW_PRIVATE_GENERATION_ERROR');
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.verifier)).toBe('generated-verifier');
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.state)).toBeNull();
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.redirectAfterAuth)).toBeNull();
    expect(localStorage.getItem(SpotifyAuthUtils.spotifyAuthStorageKeys.consumedCallbackCode)).toBe(
      JSON.stringify('callback-code'),
    );
    expect(spotifyStoreState.setCodeVerifier).toHaveBeenNthCalledWith(1, 'generated-verifier');
    expect(spotifyStoreState.setCodeVerifier).toHaveBeenLastCalledWith(undefined);
  });

  it('preserves the fragment in the post-auth redirect', async () => {
    renderSpotifyRoute('/projects/spotify/mytop?range=short#artists');

    expect(await screen.findByTestId('spotify-login')).toHaveAttribute(
      'data-redirect-path',
      '/projects/spotify/mytop?range=short#artists',
    );
  });

  it('preserves query and hash when mytop requires reauthorization', async () => {
    const tokenInfo: SpotifyTokenInfo = {
      expiry: Date.now() + 60_000,
      token: {
        access_token: 'access-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
        scope: 'user-library-read',
        token_type: 'Bearer',
      },
    };
    spotifyStoreState.spotifyTokenInfo = tokenInfo;
    localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));

    renderWithRouter([
      {
        path: '/projects/spotify/mytop',
        Component: SpotifyViewMyTopRoute,
      },
    ], {
      initialEntries: ['/projects/spotify/mytop?tab=artists#top'],
    });

    expect(await screen.findByTestId('spotify-login')).toHaveAttribute(
      'data-redirect-path',
      '/projects/spotify/mytop?tab=artists#top',
    );
  });

  it('clears malformed persisted token data while checking required scopes', async () => {
    spotifyStoreState.spotifyTokenInfo = {
      expiry: Date.now() + 60_000,
      token: {
        access_token: 'access-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
        scope: 'user-library-read',
        token_type: 'Bearer',
      },
    };
    localStorage.setItem('spotify_token', '{"badJson":');

    renderWithRouter([
      {
        path: '/projects/spotify/mytop',
        Component: SpotifyViewMyTopRoute,
      },
    ], {
      initialEntries: ['/projects/spotify/mytop'],
    });

    await waitFor(() => {
      expect(localStorage.getItem('spotify_token')).toBeNull();
    });
    expect(screen.queryByText('Unexpected Application Error!')).not.toBeInTheDocument();
  });

  it('clears malformed persisted token data during unauthenticated initialization', async () => {
    localStorage.setItem('spotify_token', '{"badJson":');

    renderSpotifyRoute('/projects/spotify');

    expect(await screen.findByTestId('spotify-login')).toBeVisible();
    expect(localStorage.getItem('spotify_token')).toBeNull();
  });

  it.each([
    '/projects/spotify/recommend/create-playlist',
    '/projects/spotify/recommend/create-playlist/',
    '/PrOjEcTs/SpOtIfY/ReCoMmEnD/CrEaTe-PlAyLiSt',
  ])('requests playlist modification scopes for %s', async (pathname) => {
    renderSpotifyRoute(pathname);

    const scopes = (await screen.findByTestId('spotify-login'))
      .getAttribute('data-scopes')
      ?.split(' ');

    expect(scopes).toEqual(expect.arrayContaining([
      'playlist-modify-public',
      'playlist-modify-private',
      'playlist-read-collaborative',
    ]));
  });

  it('keeps my-top producers stable while page loading state changes', async () => {
    authorizeMyTop();
    let resolveTracks!: (value: { items: never[]; total: number }) => void;
    const tracks = new Promise<{ items: never[]; total: number }>((resolve) => {
      resolveTracks = resolve;
    });
    const getMyTopTracks = vi.fn().mockReturnValue(tracks);
    const getMyTopArtists = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.spyOn(SpotifyAuthUtils, 'useSpotifyWebApiGuardValidPkceToken').mockImplementation(() => ({
      getApi: () => Promise.resolve({
        getMyTopArtists,
        getMyTopTracks,
      } as never),
    }));

    const { router } = renderWithRouter([
      {
        path: '/projects/spotify/mytop',
        Component: SpotifyViewMyTopRoute,
      },
      {
        path: '/projects/spotify',
        Component: () => <h1>Spotify projects</h1>,
      },
    ], {
      initialEntries: ['/projects/spotify/mytop'],
    });

    expect(await screen.findByRole('heading', {
      name: 'Your top tracks and artists',
    })).toBeVisible();
    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledOnce();
    });
    await act(async () => {
      await router.navigate('/projects/spotify/mytop?refresh=1');
    });
    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 30));
    });
    const callsWhilePending = getMyTopTracks.mock.calls.length;
    resolveTracks({
      items: [],
      total: 0,
    });
    await act(async () => {
      await tracks;
    });

    expect(callsWhilePending).toBe(1);
  });

  it('keeps the loading indicator owned by the current my-top generation', async () => {
    authorizeMyTop();
    const oldTracks = deferred<TopPage>();
    const currentTracks = deferred<TopPage>();
    const getMyTopTracks = vi.fn()
      .mockReturnValueOnce(oldTracks.promise)
      .mockReturnValueOnce(currentTracks.promise);
    const getMyTopArtists = vi.fn();
    mockMyTopApi(getMyTopTracks, getMyTopArtists);

    renderMyTopRoute();

    expect(await screen.findByRole('heading', {
      name: 'Your top tracks and artists',
    })).toBeVisible();
    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledOnce();
    });
    expectCurrentLoadingSpinner();
    expect(getMyTopArtists).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', {
      name: 'Time Range',
    }), {
      target: { value: 'medium_term' },
    });
    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledTimes(2);
    });

    oldTracks.resolve(emptyTopPage());
    await act(async () => {
      await oldTracks.promise;
    });

    expectCurrentLoadingSpinner();

    currentTracks.resolve(emptyTopPage());
    await act(async () => {
      await currentTracks.promise;
    });
    await waitFor(() => {
      expect(screen.queryByText('Loading Spotify results')).not.toBeInTheDocument();
    });
  });

  it('lazy-unmounts inactive my-top tabs without hidden duplicate requests', async () => {
    authorizeMyTop();
    const oldTracks = deferred<TopPage>();
    const currentTracks = deferred<TopPage>();
    const oldArtists = deferred<TopPage>();
    const getMyTopTracks = vi.fn()
      .mockReturnValueOnce(oldTracks.promise)
      .mockReturnValueOnce(currentTracks.promise);
    const getMyTopArtists = vi.fn().mockReturnValue(oldArtists.promise);
    mockMyTopApi(getMyTopTracks, getMyTopArtists);

    renderMyTopRoute();

    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledOnce();
    });
    expect(getMyTopArtists).not.toHaveBeenCalled();
    expectCurrentLoadingSpinner();

    fireEvent.click(screen.getByRole('tab', { name: /Top Artists/u }));
    await waitFor(() => {
      expect(getMyTopArtists).toHaveBeenCalledOnce();
    });
    expectCurrentLoadingSpinner();

    oldTracks.resolve(emptyTopPage());
    await act(async () => {
      await oldTracks.promise;
    });
    expectCurrentLoadingSpinner();

    fireEvent.click(screen.getByRole('tab', { name: /Top Tracks/u }));
    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledTimes(2);
    });

    oldArtists.resolve(emptyTopPage());
    await act(async () => {
      await oldArtists.promise;
    });
    expectCurrentLoadingSpinner();

    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 20));
    });
    expect(getMyTopTracks).toHaveBeenCalledTimes(2);
    expect(getMyTopArtists).toHaveBeenCalledOnce();

    currentTracks.resolve(emptyTopPage());
    await act(async () => {
      await currentTracks.promise;
    });
    await waitFor(() => {
      expect(screen.queryByText('Loading Spotify results')).not.toBeInTheDocument();
    });
  });

  it('does not launch hidden my-top work after a deferred API lookup resolves', async () => {
    authorizeMyTop();
    const artistPage = deferred<TopPage>();
    const api = deferred<{
      getMyTopArtists: ReturnType<typeof vi.fn>;
      getMyTopTracks: ReturnType<typeof vi.fn>;
    }>();
    const getMyTopTracks = vi.fn();
    const getMyTopArtists = vi.fn().mockReturnValue(artistPage.promise);
    const getApi = vi.fn().mockReturnValue(api.promise);
    vi.spyOn(SpotifyAuthUtils, 'useSpotifyWebApiGuardValidPkceToken').mockImplementation(() => ({
      getApi: getApi as never,
    }));

    renderMyTopRoute();

    await waitFor(() => {
      expect(getApi).toHaveBeenCalledOnce();
    });
    fireEvent.click(screen.getByRole('tab', { name: /Top Artists/u }));
    await waitFor(() => {
      expect(getApi).toHaveBeenCalledTimes(2);
    });

    api.resolve({
      getMyTopArtists,
      getMyTopTracks,
    });
    await act(async () => {
      await api.promise;
    });
    await waitFor(() => {
      expect(getMyTopArtists).toHaveBeenCalledOnce();
    });

    expect(getMyTopTracks).not.toHaveBeenCalled();
    expectCurrentLoadingSpinner();

    artistPage.resolve(emptyTopPage());
    await act(async () => {
      await artistPage.promise;
    });
  });

  it('starts each activated my-top tab on the first page', async () => {
    authorizeMyTop();
    const getMyTopTracks = vi.fn().mockResolvedValue({
      items: [],
      total: 50,
    });
    const getMyTopArtists = vi.fn().mockResolvedValue({
      items: [],
      total: 50,
    });
    mockMyTopApi(getMyTopTracks, getMyTopArtists);

    renderMyTopRoute();

    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledOnce();
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledTimes(2);
    });
    expect(getMyTopTracks.mock.calls[1]?.[0]).toMatchObject({
      limit: 10,
      offset: 10,
    });

    fireEvent.click(screen.getByRole('tab', { name: /Top Artists/u }));
    await waitFor(() => {
      expect(getMyTopArtists).toHaveBeenCalledOnce();
    });
    expect(getMyTopArtists.mock.calls[0]?.[0]).toMatchObject({
      limit: 10,
      offset: 0,
    });

    fireEvent.click(screen.getByRole('tab', { name: /Top Tracks/u }));
    await waitFor(() => {
      expect(getMyTopTracks).toHaveBeenCalledTimes(3);
    });
    expect(getMyTopTracks.mock.calls[2]?.[0]).toMatchObject({
      limit: 10,
      offset: 0,
    });
  });
});

function renderSpotifyRoute(initialEntry: string) {
  return renderWithRouter([
    {
      path: '*',
      Component: () => (
        <SpotifyRouteComponent>
          Authenticated content
        </SpotifyRouteComponent>
      ),
    },
  ], {
    initialEntries: [initialEntry],
  });
}

function expectButtonPalette(button: HTMLElement, palette: 'blue') {
  const generatedClass = button.className.split(' ').at(-1);
  const rules = Array.from(document.styleSheets)
    .flatMap(sheet => Array.from(sheet.cssRules)) as CSSStyleRule[];
  const baseRule = rules.find(rule => rule.selectorText === `.${generatedClass}`);
  const hoverRule = rules.find(rule => (
    rule.selectorText?.includes(`.${generatedClass}:hover`)
  ));
  const activeRule = rules.find(rule => (
    rule.selectorText?.includes(`.${generatedClass}:active`)
  ));

  expect(baseRule?.style.background).toBe(
    `var(--chakra-colors-${palette}-700)`,
  );
  expect(baseRule?.style.color).toBe('var(--chakra-colors-white)');
  expect(hoverRule?.style.background).toBe(
    `var(--chakra-colors-${palette}-800)`,
  );
  expect(activeRule?.style.background).toBe(
    `var(--chakra-colors-${palette}-900)`,
  );
}

type TopPage = {
  items: never[];
  total: number;
};

function authorizeMyTop() {
  const tokenInfo: SpotifyTokenInfo = {
    expiry: Date.now() + 60_000,
    token: {
      access_token: 'access-token',
      expires_in: 3600,
      refresh_token: 'refresh-token',
      scope: 'user-top-read',
      token_type: 'Bearer',
    },
  };
  spotifyStoreState.spotifyTokenInfo = tokenInfo;
  localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));
}

function mockMyTopApi(
  getMyTopTracks: ReturnType<typeof vi.fn>,
  getMyTopArtists: ReturnType<typeof vi.fn>,
) {
  vi.spyOn(SpotifyAuthUtils, 'useSpotifyWebApiGuardValidPkceToken').mockImplementation(() => ({
    getApi: () => Promise.resolve({
      getMyTopArtists,
      getMyTopTracks,
    } as never),
  }));
}

function renderMyTopRoute() {
  return renderWithRouter([
    {
      path: '/projects/spotify/mytop',
      Component: SpotifyViewMyTopRoute,
    },
    {
      path: '/projects/spotify',
      Component: () => <h1>Spotify projects</h1>,
    },
  ], {
    initialEntries: ['/projects/spotify/mytop'],
  });
}

function expectCurrentLoadingSpinner() {
  const status = screen.getByRole('status');
  const spinner = document.querySelector<HTMLElement>('.chakra-spinner');

  expect(status).toBeInTheDocument();
  expect(status).toHaveTextContent('Loading Spotify results');
  expect(status).not.toHaveAttribute('aria-label');
  expect(status).not.toContainElement(spinner);
  expect(spinner).toBeVisible();
  expect(document.querySelectorAll('.chakra-spinner')).toHaveLength(1);
}

function emptyTopPage(): TopPage {
  return {
    items: [],
    total: 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}
