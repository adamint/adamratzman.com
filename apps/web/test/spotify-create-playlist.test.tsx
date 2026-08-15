import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  screen,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react';
import type { UseDisclosureReturn } from '@chakra-ui/hooks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseRecommendedTrackIds,
} from '../src/routes/projects/spotify/recommend/create-playlist';
import SpotifyCreatePlaylistRoute from '../src/routes/projects/spotify/recommend/create-playlist';
import {
  CreateSpotifyPlaylistModal,
  getSafeSpotifyPlaylistUrl,
} from '../src/components/projects/spotify/playlist_generator/CreateSpotifyPlaylistModal';
import { theme } from '../src/theme';
import { renderWithRouter } from './render';

const spotifyStoreState = vi.hoisted(() => ({
  codeVerifier: undefined as string | undefined,
  setCodeVerifier: vi.fn(),
  spotifyClientId: 'client-id',
  spotifyRedirectUri: () => 'https://example.com/projects/spotify/callback',
  spotifyTokenInfo: {
    expiry: Date.now() + 60_000,
    token: {
      access_token: 'access-token',
      expires_in: 3600,
      refresh_token: 'refresh-token',
      scope: 'playlist-modify-public playlist-modify-private playlist-read-collaborative',
      token_type: 'Bearer',
    },
  },
  setSpotifyTokenInfo: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  useGuard: vi.fn(),
}));

vi.mock('../src/components/utils/useSpotifyStore', () => ({
  useSpotifyStore: (
    selector: (state: typeof spotifyStoreState) => unknown,
  ) => selector(spotifyStoreState),
}));

vi.mock('../src/spotify-utils/auth/SpotifyAuthUtils', async importOriginal => {
  const actual = await importOriginal<
    typeof import('../src/spotify-utils/auth/SpotifyAuthUtils')
  >();
  return {
    ...actual,
    useSpotifyWebApiGuardValidPkceToken: authMocks.useGuard,
  };
});

vi.mock('../src/components/projects/spotify/SpotifyRouteComponent', () => ({
  SpotifyRouteComponent: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../src/spotify-utils/auth/RequireSpotifyScopesOrElseShowLogin', () => ({
  RequireSpotifyScopesOrElseShowLogin: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../src/components/utils/useNoShowBeforeRender', () => ({
  useNoShowBeforeRender: () => true,
}));

