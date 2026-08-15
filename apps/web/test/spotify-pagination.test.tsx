import { ChakraProvider } from '@chakra-ui/react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizePageSize,
  PaginatedSpotifyDisplay,
} from '../src/components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyPlaylist } from '../src/components/projects/spotify/views/SpotifyPlaylist';
import { SpotifyTrack } from '../src/components/projects/spotify/views/SpotifyTrack';
import { SpotifyArtist } from '../src/components/projects/spotify/views/SpotifyArtist';
import { SpotifyEpisode } from '../src/components/projects/spotify/views/SpotifyEpisode';
import SpotifyPlaylistViewRoute from '../src/routes/projects/spotify/playlists/[playlistId]';
import type { SpotifyPlaylistDetails } from '../src/api/spotifyLoaderTypes';
import { theme } from '../src/theme';
import { renderWithRouter } from './render';
import { expectNoAxeViolations } from './a11y';
import axios from 'axios';

type PageItem = {
  id: string;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Accessible Spotify pagination', () => {
  it('renders named native controls without focusing the initial results', async () => {
    const dataProducer = vi.fn().mockResolvedValue(page('current'));
    const { container } = renderPaginator(dataProducer);

    const results = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    const pagination = screen.getByRole('navigation', {
      name: 'Spotify results pages',
    });
    const previousButton = screen.getByRole('button', {
      name: 'Previous page',
    });
    const nextButton = screen.getByRole('button', {
      name: 'Next page',
    });
    const pageSize = screen.getByRole('combobox', {
      name: 'Results per page',
    });

    expect(results).toHaveAttribute('tabindex', '-1');
    expect(results).not.toHaveFocus();
    expect(pagination).toBeVisible();
    expect(screen.getByRole('status', {
      name: 'Page 1 of 5',
    })).toHaveTextContent('Page 1 of 5');
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(pageSize).toHaveValue('10');
    expect(screen.getAllByRole('option').map(option => option.textContent))
      .toEqual(['10', '20', '25', '50']);

    await expectNoAxeViolations(container);
  });

  it('keeps an empty result set on page one with navigation disabled', async () => {
    const dataProducer = vi.fn().mockResolvedValue(page('empty', 0));

    renderPaginator(dataProducer);

    expect(await screen.findByRole('status', {
      name: 'Page 1 of 1',
    })).toHaveTextContent('Page 1 of 1');
    expect(screen.getByRole('button', {
      name: 'Previous page',
    })).toBeDisabled();
    expect(screen.getByRole('button', {
      name: 'Next page',
    })).toBeDisabled();
  });

  it('moves between pages without requesting an out-of-range offset', async () => {
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
    ) => Promise.resolve(page(`page-${offset + 1}`, 20)));

    renderPaginator(dataProducer);

    expect(await screen.findByText('page-1')).toBeVisible();
    const previousButton = screen.getByRole('button', {
      name: 'Previous page',
    });
    fireEvent.click(previousButton);
    expect(dataProducer).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', {
      name: 'Next page',
    }));
    expect(await screen.findByText('page-2')).toBeVisible();
    expect(dataProducer.mock.calls[1]?.[1]).toBe(1);

    const nextButton = screen.getByRole('button', {
      name: 'Next page',
    });
    expect(nextButton).toBeDisabled();
    fireEvent.click(nextButton);
    expect(dataProducer).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', {
      name: 'Previous page',
    }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(3);
    });
    expect(dataProducer.mock.calls[2]?.[1]).toBe(0);
    expect(await screen.findByText('page-1')).toBeVisible();
  });

  it('reconciles a shrinking total to the last valid offset before showing results', async () => {
    let offsetOneRequests = 0;
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
    ) => {
      if (offset === 0) return Promise.resolve(page('page-1', 50));
      if (offset === 2) return Promise.resolve(page('out-of-range', 15));

      offsetOneRequests += 1;
      return Promise.resolve(offsetOneRequests === 1
        ? page('page-2', 50)
        : page('last-valid-page', 15));
    });

    renderPaginator(dataProducer);

    expect(await screen.findByText('page-1')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('page-2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('last-valid-page')).toBeVisible();
    expect(screen.queryByText('out-of-range')).not.toBeInTheDocument();
    expect(dataProducer.mock.calls.map(call => call[1])).toEqual([0, 1, 2, 1]);
    expect(screen.getByRole('status', {
      name: 'Page 2 of 2',
    })).toHaveTextContent('Page 2 of 2');
  });

  it('focuses results only after a requested page finishes loading', async () => {
    const nextPage = deferred<ReturnType<typeof page>>();
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
    ) => offset === 0
      ? Promise.resolve(page('first'))
      : nextPage.promise);

    renderPaginator(dataProducer);

    const initialResults = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    expect(initialResults).not.toHaveFocus();

    fireEvent.click(screen.getByRole('button', {
      name: 'Next page',
    }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });
    expectLoadingStatus();
    expect(screen.queryByRole('region', {
      name: 'Spotify results',
    })).not.toBeInTheDocument();

    nextPage.resolve(page('second'));
    const nextResults = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    expect(nextResults).toHaveFocus();
  });

  it('does not steal focus from another live control while a requested page loads', async () => {
    const user = userEvent.setup();
    const nextPage = deferred<ReturnType<typeof page>>();
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
    ) => offset === 0
      ? Promise.resolve(page('first'))
      : nextPage.promise);

    renderPaginator(dataProducer, { showNextGeneration: true });

    await screen.findByText('first');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });

    const persistentControl = screen.getByRole('button', {
      name: 'Load next generation',
    });
    await user.click(persistentControl);
    expect(persistentControl).toHaveFocus();

    nextPage.resolve(page('second'));
    expect(await screen.findByText('second')).toBeVisible();
    expect(persistentControl).toHaveFocus();
  });

  it('does not transfer pending focus to a superseding time-range request', async () => {
    const requestedPage = deferred<ReturnType<typeof page>>();
    const externalPage = deferred<ReturnType<typeof page>>();
    let requestCount = 0;
    let requestedPageSignal: AbortSignal | undefined;
    const dataProducer = vi.fn((
      _limit: number,
      _offset: number,
      signal: AbortSignal,
    ) => {
      requestCount += 1;
      if (requestCount === 1) {
        return Promise.resolve(page('initial'));
      }

      if (requestCount === 2) {
        requestedPageSignal = signal;
        return requestedPage.promise;
      }

      return externalPage.promise;
    });

    renderPaginator(dataProducer, { showTimeRangeChange: true });

    const initialResults = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    expect(initialResults).not.toHaveFocus();

    fireEvent.click(screen.getByRole('button', {
      name: 'Next page',
    }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });
    fireEvent.click(screen.getByRole('button', {
      name: 'Change time range',
    }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(3);
    });
    expect(requestedPageSignal?.aborted).toBe(true);

    externalPage.resolve(page('external'));
    const externalResults = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    expect(externalResults).not.toHaveFocus();

    requestedPage.resolve(page('stale'));
    await act(async () => {
      await requestedPage.promise;
    });
    expect(screen.getByText('external')).toBeVisible();
    expect(externalResults).not.toHaveFocus();
  });
});

