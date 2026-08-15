import { ChakraProvider } from '@chakra-ui/react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
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
import axios from 'axios';

type PageItem = {
  id: string;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
    expect(screen.getByRole('status', {
      name: 'Loading Spotify results',
    })).toBeVisible();

    currentPage.resolve(page('current'));
    expect(await screen.findByText('current')).toBeVisible();
    expect(screen.queryByRole('status', {
      name: 'Loading Spotify results',
    })).not.toBeInTheDocument();
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

    expect(screen.getByRole('status', {
      name: 'Loading Spotify results',
    })).toBeVisible();
    expect(screen.queryByText('old')).not.toBeInTheDocument();

    currentPage.resolve(page('current'));
    expect(await screen.findByText('current')).toBeVisible();
    expect(screen.queryByRole('status', {
      name: 'Loading Spotify results',
    })).not.toBeInTheDocument();
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

  it('coerces Choc page-size values before requesting the next page', async () => {
    const dataProducer = vi.fn((
      limit: number,
      offset: number,
      signal: AbortSignal,
    ) => {
      void limit;
      void offset;
      void signal;
      return Promise.resolve(page('sized'));
    });

    renderPaginator(dataProducer);

    expect(await screen.findByText('sized')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '10 / page' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: '20 / page' }));

    await waitFor(() => {
      expect(dataProducer).toHaveBeenCalledTimes(2);
    });
    expect(dataProducer.mock.calls[1]?.[0]).toBe(20);
    expect(typeof dataProducer.mock.calls[1]?.[0]).toBe('number');
    expect(dataProducer.mock.calls[1]?.[1]).toBe(0);
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
}: {
  dataProducer: (
    limit: number,
    offset: number,
    signal: AbortSignal,
  ) => Promise<ReturnType<typeof page>>;
  showNextGeneration: boolean;
}) {
  const [limitPerPage, setLimitPerPage] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);

  return <>
    {showNextGeneration && (
      <button type="button" onClick={() => setPageOffset(1)}>
        Load next generation
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
    />
  </>;
}

function page(id: string) {
  return {
    items: [{ id }] satisfies PageItem[],
    total: 50,
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