afterEach(() => {
  cleanup();
  authMocks.useGuard.mockReset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('recommended track ID parsing', () => {
  it('normalizes repeated and legacy comma-separated values', () => {
    const params = new URLSearchParams();
    params.append('trackIds', ' first, second ');
    params.append('trackIds', 'third,fourth');

    expect(parseRecommendedTrackIds(params)).toEqual({
      kind: 'valid',
      trackIds: ['first', 'second', 'third', 'fourth'],
    });
  });

  it('de-duplicates IDs while preserving first-seen order', () => {
    const params = new URLSearchParams();
    params.append('trackIds', 'second,first');
    params.append('trackIds', 'second,third,first');

    expect(parseRecommendedTrackIds(params)).toEqual({
      kind: 'valid',
      trackIds: ['second', 'first', 'third'],
    });
  });

  it('omits empty normalized values', () => {
    const params = new URLSearchParams();
    params.append('trackIds', ' ,first,, ');
    params.append('trackIds', '');

    expect(parseRecommendedTrackIds(params)).toEqual({
      kind: 'valid',
      trackIds: ['first'],
    });
  });

  it.each(['track-id', 'track id', 'é', 'track/one'])(
    'rejects malformed ID %s',
    (trackId) => {
      expect(parseRecommendedTrackIds(
        new URLSearchParams({ trackIds: trackId }),
      )).toEqual({ kind: 'invalid' });
    },
  );

  it('rejects more than 50 unique IDs', () => {
    const params = new URLSearchParams();
    for (let index = 0; index < 51; index += 1) {
      params.append('trackIds', `track${index}`);
    }

    expect(parseRecommendedTrackIds(params)).toEqual({ kind: 'invalid' });
  });

  it('accepts zero IDs without alternate parameter names', () => {
    expect(parseRecommendedTrackIds(
      new URLSearchParams({ ids: 'alternate' }),
    )).toEqual({
      kind: 'valid',
      trackIds: [],
    });
  });
});

describe('create-playlist route request lifecycle', () => {
  it('renders malformed IDs without initializing or calling Spotify', async () => {
    renderRoute('/projects/spotify/recommend/create-playlist?trackIds=bad-id');

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(authMocks.useGuard).not.toHaveBeenCalled();
  });
});

describe('playlist creation modal', () => {
    it('shows only the generic error and recovers after createPlaylist fails', async () => {
      const createPlaylist = vi.fn().mockRejectedValue({
        response: 'RAW CREATE SECRET',
        statusText: 'RAW CREATE STATUS',
      });
      const addTracksToPlaylist = vi.fn();
      renderModal({ addTracksToPlaylist, createPlaylist });

      submitPlaylist();

      await waitFor(() => {
        const errors = screen.getAllByText(
          'Failed to create playlist. Please reload the page and try again',
        );
        expect(errors.at(-1)).toBeVisible();
      });
      expect(document.body).not.toHaveTextContent('RAW CREATE SECRET');
      expect(document.body).not.toHaveTextContent('RAW CREATE STATUS');
      expect(addTracksToPlaylist).not.toHaveBeenCalled();
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
    });

    it('shows only the generic error and recovers after addTracksToPlaylist fails', async () => {
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const addTracksToPlaylist = vi.fn().mockRejectedValue({
        response: 'RAW ADD SECRET',
        statusText: 'RAW ADD STATUS',
      });
      renderModal({ addTracksToPlaylist, createPlaylist });

      submitPlaylist();

      await waitFor(() => {
        const errors = screen.getAllByText(
          'Failed to create playlist. Please reload the page and try again',
        );
        expect(errors.at(-1)).toBeVisible();
      });
      expect(document.body).not.toHaveTextContent('RAW ADD SECRET');
      expect(document.body).not.toHaveTextContent('RAW ADD STATUS');
      expect(addTracksToPlaylist).toHaveBeenCalledWith(
        'created-playlist',
        ['spotify:track:first', 'spotify:track:second'],
      );
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
    });

    it('prevents duplicate submission while loading and recovers after failure', async () => {
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      renderModal({
        addTracksToPlaylist: vi.fn(),
        createPlaylist,
      });

      const submitButton = submitPlaylist();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createPlaylist).toHaveBeenCalledOnce();
      });
      expect(submitButton).toBeDisabled();

      playlistRequest.reject(new Error('RAW FAILURE'));
      await act(async () => {
        await playlistRequest.promise.catch(() => undefined);
      });
      await waitFor(() => {
        const errors = screen.getAllByText(
          'Failed to create playlist. Please reload the page and try again',
        );
        expect(errors.at(-1)).toBeVisible();
      });
      expect(submitButton).toBeEnabled();
    });

    it('opens a safe Spotify destination with exact target and features', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderModal({
        addTracksToPlaylist: vi.fn().mockResolvedValue({}),
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created?si=one',
        )),
      });

      submitPlaylist();

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      await waitFor(() => {
        expect(openSpy).toHaveBeenCalledOnce();
      }, { timeout: 2500 });
      expect(openSpy).toHaveBeenCalledWith(
        'https://open.spotify.com/playlist/created?si=one',
        '_blank',
        'noopener,noreferrer',
      );
    });

    it.each([
      ['http', 'http://open.spotify.com/playlist/created'],
      ['wrong host', 'https://example.com/playlist/created'],
      ['subdomain', 'https://music.open.spotify.com/playlist/created'],
      ['empty credentials', 'https://@open.spotify.com/playlist/created'],
      ['username', 'https://user@open.spotify.com/playlist/created'],
      ['password', 'https://user:secret@open.spotify.com/playlist/created'],
      ['javascript', 'javascript:alert(1)'],
      ['blob', 'blob:https://open.spotify.com/playlist/created'],
      ['malformed', 'not a URL'],
      ['missing', undefined],
      ['non-string', { url: 'https://open.spotify.com/playlist/created' }],
    ])('does not open unsafe %s playlist destinations', async (_label, destination) => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const addTracksToPlaylist = vi.fn().mockResolvedValue({});
      renderModal({
        addTracksToPlaylist,
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(destination)),
      });

      submitPlaylist();

      await waitFor(() => {
        expect(addTracksToPlaylist).toHaveBeenCalledOnce();
      });
      expect(getSafeSpotifyPlaylistUrl(destination)).toBeNull();
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('accepts only an exact safe Spotify HTTPS destination', () => {
      expect(getSafeSpotifyPlaylistUrl(
        'https://open.spotify.com/playlist/created',
      )).toBe('https://open.spotify.com/playlist/created');
    });

    it('keeps success state but omits navigation for an unsafe destination', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderModal({
        addTracksToPlaylist: vi.fn().mockResolvedValue({}),
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://evil.example/playlist/created',
        )),
      });

      submitPlaylist();

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(screen.queryByText(
        'Failed to create playlist. Please reload the page and try again',
      )).not.toBeInTheDocument();
      expect(openSpy).not.toHaveBeenCalled();
    });
});