describe('Spotify pagination request lifecycle', () => {
  it('starts one effective request during a StrictMode mount', async () => {
    const dataProducer = vi.fn((
      limit: number,
      offset: number,
      signal: AbortSignal,
    ) => {
      void limit;
      void offset;
      void signal;
      return Promise.resolve(page('current'));
    });

    renderPaginator(dataProducer);

    expect(await screen.findByText('current')).toBeVisible();
    expect(dataProducer).toHaveBeenCalledOnce();
    expect(dataProducer.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
    expect(dataProducer.mock.calls[0]?.[2].aborted).toBe(false);
  });

  it('shows a stable accessible indicator while the current generation loads', async () => {
    const currentPage = deferred<ReturnType<typeof page>>();
    const dataProducer = vi.fn().mockReturnValue(currentPage.promise);

    renderPaginator(dataProducer);

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledOnce();
    });
    expectLoadingStatus();

    currentPage.resolve(page('current'));
    expect(await screen.findByText('current')).toBeVisible();
    expect(screen.queryByText('Loading Spotify results')).not.toBeInTheDocument();
  });

  it('keeps loading owned by the newest request generation', async () => {
    const oldPage = deferred<ReturnType<typeof page>>();
    const currentPage = deferred<ReturnType<typeof page>>();
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
    ) => offset === 0 ? oldPage.promise : currentPage.promise);

    renderPaginator(dataProducer, { showNextGeneration: true });

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledOnce();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load next generation' }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });

    oldPage.resolve(page('old'));
    await act(async () => {
      await oldPage.promise;
    });

    expectLoadingStatus();
    expect(screen.queryByText('old')).not.toBeInTheDocument();

    currentPage.resolve(page('current'));
    expect(await screen.findByText('current')).toBeVisible();
    expect(screen.queryByText('Loading Spotify results')).not.toBeInTheDocument();
  });

  it('aborts and ignores a superseded slow response', async () => {
    const oldPage = deferred<ReturnType<typeof page>>();
    const newPage = deferred<ReturnType<typeof page>>();
    let oldSignal: AbortSignal | undefined;
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
      signal: AbortSignal,
    ) => {
      if (offset === 0) {
        oldSignal = signal;
        return oldPage.promise;
      }

      return newPage.promise;
    });

    renderPaginator(dataProducer, { showNextGeneration: true });

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load next generation' }));
    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });

    expect(oldSignal?.aborted).toBe(true);
    newPage.resolve(page('new'));
    expect(await screen.findByText('new')).toBeVisible();

    oldPage.resolve(page('old'));
    await act(async () => {
      await oldPage.promise;
    });

    expect(screen.getByText('new')).toBeVisible();
    expect(screen.queryByText('old')).not.toBeInTheDocument();
  });

  it('does not navigate when a superseded request rejects', async () => {
    const oldPage = deferred<ReturnType<typeof page>>();
    const dataProducer = vi.fn((
      _limit: number,
      offset: number,
      signal: AbortSignal,
    ) => {
      void _limit;
      void signal;
      return offset === 0 ? oldPage.promise : Promise.resolve(page('new'));
    });
    const { router } = renderPaginator(dataProducer, { showNextGeneration: true });

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load next generation' }));
    expect(await screen.findByText('new')).toBeVisible();

    oldPage.reject(new Error('old request failed'));
    await act(async () => {
      try {
        await oldPage.promise;
      } catch {
        // The component must ignore this stale rejection.
      }
    });

    expect(router.state.location.pathname).toBe('/paging');
    expect(screen.getByText('new')).toBeVisible();
  });

  it('ignores AbortError without navigating or logging raw abort text', async () => {
    const abortError = new DOMException('raw abort text', 'AbortError');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const dataProducer = vi.fn().mockRejectedValue(abortError);
    const { router } = renderPaginator(dataProducer);

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledOnce();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(router.state.location.pathname).toBe('/paging');
    expect(document.body).not.toHaveTextContent('raw abort text');
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('raw abort text');
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('raw abort text');
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain('raw abort text');
  });

  it('aborts pending work on unmount without a set-state warning', async () => {
    const pendingPage = deferred<ReturnType<typeof page>>();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let signal: AbortSignal | undefined;
    const dataProducer = vi.fn((
      _limit: number,
      _offset: number,
      requestSignal: AbortSignal,
    ) => {
      signal = requestSignal;
      return pendingPage.promise;
    });
    const { unmount } = renderPaginator(dataProducer);

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledOnce();
    });
    unmount();
    expect(signal?.aborted).toBe(true);

    pendingPage.resolve(page('late'));
    await act(async () => {
      await pendingPage.promise;
    });

    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/state update|unmounted/i);
  });

  it('replaces a current real failure with the Spotify fallback once', async () => {
    const dataProducer = vi.fn().mockRejectedValue(new Error('request failed'));
    const { router } = renderPaginator(dataProducer, {
      initialEntries: ['/before', '/paging'],
      initialIndex: 1,
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(router.state.historyAction).toBe('REPLACE');
    expect(dataProducer).toHaveBeenCalledOnce();

    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole('heading', {
      name: 'Before pagination',
    })).toBeVisible();
  });

  it('coerces native page-size values and focuses after the request succeeds', async () => {
    const resizedPage = deferred<ReturnType<typeof page>>();
    const dataProducer = vi.fn((
      limit: number,
      offset: number,
      signal: AbortSignal,
    ) => {
      void offset;
      void signal;
      return limit === 10
        ? Promise.resolve(page('initial size'))
        : resizedPage.promise;
    });

    renderPaginator(dataProducer);

    const initialResults = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    expect(initialResults).not.toHaveFocus();
    fireEvent.change(screen.getByRole('combobox', {
      name: 'Results per page',
    }), {
      target: { value: '20' },
    });

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });
    expect(dataProducer.mock.calls[1]?.[0]).toBe(20);
    expect(typeof dataProducer.mock.calls[1]?.[0]).toBe('number');
    expect(dataProducer.mock.calls[1]?.[1]).toBe(0);
    expectLoadingStatus();
    expect(screen.queryByRole('region', {
      name: 'Spotify results',
    })).not.toBeInTheDocument();

    resizedPage.resolve(page('resized'));
    const resizedResults = await screen.findByRole('region', {
      name: 'Spotify results',
    });
    expect(resizedResults).toHaveFocus();
  });

  it.each([undefined, null, '', 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back for invalid page size %s',
    (value) => {
      expect(normalizePageSize(value)).toBe(10);
    },
  );
});

