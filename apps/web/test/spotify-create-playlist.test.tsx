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
  createRef,
  StrictMode,
  Suspense,
  type ReactElement,
} from 'react';
import {
  parseRecommendedTrackIds,
} from '../src/routes/projects/spotify/recommend/create-playlist';
import SpotifyCreatePlaylistRoute from '../src/routes/projects/spotify/recommend/create-playlist';
import {
  CreateSpotifyPlaylistModal,
  getSafeSpotifyPlaylistUrl,
  spotifyPendingPlaylistStorageKey,
} from '../src/components/projects/spotify/playlist_generator/CreateSpotifyPlaylistModal';
import type {
  PkceGuardedSpotifyWebApiJs,
  SpotifyTokenInfo,
} from '../src/spotify-utils/auth/SpotifyAuthUtils';
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
  } as SpotifyTokenInfo | null,
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
  SpotifyRouteComponent: ({ children }: { children: React.ReactNode }) => (
    spotifyStoreState.spotifyTokenInfo
      ? children
      : <div data-testid="spotify-login-gate">Spotify login required</div>
  ),
}));

vi.mock('../src/spotify-utils/auth/RequireSpotifyScopesOrElseShowLogin', () => ({
  RequireSpotifyScopesOrElseShowLogin: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../src/components/utils/useNoShowBeforeRender', () => ({
  useNoShowBeforeRender: () => true,
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  authMocks.useGuard.mockReset();
  spotifyStoreState.spotifyTokenInfo = loggedInSpotifyTokenInfo;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const loggedInSpotifyTokenInfo = spotifyStoreState.spotifyTokenInfo;

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

  it('rejects track IDs longer than 64 characters', () => {
    expect(parseRecommendedTrackIds(
      new URLSearchParams({ trackIds: 'a'.repeat(64) }),
    )).toEqual({
      kind: 'valid',
      trackIds: ['a'.repeat(64)],
    });
    expect(parseRecommendedTrackIds(
      new URLSearchParams({ trackIds: 'a'.repeat(65) }),
    )).toEqual({ kind: 'invalid' });
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

  it.each([
    ['/projects/spotify/recommend/create-playlist?trackIds=bad-id', 'error'],
    ['/projects/spotify/recommend/create-playlist', 'info'],
  ])('renders %s guidance before Spotify login', async (path, status) => {
    spotifyStoreState.spotifyTokenInfo = null;

    renderRoute(path);

    expect(await screen.findByRole('alert')).toHaveAttribute(
      'data-status',
      status,
    );
    expect(screen.queryByTestId('spotify-login-gate')).not.toBeInTheDocument();
    expect(authMocks.useGuard).not.toHaveBeenCalled();
  });

  it('requires Spotify login only for valid non-empty IDs', async () => {
    spotifyStoreState.spotifyTokenInfo = null;

    renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=validTrack1',
    );

    expect(await screen.findByTestId('spotify-login-gate')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(authMocks.useGuard).not.toHaveBeenCalled();
  });
});

describe('playlist creation modal', () => {
    it('does not clean pending storage during an abandoned StrictMode render', () => {
      const storedValue = '{not json';
      sessionStorage.setItem(spotifyPendingPlaylistStorageKey, storedValue);

      renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
        wrapper: modal => <StrictMode>
          <Suspense fallback={<div>Speculative render abandoned</div>}>
            {modal}
            <SuspendDuringRender />
          </Suspense>
        </StrictMode>,
      });

      expect(screen.getByText('Speculative render abandoned')).toBeVisible();
      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).toBe(storedValue);
    });

    it.each([
      ['empty', ''],
      ['whitespace-only', '   '],
    ])('cleans %s pending storage after commit', async (_label, storedValue) => {
      sessionStorage.setItem(spotifyPendingPlaylistStorageKey, storedValue);

      renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      });

      await waitFor(() => {
        expect(sessionStorage.getItem(
          spotifyPendingPlaylistStorageKey,
        )).toBeNull();
      });
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
    });

    it('keeps an ambiguous create failure unrecoverable after remount', async () => {
      const createPlaylist = vi.fn().mockRejectedValue({
        response: 'RAW CREATE SECRET',
        statusText: 'RAW CREATE STATUS',
      });
      const replaceTracksInPlaylist = vi.fn();
      const firstView = renderModal({ createPlaylist, replaceTracksInPlaylist });

      submitPlaylist();

      await waitFor(() => {
        const errors = screen.getAllByText(
          'Failed to create playlist. Please reload the page and try again',
        );
        expect(errors.at(-1)).toBeVisible();
      });
      expect(document.body).not.toHaveTextContent('RAW CREATE SECRET');
      expect(document.body).not.toHaveTextContent('RAW CREATE STATUS');
      expect(replaceTracksInPlaylist).not.toHaveBeenCalled();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(readPendingPlaylistStorage()).toEqual({
        kind: 'unrecoverable',
        spotifyUserId: 'spotify-user',
        trackUris: ['spotify:track:first', 'spotify:track:second'],
      });
      expect(screen.queryByRole('button', {
        name: 'Create Playlist',
      })).not.toBeInTheDocument();

      const form = screen.getByRole('button', {
        name: 'Abandon playlist and reset',
      }).closest('form');
      if (!form) throw new Error('Expected the playlist form.');
      fireEvent.submit(form);
      expect(createPlaylist).toHaveBeenCalledOnce();

      firstView.unmount();
      const reloadedCreatePlaylist = vi.fn();
      renderModal({
        createPlaylist: reloadedCreatePlaylist,
        replaceTracksInPlaylist: vi.fn(),
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(reloadedCreatePlaylist).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', {
        name: 'Create Playlist',
      })).not.toBeInTheDocument();
    });

    it('retries after getApi fails before create with storage blocked', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const replaceTracksInPlaylist = vi.fn().mockResolvedValue({});
      const getApi = vi.fn<PkceGuardedSpotifyWebApiJs['getApi']>()
        .mockRejectedValueOnce({
          response: 'RAW GET API SECRET',
          statusText: 'RAW GET API STATUS',
        })
        .mockResolvedValue({
          createPlaylist,
          replaceTracksInPlaylist,
        } as never);
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('storage write failure');
      });
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new DOMException('storage removal failure');
      });
      const {
        remountModal,
        unmountModal,
      } = renderModal({
        createPlaylist,
        getApi,
        replaceTracksInPlaylist,
      });

      submitPlaylist();

      await waitFor(() => {
        const errors = screen.getAllByText(
          'Failed to create playlist. Please reload the page and try again',
        );
        expect(errors.at(-1)).toBeVisible();
      });
      expect(getApi).toHaveBeenCalledOnce();
      expect(createPlaylist).not.toHaveBeenCalled();
      expect(document.body).not.toHaveTextContent('RAW GET API SECRET');
      expect(document.body).not.toHaveTextContent('RAW GET API STATUS');

      unmountModal();
      remountModal();

      await waitFor(() => {
        expect(screen.getByRole('button', {
          name: 'Create Playlist',
        })).toBeEnabled();
      });
      expect(screen.queryByText(
        'A playlist may have been created, but we cannot complete it automatically.',
      )).not.toBeInTheDocument();

      setItem.mockRestore();
      removeItem.mockRestore();
      submitPlaylist();

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(getApi).toHaveBeenCalledTimes(2);
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
    });

    it('shows partial success and locks fields after track replacement fails', async () => {
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const replaceTracksInPlaylist = vi.fn().mockImplementation(() => {
        expect(sessionStorage.getItem(
          spotifyPendingPlaylistStorageKey,
        )).not.toBeNull();
        return Promise.reject(Object.assign(new Error('RAW REPLACE SECRET'), {
          response: 'RAW REPLACE SECRET',
          statusText: 'RAW REPLACE STATUS',
        }));
      });
      renderModal({ createPlaylist, replaceTracksInPlaylist });

      submitPlaylist({
        collaborative: true,
        description: 'Recovered description',
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );
      expect(document.body).not.toHaveTextContent('RAW REPLACE SECRET');
      expect(document.body).not.toHaveTextContent('RAW REPLACE STATUS');
      expect(document.body).not.toHaveTextContent(
        'Failed to create playlist. Please reload the page and try again',
      );
      expect(replaceTracksInPlaylist).toHaveBeenCalledWith(
        'createdplaylist',
        ['spotify:track:first', 'spotify:track:second'],
      );
      expect(readPendingPlaylistStorage()).toEqual({
        formValues: {
          playlistDescription: 'Recovered description',
          playlistName: 'Created playlist',
          playlistShouldBeCollaborative: true,
          playlistShouldBePublic: false,
        },
        playlistId: 'createdplaylist',
        spotifyUrl: 'https://open.spotify.com/playlist/created',
        spotifyUserId: 'spotify-user',
        trackUris: ['spotify:track:first', 'spotify:track:second'],
      });
      expect(screen.getByLabelText('Playlist name')).toBeDisabled();
      expect(screen.getByLabelText('Playlist description')).toBeDisabled();
      expect(screen.getByLabelText('Should playlist be public?')).toBeDisabled();
      expect(screen.getByLabelText('Should playlist be collaborative?')).toBeDisabled();
      expect(screen.getByRole('button', {
        name: 'Retry adding tracks',
      })).toBeEnabled();
    });

    it('retries exact replacement without creating a second playlist', async () => {
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const replaceTracksInPlaylist = vi.fn()
        .mockRejectedValueOnce(new Error('RAW FIRST REPLACE FAILURE'))
        .mockResolvedValueOnce({});
      vi.spyOn(window, 'open').mockImplementation(() => null);
      renderModal({ createPlaylist, replaceTracksInPlaylist });

      submitPlaylist();

      await waitFor(() => {
        expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );

      fireEvent.click(screen.getByRole('button', {
        name: 'Retry adding tracks',
      }));

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(replaceTracksInPlaylist).toHaveBeenCalledTimes(2);
      expect(replaceTracksInPlaylist).toHaveBeenNthCalledWith(
        1,
        'createdplaylist',
        ['spotify:track:first', 'spotify:track:second'],
      );
      expect(replaceTracksInPlaylist).toHaveBeenNthCalledWith(
        2,
        'createdplaylist',
        ['spotify:track:first', 'spotify:track:second'],
      );
      expect(sessionStorage.getItem(spotifyPendingPlaylistStorageKey)).toBeNull();
    });

    it('synchronously rejects re-entrant submits before disabled state commits', async () => {
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      renderModal({
        createPlaylist,
        replaceTracksInPlaylist: vi.fn(),
      });
      fireEvent.change(screen.getByLabelText('Playlist name'), {
        target: { value: 'Created playlist' },
      });
      const submitButton = screen.getByRole('button', {
        name: 'Create Playlist',
      });
      const form = submitButton.closest('form');
      if (!form) throw new Error('Expected the playlist form.');

      act(() => {
        form.dispatchEvent(new Event('submit', {
          bubbles: true,
          cancelable: true,
        }));
        form.dispatchEvent(new Event('submit', {
          bubbles: true,
          cancelable: true,
        }));
      });

      await waitFor(() => {
        expect(createPlaylist).toHaveBeenCalled();
      });
      expect(createPlaylist).toHaveBeenCalledOnce();

      playlistRequest.reject(new Error('expected test failure'));
      await act(async () => {
        await playlistRequest.promise.catch(() => undefined);
      });
    });

    it('prevents duplicate submission while loading and blocks retries after failure', async () => {
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      renderModal({
        createPlaylist,
        replaceTracksInPlaylist: vi.fn(),
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
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(submitButton).not.toBeInTheDocument();
      expect(createPlaylist).toHaveBeenCalledOnce();
    });

    it('rejoins a deferred create after the modal component remounts', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      const replaceTracksInPlaylist = vi.fn().mockResolvedValue({});
      const {
        remountModal,
        unmountModal,
      } = renderModal({
        createPlaylist,
        replaceTracksInPlaylist,
      });

      submitPlaylist({ description: 'Remounted attempt' });
      await waitFor(() => {
        expect(createPlaylist).toHaveBeenCalledOnce();
      });

      const storedPreflight = sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      );
      expect.soft(storedPreflight).not.toBeNull();
      if (storedPreflight) {
        expect.soft(JSON.parse(storedPreflight)).toEqual({
          kind: 'unrecoverable',
          spotifyUserId: 'spotify-user',
          trackUris: ['spotify:track:first', 'spotify:track:second'],
        });
      }

      unmountModal();
      remountModal();

      const remountedSubmit = screen.getByRole('button', {
        name: /Create Playlist/u,
      });
      const remountedName = screen.getByLabelText('Playlist name');
      expect.soft(remountedName).toBeDisabled();
      expect.soft(screen.getByLabelText('Playlist description')).toBeDisabled();
      expect.soft(remountedSubmit).toBeDisabled();
      expect.soft(remountedSubmit).toHaveAttribute('data-loading');
      const abandonButton = screen.queryByRole('button', {
        name: 'Abandon playlist and reset',
      });
      expect.soft(abandonButton).not.toBeNull();
      if (abandonButton) expect.soft(abandonButton).toBeDisabled();

      const remountedForm = remountedSubmit.closest('form');
      if (!remountedForm) throw new Error('Expected the remounted playlist form.');
      fireEvent.submit(remountedForm);
      expect.soft(createPlaylist).toHaveBeenCalledOnce();

      playlistRequest.resolve(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      await act(async () => {
        await playlistRequest.promise;
      });

      await waitFor(() => {
        expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
      });
      expect(await screen.findByText(
        'Successfully created playlist.',
      )).toBeVisible();
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).toBeNull();
    });

    it('keeps a reopened Formik tree locked until a deferred create failure settles', async () => {
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      const {
        disclosure,
        setOpen,
      } = renderModal({
        createPlaylist,
        replaceTracksInPlaylist: vi.fn(),
      });

      submitPlaylist();
      await waitFor(() => {
        expect(createPlaylist).toHaveBeenCalledOnce();
      });

      closePlaylistModal('footer close');
      expect(disclosure.onClose).toHaveBeenCalledOnce();
      setOpen(false);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      setOpen(true);

      const reopenedSubmit = screen.getByRole('button', {
        name: /Create Playlist/u,
      });
      const reopenedName = screen.getByLabelText('Playlist name');
      expect.soft(reopenedName).toBeDisabled();
      expect.soft(screen.getByLabelText('Playlist description')).toBeDisabled();
      expect.soft(reopenedSubmit).toBeDisabled();
      expect.soft(reopenedSubmit).toHaveAttribute('data-loading');

      const reopenedForm = reopenedSubmit.closest('form');
      if (!reopenedForm) throw new Error('Expected the reopened playlist form.');
      fireEvent.submit(reopenedForm);
      expect.soft(createPlaylist).toHaveBeenCalledOnce();

      playlistRequest.reject({
        response: 'RAW REOPENED CREATE SECRET',
        statusText: 'RAW REOPENED CREATE STATUS',
      });
      await act(async () => {
        await playlistRequest.promise.catch(() => undefined);
      });

      await waitFor(() => {
        const errors = screen.getAllByText(
          'Failed to create playlist. Please reload the page and try again',
        );
        expect(errors.at(-1)).toBeVisible();
      });
      expect(document.body).not.toHaveTextContent('RAW REOPENED CREATE SECRET');
      expect(document.body).not.toHaveTextContent('RAW REOPENED CREATE STATUS');
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(readPendingPlaylistStorage()).toEqual({
        kind: 'unrecoverable',
        spotifyUserId: 'spotify-user',
        trackUris: ['spotify:track:first', 'spotify:track:second'],
      });
      expect(screen.getByLabelText('Playlist name')).toBeDisabled();
      expect(screen.getByLabelText('Playlist description')).toBeDisabled();
      expect(screen.queryByRole('button', {
        name: 'Create Playlist',
      })).not.toBeInTheDocument();
      expect(screen.getByRole('button', {
        name: 'Abandon playlist and reset',
      })).toBeEnabled();
      expect(createPlaylist).toHaveBeenCalledOnce();
    });

    it.each([
      'Escape',
      'overlay',
      'header close',
      'footer close',
    ] as const)('allows %s while a deferred create continues', async closePath => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      const replaceTracksInPlaylist = vi.fn().mockResolvedValue({});
      const {
        disclosure,
        setOpen,
        trigger,
      } = renderModal({
        createPlaylist,
        replaceTracksInPlaylist,
      });

      submitPlaylist();

      await waitFor(() => {
        expect(createPlaylist).toHaveBeenCalledOnce();
      });
      const closeButtons = screen.getAllByRole('button', { name: 'Close' });
      expect(closeButtons).toHaveLength(2);
      expect(closeButtons.every(button => !button.hasAttribute('disabled'))).toBe(true);

      closePlaylistModal(closePath);

      expect(disclosure.onClose).toHaveBeenCalledOnce();
      setOpen(false);
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });

      playlistRequest.resolve(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      await act(async () => {
        await playlistRequest.promise;
      });
      await waitFor(() => {
        expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
      });
      await waitFor(() => {
        expect(screen.getByText(
          'Successfully created playlist.',
        )).toBeVisible();
      });
      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).toBeNull();
    });

    it('reopens recoverable replacement failure without creating a duplicate', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const replacementRequest = deferred<unknown>();
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const replaceTracksInPlaylist = vi.fn()
        .mockReturnValueOnce(replacementRequest.promise)
        .mockResolvedValueOnce({});
      const {
        disclosure,
        setOpen,
      } = renderModal({
        createPlaylist,
        replaceTracksInPlaylist,
      });

      submitPlaylist({ description: 'Closed recovery' });
      await waitFor(() => {
        expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
      });
      closePlaylistModal('footer close');
      expect(disclosure.onClose).toHaveBeenCalledOnce();
      setOpen(false);

      replacementRequest.reject(new Error('replacement failed while closed'));
      await act(async () => {
        await replacementRequest.promise.catch(() => undefined);
      });
      expect(readPendingPlaylistStorage()).toHaveProperty(
        'playlistId',
        'createdplaylist',
      );

      setOpen(true);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );
      expect(screen.getByLabelText('Playlist description')).toHaveValue(
        'Closed recovery',
      );
      fireEvent.click(screen.getByRole('button', {
        name: 'Retry adding tracks',
      }));

      expect(await screen.findByText(
        'Successfully created playlist.',
      )).toBeVisible();
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(replaceTracksInPlaylist).toHaveBeenCalledTimes(2);
      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).toBeNull();
    });

    it('finishes authoritative storage and toast work after modal unmount', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const playlistRequest = deferred<SpotifyApi.CreatePlaylistResponse>();
      const createPlaylist = vi.fn().mockReturnValue(playlistRequest.promise);
      const replaceTracksInPlaylist = vi.fn().mockResolvedValue({});
      const {
        disclosure,
        unmountModal,
      } = renderModal({
        createPlaylist,
        replaceTracksInPlaylist,
      });

      submitPlaylist();
      await waitFor(() => {
        expect(createPlaylist).toHaveBeenCalledOnce();
      });
      unmountModal();

      playlistRequest.resolve(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      await act(async () => {
        await playlistRequest.promise;
      });

      await waitFor(() => {
        expect(screen.getByText(
          'Successfully created playlist.',
        )).toBeVisible();
      });
      expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).toBeNull();
      expect(disclosure.onClose).not.toHaveBeenCalled();
    });

    it('opens a safe Spotify destination immediately and renders a fallback link', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const { setOpen } = renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created?si=one',
        )),
        replaceTracksInPlaylist: vi.fn().mockResolvedValue({}),
      });

      submitPlaylist();

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(openSpy).toHaveBeenCalledOnce();
      expect(openSpy).toHaveBeenCalledWith(
        'https://open.spotify.com/playlist/created?si=one',
        '_blank',
        'noopener,noreferrer',
      );
      expect(screen.getByRole('link', {
        name: 'Open playlist on Spotify',
      })).toHaveAttribute(
        'href',
        'https://open.spotify.com/playlist/created?si=one',
      );
      expect(screen.getByRole('link', {
        name: 'Open playlist on Spotify',
      })).toHaveAttribute('target', '_blank');
      expect(screen.getByRole('link', {
        name: 'Open playlist on Spotify',
      })).toHaveAttribute('rel', 'noopener noreferrer');
      expect(sessionStorage.getItem(spotifyPendingPlaylistStorageKey)).toBeNull();

      setOpen(false);
      setOpen(true);
      expect(screen.getByLabelText('Playlist name')).toHaveValue('');
      expect(screen.getByLabelText('Playlist description')).toHaveValue('');
      expect(screen.getByRole('link', {
        name: 'Open playlist on Spotify',
      })).toBeVisible();
      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(3);
    });

    it('keeps the persistent fallback when opening the safe destination throws', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => {
        throw new Error('RAW WINDOW OPEN FAILURE');
      });
      renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created',
        )),
        replaceTracksInPlaylist: vi.fn().mockResolvedValue({}),
      });

      submitPlaylist();

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(screen.getByRole('link', {
        name: 'Open playlist on Spotify',
      })).toHaveAttribute(
        'href',
        'https://open.spotify.com/playlist/created',
      );
      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(3);
      expect(document.body).not.toHaveTextContent('RAW WINDOW OPEN FAILURE');
    });

    it('keeps pending recovery across close and reopen', async () => {
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const replaceTracksInPlaylist = vi.fn().mockRejectedValue(new Error('lost response'));
      const { disclosure, setOpen } = renderModal({
        createPlaylist,
        replaceTracksInPlaylist,
      });

      submitPlaylist({ description: 'Keep this value' });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );

      expect(screen.getAllByRole('button', { name: 'Close' }).every(
        button => !button.hasAttribute('disabled'),
      )).toBe(true);
      fireEvent.keyDown(screen.getByRole('dialog'), {
        code: 'Escape',
        key: 'Escape',
      });
      expect(disclosure.onClose).toHaveBeenCalledOnce();
      setOpen(false);
      setOpen(true);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );
      expect(screen.getByLabelText('Playlist name')).toHaveValue('Created playlist');
      expect(screen.getByLabelText('Playlist description')).toHaveValue('Keep this value');
      expect(screen.getByLabelText('Playlist name')).toBeDisabled();
      expect(createPlaylist).toHaveBeenCalledOnce();
    });

    it('restores pending recovery after remount and retries replacement only', async () => {
      const firstCreatePlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      const firstReplacement = vi.fn().mockRejectedValue(new Error('lost response'));
      const firstView = renderModal({
        createPlaylist: firstCreatePlaylist,
        replaceTracksInPlaylist: firstReplacement,
      });

      submitPlaylist({ description: 'Reloaded description' });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );
      firstView.unmount();

      const reloadedCreatePlaylist = vi.fn();
      const reloadedReplacement = vi.fn().mockResolvedValue({});
      vi.spyOn(window, 'open').mockImplementation(() => null);
      renderModal({
        createPlaylist: reloadedCreatePlaylist,
        replaceTracksInPlaylist: reloadedReplacement,
      });

      expect(screen.getByLabelText('Playlist name')).toHaveValue('Created playlist');
      expect(screen.getByLabelText('Playlist description')).toHaveValue('Reloaded description');
      expect(screen.getByLabelText('Playlist name')).toBeDisabled();
      fireEvent.click(screen.getByRole('button', {
        name: 'Retry adding tracks',
      }));

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(firstCreatePlaylist).toHaveBeenCalledOnce();
      expect(reloadedCreatePlaylist).not.toHaveBeenCalled();
      expect(reloadedReplacement).toHaveBeenCalledOnce();
      expect(reloadedReplacement).toHaveBeenCalledWith(
        'createdplaylist',
        ['spotify:track:first', 'spotify:track:second'],
      );
    });

    it.each([
      ['malformed JSON', '{not json'],
      ['malformed record', JSON.stringify({ playlistId: 'createdplaylist' })],
      ['unsafe stored URL', JSON.stringify(pendingPlaylistRecord({
        spotifyUrl: 'https://evil.example/playlist/created',
      }))],
    ])('clears %s pending storage safely', (_label, storedValue) => {
      sessionStorage.setItem(spotifyPendingPlaylistStorageKey, storedValue);

      expect(() => renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      })).not.toThrow();

      expect(sessionStorage.getItem(spotifyPendingPlaylistStorageKey)).toBeNull();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Playlist name')).toBeEnabled();
    });

    it.each([
      ['another user', pendingPlaylistRecord({ spotifyUserId: 'another-user' })],
      ['another URI order', pendingPlaylistRecord({
        trackUris: ['spotify:track:second', 'spotify:track:first'],
      })],
    ])('clears pending storage scoped to %s', (_label, record) => {
      sessionStorage.setItem(
        spotifyPendingPlaylistStorageKey,
        JSON.stringify(record),
      );

      renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      });

      expect(sessionStorage.getItem(spotifyPendingPlaylistStorageKey)).toBeNull();
      expect(screen.getByLabelText('Playlist name')).toBeEnabled();
      expect(screen.queryByRole('button', {
        name: 'Retry adding tracks',
      })).not.toBeInTheDocument();
    });

    it('does not revive volatile recovery after malformed cleanup fails', async () => {
      const firstView = renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created',
        )),
        replaceTracksInPlaylist: vi.fn().mockRejectedValue(new Error('lost response')),
      });
      submitPlaylist();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );
      firstView.unmount();

      sessionStorage.setItem(spotifyPendingPlaylistStorageKey, '{not json');
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new DOMException('transient storage failure');
        });
      const cleanupView = renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      });
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
      cleanupView.unmount();
      removeItem.mockRestore();

      vi.spyOn(window, 'open').mockImplementation(() => null);
      renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created',
        )),
        replaceTracksInPlaylist: vi.fn().mockResolvedValue({}),
      });
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
      expect(screen.queryByRole('button', {
        name: 'Retry adding tracks',
      })).not.toBeInTheDocument();

      submitPlaylist();
      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
    });

    it('clears pending recovery only when explicitly abandoned', () => {
      sessionStorage.setItem(
        spotifyPendingPlaylistStorageKey,
        JSON.stringify(pendingPlaylistRecord()),
      );
      const { disclosure, setOpen } = renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      });

      fireEvent.click(screen.getByRole('button', {
        name: 'Abandon playlist and reset',
      }));

      expect(sessionStorage.getItem(spotifyPendingPlaylistStorageKey)).toBeNull();
      expect(disclosure.onClose).toHaveBeenCalledOnce();
      setOpen(false);
      setOpen(true);
      expect(screen.getByLabelText('Playlist name')).toBeEnabled();
      expect(screen.getByLabelText('Playlist name')).toHaveValue('');
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
    });

    it('stores no unsafe URL while partial recovery remains pending', async () => {
      const replaceTracksInPlaylist = vi.fn().mockRejectedValue(new Error('replacement failed'));
      renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://evil.example/playlist/created',
        )),
        replaceTracksInPlaylist,
      });

      submitPlaylist();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your playlist was created, but its tracks are not confirmed.',
      );
      expect(readPendingPlaylistStorage()).not.toHaveProperty('spotifyUrl');
      expect(screen.queryByRole('link', {
        name: 'Open playlist on Spotify',
      })).not.toBeInTheDocument();
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
      const replaceTracksInPlaylist = vi.fn().mockResolvedValue({});
      renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(destination)),
        replaceTracksInPlaylist,
      });

      submitPlaylist();

      await waitFor(() => {
        expect(replaceTracksInPlaylist).toHaveBeenCalledOnce();
      });
      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(getSafeSpotifyPlaylistUrl(destination)).toBeNull();
      expect(openSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole('link', {
        name: 'Open playlist on Spotify',
      })).not.toBeInTheDocument();
    });

    it('accepts only an exact safe Spotify HTTPS destination', () => {
      expect(getSafeSpotifyPlaylistUrl(
        'https://open.spotify.com/playlist/created',
      )).toBe('https://open.spotify.com/playlist/created');
    });

    it('keeps success state but omits navigation for an unsafe destination', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://evil.example/playlist/created',
        )),
        replaceTracksInPlaylist: vi.fn().mockResolvedValue({}),
      });

      submitPlaylist();

      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(screen.queryByText(
        'Failed to create playlist. Please reload the page and try again',
      )).not.toBeInTheDocument();
      expect(openSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole('link', {
        name: 'Open playlist on Spotify',
      })).not.toBeInTheDocument();
    });

    it('blocks duplicate creation after an invalid created-playlist response', async () => {
      const invalidPlaylistId = '<RAW INVALID PLAYLIST ID>';
      const createPlaylist = vi.fn().mockResolvedValue({
        external_urls: {
          spotify: 'RAW INVALID PROVIDER URL',
        },
        id: invalidPlaylistId,
      } as SpotifyApi.CreatePlaylistResponse);
      const replaceTracksInPlaylist = vi.fn();
      renderModal({ createPlaylist, replaceTracksInPlaylist });

      submitPlaylist();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(replaceTracksInPlaylist).not.toHaveBeenCalled();
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(document.body).not.toHaveTextContent(invalidPlaylistId);
      expect(document.body).not.toHaveTextContent('RAW INVALID PROVIDER URL');
      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).not.toContain(invalidPlaylistId);
      expect(readPendingPlaylistStorage()).toEqual({
        kind: 'unrecoverable',
        spotifyUserId: 'spotify-user',
        trackUris: ['spotify:track:first', 'spotify:track:second'],
      });

      const form = screen.getByRole('button', {
        name: 'Abandon playlist and reset',
      }).closest('form');
      if (!form) throw new Error('Expected the playlist form.');
      fireEvent.submit(form);
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(screen.queryByRole('button', {
        name: 'Create Playlist',
      })).not.toBeInTheDocument();
    });

    it('blocks duplicate creation when pending-record validation fails', async () => {
      const createPlaylist = vi.fn().mockResolvedValue(createdPlaylist(
        'https://open.spotify.com/playlist/created',
      ));
      renderModal({
        createPlaylist,
        replaceTracksInPlaylist: vi.fn(),
      });

      fireEvent.change(screen.getByLabelText('Playlist name'), {
        target: { value: 'x'.repeat(1_001) },
      });
      fireEvent.click(screen.getByRole('button', {
        name: 'Create Playlist',
      }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(createPlaylist).toHaveBeenCalledOnce();
      expect(screen.queryByRole('button', {
        name: 'Create Playlist',
      })).not.toBeInTheDocument();
    });

    it('restores unrecoverable creation state after remount without retrying', async () => {
      const firstCreatePlaylist = vi.fn().mockResolvedValue({
        external_urls: { spotify: 'https://open.spotify.com/playlist/unsafe' },
        id: '',
      } as SpotifyApi.CreatePlaylistResponse);
      const firstView = renderModal({
        createPlaylist: firstCreatePlaylist,
        replaceTracksInPlaylist: vi.fn(),
      });

      submitPlaylist();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      firstView.unmount();

      const reloadedCreatePlaylist = vi.fn();
      renderModal({
        createPlaylist: reloadedCreatePlaylist,
        replaceTracksInPlaylist: vi.fn(),
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      expect(reloadedCreatePlaylist).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', {
        name: 'Create Playlist',
      })).not.toBeInTheDocument();
      expect(screen.getByRole('button', {
        name: 'Abandon playlist and reset',
      })).toBeEnabled();
    });

    it('abandons unrecoverable creation state and resets safely', async () => {
      sessionStorage.setItem(
        spotifyPendingPlaylistStorageKey,
        JSON.stringify({
          kind: 'unrecoverable',
          spotifyUserId: 'spotify-user',
          trackUris: ['spotify:track:first', 'spotify:track:second'],
        }),
      );
      const { setOpen } = renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A playlist may have been created, but we cannot complete it automatically.',
      );
      fireEvent.click(screen.getByRole('button', {
        name: 'Abandon playlist and reset',
      }));

      expect(sessionStorage.getItem(
        spotifyPendingPlaylistStorageKey,
      )).toBeNull();
      setOpen(false);
      setOpen(true);
      expect(screen.getByLabelText('Playlist name')).toHaveValue('');
      expect(screen.getByRole('button', {
        name: 'Create Playlist',
      })).toBeEnabled();
    });

    it('does not resurrect completed recovery when storage removal fails', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
        .mockImplementationOnce(() => {
          throw new DOMException('transient storage failure');
        });
      const firstView = renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created',
        )),
        replaceTracksInPlaylist: vi.fn().mockResolvedValue({}),
      });

      submitPlaylist();
      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(readPendingPlaylistStorage()).toEqual({
        kind: 'completed',
        spotifyUserId: 'spotify-user',
        trackUris: ['spotify:track:first', 'spotify:track:second'],
      });
      firstView.unmount();
      removeItem.mockRestore();

      const reloadedCreatePlaylist = vi.fn();
      const reloadedReplacement = vi.fn();
      renderModal({
        createPlaylist: reloadedCreatePlaylist,
        replaceTracksInPlaylist: reloadedReplacement,
      });

      await waitFor(() => {
        expect(screen.getByRole('button', {
          name: 'Create Playlist',
        })).toBeEnabled();
      });
      expect(screen.queryByText(
        'Your playlist was created, but its tracks are not confirmed.',
      )).not.toBeInTheDocument();
      expect(reloadedCreatePlaylist).not.toHaveBeenCalled();
      expect(reloadedReplacement).not.toHaveBeenCalled();
    });

    it('uses a volatile tombstone when completion storage is unavailable', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
      const replaceTracksInPlaylist = vi.fn().mockImplementation(() => {
        setItem.mockImplementation(() => {
          throw new DOMException('storage write failure');
        });
        removeItem.mockImplementation(() => {
          throw new DOMException('storage removal failure');
        });
        return Promise.resolve({});
      });
      const firstView = renderModal({
        createPlaylist: vi.fn().mockResolvedValue(createdPlaylist(
          'https://open.spotify.com/playlist/created',
        )),
        replaceTracksInPlaylist,
      });

      submitPlaylist();
      expect(await screen.findByText('Successfully created playlist.')).toBeVisible();
      expect(readPendingPlaylistStorage()).toHaveProperty(
        'playlistId',
        'createdplaylist',
      );
      firstView.unmount();
      setItem.mockRestore();
      removeItem.mockRestore();

      renderModal({
        createPlaylist: vi.fn(),
        replaceTracksInPlaylist: vi.fn(),
      });

      await waitFor(() => {
        expect(screen.getByRole('button', {
          name: 'Create Playlist',
        })).toBeEnabled();
      });
      expect(screen.queryByText(
        'Your playlist was created, but its tracks are not confirmed.',
      )).not.toBeInTheDocument();
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

  it('shows the actual zero-track result without a create action', async () => {
    mockSpotifyApi({
      getMe: vi.fn().mockResolvedValue(userProfile()),
      getTracks: vi.fn().mockResolvedValue({
        tracks: [null, null],
      }),
    });

    renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=first&trackIds=second',
    );

    expect(await screen.findByRole('heading', {
      name: 'Create your Spotify playlist - 0 tracks',
    })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We were unable to load any of the recommended tracks.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please return to the recommendation page and try again.',
    );
    expect(screen.queryByRole('button', {
      name: 'Create playlist',
    })).not.toBeInTheDocument();
  });

  it('warns about missing tracks and creates from only loaded tracks', async () => {
    mockSpotifyApi({
      getMe: vi.fn().mockResolvedValue(userProfile()),
      getTracks: vi.fn().mockResolvedValue({
        tracks: [track('first'), null, track('second')],
      }),
    });

    renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=first&trackIds=missing&trackIds=second',
    );

    expect(await screen.findByRole('heading', {
      name: 'Create your Spotify playlist - 2 tracks',
    })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Some recommended tracks are unavailable.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your playlist will include the tracks shown below.',
    );
    expect(screen.getByRole('button', {
      name: 'Create playlist',
    })).toBeEnabled();
    expect(screen.getByRole('heading', {
      name: 'First Track',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      name: 'Second Track',
    })).toBeVisible();
  });

  it('keeps the create trigger mounted and restores focus after Escape', async () => {
    mockSpotifyApi({
      getMe: vi.fn().mockResolvedValue(userProfile()),
      getTracks: vi.fn().mockResolvedValue({
        tracks: [track('first'), track('second')],
      }),
    });
    renderRoute(
      '/projects/spotify/recommend/create-playlist?trackIds=first&trackIds=second',
    );

    const trigger = await screen.findByRole('button', {
      name: 'Create playlist',
    });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(await screen.findByRole('dialog'), {
      code: 'Escape',
      key: 'Escape',
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
    expect(trigger).toBeVisible();
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

  it('ignores SDK acquisition that resolves after unmount', async () => {
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
  createPlaylist,
  getApi,
  replaceTracksInPlaylist,
  wrapper,
}: {
  createPlaylist: ReturnType<typeof vi.fn>;
  getApi?: PkceGuardedSpotifyWebApiJs['getApi'];
  replaceTracksInPlaylist: ReturnType<typeof vi.fn>;
  wrapper?: (modal: ReactElement) => ReactElement;
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
    getApi: getApi ?? (() => Promise.resolve({
      createPlaylist,
      replaceTracksInPlaylist,
    } as never)),
  };
  const triggerRef = createRef<HTMLButtonElement>();

  const modal = (showModal = true) => (
    <ChakraProvider theme={theme}>
      <button ref={triggerRef} type='button'>Create playlist trigger</button>
      {showModal && <CreateSpotifyPlaylistModal
          createPlaylistDisclosure={disclosure as unknown as UseDisclosureReturn}
          finalFocusRef={triggerRef}
          guardedSpotifyApi={guardedSpotifyApi}
          recommendedTracks={[track('first'), track('second')]}
          spotifyUserId='spotify-user'
        />}
    </ChakraProvider>
  );
  const view = render(wrapper ? wrapper(modal()) : modal());
  const setOpen = (isOpen: boolean) => {
    disclosure.isOpen = isOpen;
    view.rerender(modal());
  };

  return {
    ...view,
    disclosure,
    setOpen,
    trigger: triggerRef.current,
    unmountModal: () => {
      view.rerender(modal(false));
    },
    remountModal: () => {
      view.rerender(modal());
    },
  };
}

function closePlaylistModal(
  closePath: 'Escape' | 'overlay' | 'header close' | 'footer close',
) {
  if (closePath === 'Escape') {
    fireEvent.keyDown(screen.getByRole('dialog'), {
      code: 'Escape',
      key: 'Escape',
    });
    return;
  }
  if (closePath === 'overlay') {
    const overlayContainer = document.querySelector(
      '.chakra-modal__content-container',
    );
    if (!(overlayContainer instanceof HTMLElement)) {
      throw new Error('Expected the modal overlay container.');
    }
    fireEvent.mouseDown(overlayContainer);
    fireEvent.click(overlayContainer);
    return;
  }

  const closeButtons = screen.getAllByRole('button', { name: 'Close' });
  fireEvent.click(
    closePath === 'header close'
      ? closeButtons[0]
      : closeButtons[closeButtons.length - 1],
  );
}

const suspendedRender = new Promise<never>(() => undefined);

function SuspendDuringRender(): never {
  // React Suspense abandons this speculative tree when a component throws a promise.
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw suspendedRender;
}

function submitPlaylist({
  collaborative = false,
  description = '',
}: {
  collaborative?: boolean;
  description?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText('Playlist name'), {
    target: { value: 'Created playlist' },
  });
  if (description) {
    fireEvent.change(screen.getByLabelText('Playlist description'), {
      target: { value: description },
    });
  }
  if (collaborative) {
    fireEvent.click(screen.getByLabelText('Should playlist be collaborative?'));
  }
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
    id: 'createdplaylist',
  } as SpotifyApi.CreatePlaylistResponse;
}

type PendingPlaylistRecord = {
  formValues: {
    playlistDescription: string;
    playlistName: string;
    playlistShouldBeCollaborative: boolean;
    playlistShouldBePublic: boolean;
  };
  playlistId: string;
  spotifyUrl?: string;
  spotifyUserId: string;
  trackUris: string[];
};

function pendingPlaylistRecord(
  overrides: Partial<PendingPlaylistRecord> = {},
): PendingPlaylistRecord {
  return {
    formValues: {
      playlistDescription: 'Recovered description',
      playlistName: 'Created playlist',
      playlistShouldBeCollaborative: false,
      playlistShouldBePublic: true,
    },
    playlistId: 'createdplaylist',
    spotifyUrl: 'https://open.spotify.com/playlist/created',
    spotifyUserId: 'spotify-user',
    trackUris: ['spotify:track:first', 'spotify:track:second'],
    ...overrides,
  };
}

function readPendingPlaylistStorage() {
  const storedValue = sessionStorage.getItem(spotifyPendingPlaylistStorageKey);
  if (!storedValue) throw new Error('Expected pending playlist storage.');
  return JSON.parse(storedValue) as Record<string, unknown>;
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