describe('create-playlist route request lifecycle', () => {
  it('renders zero IDs with a recommendation link and no Spotify API or create button', async () => {
    renderRoute('/projects/spotify/recommend/create-playlist');

    const links = await screen.findAllByRole('link', {
      name: /recommendation page/i,
    });
    expect(links).not.toHaveLength(0);
    expect(links.every(link => (
      link.getAttribute('href') === '/projects/spotify/recommend'
    ))).toBe(true);
    expect(screen.queryByRole('button', {
      name: /create playlist/i,
    })).not.toBeInTheDocument();
    expect(authMocks.useGuard).not.toHaveBeenCalled();
  });

  it('requests tracks and the user concurrently exactly once', async () => {
    const tracksRequest = deferred<SpotifyApi.MultipleTracksResponse>();
    const userRequest = deferred<SpotifyApi.CurrentUsersProfileResponse>();
    const getTracks = vi.fn().mockReturnValue(tracksRequest.promise);
    const getMe = vi.fn().mockReturnValue(userRequest.promise);
    const getApi = mockSpotifyApi({ getMe, getTracks });

    renderRoute('/projects/spotify/recommend/create-playlist?trackIds=first&trackIds=second');

    await waitFor(() => {
      expect(getTracks).toHaveBeenCalledOnce();
      expect(getMe).toHaveBeenCalledOnce();
    });
    expect(getApi).toHaveBeenCalledOnce();
    expect(getTracks).toHaveBeenCalledWith(['first', 'second']);

    tracksRequest.resolve({
      tracks: [track('first'), null, track('second')],
    } as unknown as SpotifyApi.MultipleTracksResponse);
    userRequest.resolve(userProfile());

    expect(await screen.findByRole('heading', {
      name: 'First Track',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      name: 'Second Track',
    })).toBeVisible();
    expect(getTracks).toHaveBeenCalledOnce();
    expect(getMe).toHaveBeenCalledOnce();
  });

  it('keeps stale success from replacing tracks after the query changes', async () => {
    const oldTracks = deferred<SpotifyApi.MultipleTracksResponse>();
    const getTracks = vi.fn((ids: string[]) => (
      ids[0] === 'old'
        ? oldTracks.promise
        : Promise.resolve({ tracks: [track('new')] })
    ));
    const getMe = vi.fn().mockResolvedValue(userProfile());
    mockSpotifyApi({ getMe, getTracks });
    const { router } = renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=old',
    );

    await waitFor(() => {
      expect(getTracks).toHaveBeenCalledOnce();
    });
    await act(async () => {
      await router.navigate(
        '/projects/spotify/recommend/create-playlist?trackIds=new',
      );
    });
    expect(await screen.findByRole('heading', {
      name: 'New Track',
    })).toBeVisible();

    oldTracks.resolve({ tracks: [track('old')] });
    await act(async () => {
      await oldTracks.promise;
    });

    expect(screen.getByRole('heading', {
      name: 'New Track',
    })).toBeVisible();
    expect(screen.queryByRole('heading', {
      name: 'Old Track',
    })).not.toBeInTheDocument();
  });

  it('keeps stale rejection from changing the current UI', async () => {
    const oldTracks = deferred<SpotifyApi.MultipleTracksResponse>();
    const getTracks = vi.fn((ids: string[]) => (
      ids[0] === 'old'
        ? oldTracks.promise
        : Promise.resolve({ tracks: [track('new')] })
    ));
    mockSpotifyApi({
      getMe: vi.fn().mockResolvedValue(userProfile()),
      getTracks,
    });
    const { router } = renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=old',
    );

    await waitFor(() => {
      expect(getTracks).toHaveBeenCalledOnce();
    });
    await act(async () => {
      await router.navigate(
        '/projects/spotify/recommend/create-playlist?trackIds=new',
      );
    });
    expect(await screen.findByRole('heading', {
      name: 'New Track',
    })).toBeVisible();

    oldTracks.reject(new Error('RAW STALE FAILURE'));
    await act(async () => {
      await oldTracks.promise.catch(() => undefined);
    });

    expect(screen.getByRole('heading', {
      name: 'New Track',
    })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('RAW STALE FAILURE');
  });

  it('aborts pending work on unmount', async () => {
    const apiRequest = deferred<{
      getMe: ReturnType<typeof vi.fn>;
      getTracks: ReturnType<typeof vi.fn>;
    }>();
    const observedSignals: AbortSignal[] = [];
    vi.spyOn(AbortSignal.prototype, 'throwIfAborted').mockImplementation(
      function (this: AbortSignal) {
        observedSignals.push(this);
        if (this.aborted) throw new DOMException('Aborted', 'AbortError');
      },
    );
    const getApi = vi.fn(() => apiRequest.promise);
    authMocks.useGuard.mockReturnValue({ getApi });
    const { unmount } = renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=track',
    );

    await waitFor(() => {
      expect(getApi).toHaveBeenCalledOnce();
    });
    unmount();
    apiRequest.resolve({
      getMe: vi.fn(),
      getTracks: vi.fn(),
    });
    await act(async () => {
      await apiRequest.promise;
      await Promise.resolve();
    });

    expect(observedSignals.some(signal => signal.aborted)).toBe(true);
  });

  it('renders a safe generic error without navigation or raw provider data', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockSpotifyApi({
      getMe: vi.fn().mockResolvedValue(userProfile()),
      getTracks: vi.fn().mockRejectedValue(new Error('RAW TOKEN RESPONSE')),
    });
    const { router } = renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=track',
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /We were unable to load the recommended tracks\.\s*Please try again\./u,
    );
    expect(router.state.location.pathname).toBe(
      '/projects/spotify/recommend/create-playlist',
    );
    expect(document.body).not.toHaveTextContent('RAW TOKEN RESPONSE');
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('RAW TOKEN RESPONSE');
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('RAW TOKEN RESPONSE');
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain('RAW TOKEN RESPONSE');
  });
});