describe('Spotify paginated result cards', () => {
  it('renders a playlist without cover artwork', () => {
    renderCard(
      <SpotifyPlaylist playlist={{
        description: null,
        id: 'playlist',
        images: [],
        name: 'No Cover Playlist',
        owner: {
          display_name: 'Adam',
          id: 'adam',
        },
        tracks: {
          total: 0,
        },
      }} />,
    );

    expect(screen.getByRole('heading', {
      name: 'No Cover Playlist',
    })).toBeVisible();
    expect(screen.queryByRole('img', {
      name: 'Spotify playlist preview image',
    })).not.toBeInTheDocument();
  });

  it('renders a track without album artwork', () => {
    renderCard(
      <SpotifyTrack track={{
        album: {
          images: [],
        },
        artists: [{
          id: 'artist',
          name: 'Artist',
        }],
        duration_ms: 120_000,
        id: 'track',
        name: 'No Cover Track',
        popularity: 50,
        preview_url: null,
      }} />,
    );

    expect(screen.getByRole('heading', {
      name: 'No Cover Track',
    })).toBeVisible();
    expect(screen.queryByRole('img', {
      name: 'Spotify track preview image',
    })).not.toBeInTheDocument();
  });

  it('renders an artist without artwork', () => {
    renderCard(
      <SpotifyArtist artist={{
        followers: {
          total: 1234,
        },
        genres: ['indie'],
        id: 'artist',
        images: [],
        name: 'No Image Artist',
        popularity: 42,
      } as unknown as SpotifyApi.ArtistObjectFull} />,
    );

    expect(screen.getByRole('heading', {
      name: 'No Image Artist',
    })).toBeVisible();
    expect(screen.getByText(/Popularity: 42%/u)).toBeVisible();
    expect(screen.queryByRole('img', {
      name: 'Spotify artist preview image',
    })).not.toBeInTheDocument();
  });

  it('renders an episode without artwork', () => {
    renderCard(
      <SpotifyEpisode openInNewTab episode={{
        description: 'Episode description',
        duration_ms: 120_000,
        external_urls: {
          spotify: 'https://open.spotify.com/episode/episode',
        },
        id: 'episode',
        images: [],
        name: 'No Image Episode',
        release_date: '2026-08-15',
        show: {
          external_urls: {
            spotify: 'https://open.spotify.com/show/show',
          },
          name: 'Example Show',
        },
      } as unknown as SpotifyApi.EpisodeObjectFull} />,
    );

    expect(screen.getByRole('heading', {
      name: 'No Image Episode',
    })).toBeVisible();
    expect(screen.getByText(/Example Show/u)).toBeVisible();
    expect(screen.getByText(/Episode description/u)).toBeVisible();
    expect(screen.getByRole('link', {
      name: 'No Image Episode',
    })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('img', {
      name: 'Spotify episode preview image',
    })).not.toBeInTheDocument();
  });
});