function renderRoute(initialEntry: string) {
  return renderWithRouter([
    {
      path: '/projects/spotify/recommend/create-playlist',
      Component: () => (
        <ChakraProvider theme={theme}>
          <SpotifyCreatePlaylistRoute />
        </ChakraProvider>
      ),
    },
  ], {
    initialEntries: [initialEntry],
  });
}

function renderModal({
  addTracksToPlaylist,
  createPlaylist,
}: {
  addTracksToPlaylist: ReturnType<typeof vi.fn>;
  createPlaylist: ReturnType<typeof vi.fn>;
}) {
  const disclosure = {
    getButtonProps: vi.fn(),
    getDisclosureProps: vi.fn(),
    isControlled: true,
    isOpen: true,
    onClose: vi.fn(),
    onOpen: vi.fn(),
    onToggle: vi.fn(),
  } as unknown as UseDisclosureReturn;
  const guardedSpotifyApi = {
    getApi: () => Promise.resolve({
      addTracksToPlaylist,
      createPlaylist,
    } as never),
  };

  return render(
    <ChakraProvider theme={theme}>
      <CreateSpotifyPlaylistModal
        createPlaylistDisclosure={disclosure}
        guardedSpotifyApi={guardedSpotifyApi}
        recommendedTracks={[track('first'), track('second')]}
        spotifyUserId='spotify-user'
      />
    </ChakraProvider>,
  );
}

function submitPlaylist() {
  fireEvent.change(screen.getByLabelText('Playlist name'), {
    target: { value: 'Created playlist' },
  });
  const submitButton = screen.getByRole('button', {
    name: 'Create Playlist',
  });
  fireEvent.click(submitButton);
  return submitButton;
}

function createdPlaylist(
  spotifyUrl: unknown,
): SpotifyApi.CreatePlaylistResponse {
  return {
    external_urls: {
      spotify: spotifyUrl,
    },
    id: 'created-playlist',
  } as SpotifyApi.CreatePlaylistResponse;
}

function mockSpotifyApi({
  getMe,
  getTracks,
}: {
  getMe: ReturnType<typeof vi.fn>;
  getTracks: ReturnType<typeof vi.fn>;
}) {
  const getApi = vi.fn(() => Promise.resolve({
    getMe,
    getTracks,
  }));
  authMocks.useGuard.mockReturnValue({
    getApi,
  });
  return getApi;
}

function track(id: string): SpotifyApi.TrackObjectFull {
  return {
    album: {
      images: [],
    },
    artists: [{
      id: 'artist',
      name: 'Artist',
    }],
    duration_ms: 120_000,
    id,
    name: `${id[0]?.toUpperCase()}${id.slice(1)} Track`,
    popularity: 50,
    preview_url: null,
    uri: `spotify:track:${id}`,
  } as unknown as SpotifyApi.TrackObjectFull;
}

function userProfile(): SpotifyApi.CurrentUsersProfileResponse {
  return {
    id: 'spotify-user',
  } as SpotifyApi.CurrentUsersProfileResponse;
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