describe('Spotify playlist route header', () => {
  it('renders without a src-less playlist image', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        items: [],
        total: 0,
      },
    });
    const playlist = {
      collaborative: false,
      description: null,
      external_urls: {
        spotify: 'https://open.spotify.com/playlist/playlist',
      },
      followers: { total: 1 },
      id: 'playlist',
      images: [],
      name: 'Playlist Without Artwork',
      owner: {
        display_name: 'Adam',
        id: 'adam',
      },
      public: true,
      tracks: { total: 0 },
    } satisfies SpotifyPlaylistDetails;

    renderWithRouter([
      {
        path: '/projects/spotify/playlists/:playlistId',
        loader: () => ({ playlist, playlistId: playlist.id }),
        Component: SpotifyPlaylistViewRoute,
      },
    ], {
      initialEntries: ['/projects/spotify/playlists/playlist'],
    });

    expect(await screen.findByText('Playlist Without Artwork')).toBeVisible();
    expect(screen.queryByRole('img', {
      name: 'First playlist album image',
    })).not.toBeInTheDocument();
  });
});

type RenderPaginatorOptions = {
  initialEntries?: string[];
  initialIndex?: number;
  showNextGeneration?: boolean;
  showTimeRangeChange?: boolean;
};

function renderCard(card: ReactNode) {
  return renderWithRouter([
    {
      path: '/',
      Component: () => (
        <ChakraProvider theme={theme}>
          {card}
        </ChakraProvider>
      ),
    },
  ]);
}

function renderPaginator(
  dataProducer: (
    limit: number,
    offset: number,
    signal: AbortSignal,
  ) => Promise<ReturnType<typeof page>>,
  {
    initialEntries = ['/paging'],
    initialIndex = 0,
    showNextGeneration = false,
    showTimeRangeChange = false,
  }: RenderPaginatorOptions = {},
) {
  return renderWithRouter([
    { path: '/before', Component: () => <h1>Before pagination</h1> },
    {
      path: '/paging',
      Component: () => (
        <PaginatorHarness
          dataProducer={dataProducer}
          showNextGeneration={showNextGeneration}
          showTimeRangeChange={showTimeRangeChange}
        />
      ),
    },
    {
      path: '/projects/spotify',
      Component: () => <h1>Spotify projects</h1>,
    },
  ], {
    initialEntries,
    initialIndex,
  });
}

function PaginatorHarness({
  dataProducer,
  showNextGeneration,
  showTimeRangeChange,
}: {
  dataProducer: (
    limit: number,
    offset: number,
    signal: AbortSignal,
  ) => Promise<ReturnType<typeof page>>;
  showNextGeneration: boolean;
  showTimeRangeChange: boolean;
}) {
  const [limitPerPage, setLimitPerPage] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term'>('short_term');

  return <>
    {showNextGeneration && (
      <button type="button" onClick={() => setPageOffset(1)}>
        Load next generation
      </button>
    )}
    {showTimeRangeChange && (
      <button type="button" onClick={() => setTimeRange('medium_term')}>
        Change time range
      </button>
    )}
    <PaginatedSpotifyDisplay<ReturnType<typeof page>, PageItem>
      childDataMapper={item => <div key={item.id}>{item.id}</div>}
      dataProducer={dataProducer}
      filterNotNull={() => true}
      limitPerPage={limitPerPage}
      pageOffset={pageOffset}
      setLimitPerPage={setLimitPerPage}
      setPageOffset={setPageOffset}
      timeRange={timeRange}
    />
  </>;
}

function page(id: string, total = 50) {
  return {
    items: [{ id }] satisfies PageItem[],
    total,
  };
}

function expectLoadingStatus() {
  const status = screen.getByRole('status');
  expect(status).toBeVisible();
  expect(status).toHaveTextContent('Loading Spotify results');
  expect(status).not.toHaveAttribute('aria-label');
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
