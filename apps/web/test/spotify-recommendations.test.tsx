import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  SpotifyRecommendationTrack,
  SpotifyRecommendationsResponse,
} from '@adamratzman/contracts';
import {
  type AutocompleteOption,
  type SelectedObjects,
} from '../src/routes/projects/spotify/recommend';
import { SpotifyArtistGenreTrackSearchAutocompleteComponent } from '../src/components/projects/spotify/playlist_generator/SpotifyArtistGenreTrackSearchAutocompleteComponent';
import { GetAndShowSpotifyTrackRecommendations } from '../src/components/projects/spotify/playlist_generator/GetAndShowSpotifyTrackRecommendations';
import { theme } from '../src/theme';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Spotify autocomplete request lifecycle', () => {
  it('does not let an old search query replace newer results', async () => {
    const oldTracks = deferred<Response>();
    const oldArtists = deferred<Response>();
    const newTracks = deferred<Response>();
    const newArtists = deferred<Response>();
    const fetchMock = createSearchFetch({
      old: { artists: oldArtists.promise, tracks: oldTracks.promise },
      new: { artists: newArtists.promise, tracks: newTracks.promise },
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSearch();

    searchFor('old');
    await waitForSearchCalls(fetchMock, 'old');
    searchFor('new');
    await waitForSearchCalls(fetchMock, 'new');

    newTracks.resolve(searchResponse({
      items: [trackSearchResult('New Track', 'new-track')],
    }));
    newArtists.resolve(searchResponse({ items: [] }));
    expect(await screen.findByText('New Track')).toBeVisible();

    oldTracks.resolve(searchResponse({
      items: [trackSearchResult('Old Track', 'old-track')],
    }));
    oldArtists.resolve(searchResponse({ items: [] }));
    await act(async () => {
      await Promise.all([oldTracks.promise, oldArtists.promise]);
    });

    expect(screen.getByText('New Track')).toBeVisible();
    expect(screen.queryByText('Old Track')).not.toBeInTheDocument();
  });

  it('aborts both prior artist and track requests when the query changes', async () => {
    const oldTracks = deferred<Response>();
    const oldArtists = deferred<Response>();
    const fetchMock = createSearchFetch({
      old: { artists: oldArtists.promise, tracks: oldTracks.promise },
      new: {
        artists: Promise.resolve(searchResponse({ items: [] })),
        tracks: Promise.resolve(searchResponse({ items: [] })),
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSearch();

    searchFor('old');
    await waitForSearchCalls(fetchMock, 'old');
    const oldCalls = searchCalls(fetchMock, 'old');
    expect(oldCalls).toHaveLength(2);
    expect(oldCalls.every(call => call.init.signal?.aborted === false)).toBe(true);

    searchFor('new');
    await waitFor(() => {
      expect(oldCalls.every(call => call.init.signal?.aborted === true)).toBe(true);
    });
  });

  it('contains malformed genre and search JSON without exposing raw data', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn((
      input: RequestInfo | URL,
    ): Promise<Response> => {
      const url = requestUrl(input);
      if (url.endsWith('/getAvailableGenreSeeds')) {
        return Promise.resolve(Response.json(['indie', 42, 'RAW GENRE']));
      }
      if (url.endsWith('/searchTracks')) {
        return Promise.resolve(Response.json({
          items: [{ name: 'RAW TRACK', artists: [{ name: 'Artist' }] }],
        }));
      }

      return Promise.resolve(Response.json({ items: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSearch();

    searchFor('malformed');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We were unable to search Spotify. Please try again.',
    );
    expect(document.body).not.toHaveTextContent('RAW GENRE');
    expect(document.body).not.toHaveTextContent('RAW TRACK');
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/RAW GENRE|RAW TRACK/);
    expect(JSON.stringify(consoleLog.mock.calls)).not.toMatch(/RAW GENRE|RAW TRACK/);
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toMatch(/RAW GENRE|RAW TRACK/);
  });

  it('preserves selected tags while search generations change', async () => {
    const secondTracks = deferred<Response>();
    const secondArtists = deferred<Response>();
    const fetchMock = createSearchFetch({
      first: {
        artists: Promise.resolve(searchResponse({ items: [] })),
        tracks: Promise.resolve(searchResponse({
          items: [trackSearchResult('Selected Track', 'selected-track')],
        })),
      },
      second: {
        artists: secondArtists.promise,
        tracks: secondTracks.promise,
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSearch();

    searchFor('first');
    fireEvent.click(await screen.findByText('Selected Track'));
    expect(await screen.findByTestId('selected-uris')).toHaveTextContent(
      'spotify:track:selected-track',
    );

    searchFor('second');
    await waitForSearchCalls(fetchMock, 'second');

    expect(screen.getByTestId('selected-uris')).toHaveTextContent(
      'spotify:track:selected-track',
    );
    expect(screen.getByText('Selected Track')).toBeVisible();

    secondTracks.resolve(searchResponse({ items: [] }));
    secondArtists.resolve(searchResponse({ items: [] }));
    await act(async () => {
      await Promise.all([secondTracks.promise, secondArtists.promise]);
    });

    expect(screen.getByTestId('selected-uris')).toHaveTextContent(
      'spotify:track:selected-track',
    );
  });
});

describe('Spotify recommendation request lifecycle', () => {
  it('shows the reviewed generic error for malformed recommendations with a missing URI', async () => {
    const malformed = recommendationResponse('RAW MALFORMED TRACK', 'malformed');
    delete (malformed.tracks[0] as Partial<SpotifyRecommendationTrack>).uri;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(malformed)));

    renderRecommendations(selectedTrack('seed'));

    expect(await screen.findByText(
      'We were unable to get track recommendations.',
    )).toBeVisible();
    expect(screen.getByText('Please try again.')).toBeVisible();
    expect(document.body).not.toHaveTextContent('RAW MALFORMED TRACK');
  });

  it('aborts and ignores an old recommendation response after seed changes', async () => {
    const oldRequest = deferred<Response>();
    let oldSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((
      _input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => {
      const seed = recommendationSeed(init);
      if (seed === 'old-seed') {
        oldSignal = init.signal ?? undefined;
        return oldRequest.promise;
      }

      return Promise.resolve(Response.json(
        recommendationResponse('New Recommendation', 'new-track'),
      ));
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = renderRecommendations(selectedTrack('old-seed'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    view.rerender(recommendationTree(selectedTrack('new-seed')));

    expect(await screen.findByRole('heading', {
      name: 'New Recommendation',
    })).toBeVisible();
    expect(oldSignal?.aborted).toBe(true);

    oldRequest.resolve(Response.json(
      recommendationResponse('Old Recommendation', 'old-track'),
    ));
    await act(async () => {
      await oldRequest.promise;
    });

    expect(screen.getByRole('heading', {
      name: 'New Recommendation',
    })).toBeVisible();
    expect(screen.queryByRole('heading', {
      name: 'Old Recommendation',
    })).not.toBeInTheDocument();
  });

  it('ignores an old recommendation rejection after seed changes', async () => {
    const oldRequest = deferred<Response>();
    const fetchMock = vi.fn((
      _input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => (
      recommendationSeed(init) === 'old-seed'
        ? oldRequest.promise
        : Promise.resolve(Response.json(
          recommendationResponse('Current Recommendation', 'current-track'),
        ))
    ));
    vi.stubGlobal('fetch', fetchMock);
    const view = renderRecommendations(selectedTrack('old-seed'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    view.rerender(recommendationTree(selectedTrack('new-seed')));
    expect(await screen.findByRole('heading', {
      name: 'Current Recommendation',
    })).toBeVisible();

    oldRequest.reject(new Error('RAW STALE REJECTION'));
    await act(async () => {
      await oldRequest.promise.catch(() => undefined);
    });

    expect(screen.getByRole('heading', {
      name: 'Current Recommendation',
    })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('RAW STALE REJECTION');
  });

  it('generates a safe repeated-parameter playlist link without window.open', async () => {
    const firstId = 'track /?&';
    const secondId = 'comma,id';
    const response = {
      seeds: [{ id: 'seed' }],
      tracks: [
        recommendationTrack('First Recommendation', firstId),
        recommendationTrack('Second Recommendation', secondId),
      ],
    } satisfies SpotifyRecommendationsResponse;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response)));
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderRecommendations(selectedTrack('seed'));

    const link = await screen.findByRole('link', {
      name: 'Create your playlist (requires Spotify login) →',
    });
    const href = link.getAttribute('href');
    expect(href).not.toBeNull();
    const url = new URL(href!, window.location.origin);

    expect(url.pathname).toBe('/projects/spotify/recommend/create-playlist');
    expect(url.searchParams.getAll('trackIds')).toEqual([firstId, secondId]);
    expect(href).toContain('trackIds=track+%2F%3F%26');
    expect(href).toContain('trackIds=comma%2Cid');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(link);
    expect(openSpy).not.toHaveBeenCalled();
  });
});

type SearchDeferredResponses = Record<string, {
  artists: Promise<Response>;
  tracks: Promise<Response>;
}>;

type RecordedFetchCall = {
  init: RequestInit;
  query: string;
  url: string;
};

function createSearchFetch(responses: SearchDeferredResponses) {
  return vi.fn((
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> => {
    const url = requestUrl(input);
    if (url.endsWith('/getAvailableGenreSeeds')) {
      return Promise.resolve(Response.json(['indie', 'rock']));
    }

    const query = searchQuery(init);
    const response = responses[query];
    if (!response) {
      throw new Error(`Unexpected search query: ${query}`);
    }

    return url.endsWith('/searchTracks') ? response.tracks : response.artists;
  });
}

function renderSearch() {
  return renderWithRouter([
    {
      path: '/',
      Component: SearchHarness,
    },
  ]);
}

function SearchHarness() {
  const [selectedObjects, setSelectedObjects] = useState<SelectedObjects>({});

  return <ChakraProvider theme={theme}>
    <SpotifyArtistGenreTrackSearchAutocompleteComponent
      selectedObjects={selectedObjects}
      setSelectedObjects={setSelectedObjects}
    />
    <div data-testid="selected-uris">
      {Object.keys(selectedObjects).join('|')}
    </div>
  </ChakraProvider>;
}

function searchFor(query: string) {
  const inputs = screen.getAllByPlaceholderText(
    'Enter a Spotify track, artist, or genre...',
  );
  const input = inputs.find(element => (
    element instanceof HTMLInputElement
    && element.getAttribute('aria-hidden') !== 'true'
    && element.getAttribute('tabindex') !== '-1'
    && element.getAttribute('type') !== 'hidden'
  )) ?? inputs[0];
  fireEvent.change(input, {
    target: { value: query },
  });
}

async function waitForSearchCalls(
  fetchMock: ReturnType<typeof vi.fn>,
  query: string,
) {
  await waitFor(() => {
    expect(searchCalls(fetchMock, query)).toHaveLength(2);
  });
}

function searchCalls(
  fetchMock: ReturnType<typeof vi.fn>,
  query: string,
): RecordedFetchCall[] {
  return fetchMock.mock.calls.flatMap(([input, init = {}]) => {
    const url = String(input);
    if (!url.includes('/search')) return [];
    const requestInit = init as RequestInit;
    return [{
      init: requestInit,
      query: searchQuery(requestInit),
      url,
    }];
  }).filter(call => call.query === query);
}

function searchQuery(init: RequestInit) {
  return (JSON.parse(requestBody(init)) as { query: string }).query;
}

function searchResponse(body: unknown) {
  return Response.json(body);
}

function trackSearchResult(name: string, id: string) {
  return {
    artists: [{ name: 'Search Artist' }],
    name,
    uri: `spotify:track:${id}`,
  };
}

function renderRecommendations(selectedObjects: SelectedObjects) {
  return render(recommendationTree(selectedObjects));
}

function recommendationTree(selectedObjects: SelectedObjects) {
  return <StrictMode>
    <MemoryRouter>
      <ChakraProvider theme={theme}>
        <GetAndShowSpotifyTrackRecommendations
          selectedObjects={selectedObjects}
          selectedTrackAttributes={[]}
        />
      </ChakraProvider>
    </MemoryRouter>
  </StrictMode>;
}

function selectedTrack(id: string): SelectedObjects {
  const uri = `spotify:track:${id}`;
  const option: AutocompleteOption = {
    additionalText: 'Search Artist',
    text: id,
    textMapper: () => <b>{id}</b>,
    type: 'track',
    uri,
  };

  return { [uri]: option };
}

function recommendationSeed(init: RequestInit) {
  const request = JSON.parse(requestBody(init)) as {
    options: { seed_tracks?: string[] };
  };
  return request.options.seed_tracks?.[0];
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestBody(init: RequestInit) {
  if (typeof init.body !== 'string') {
    throw new Error('Expected a JSON request body.');
  }

  return init.body;
}

function recommendationResponse(name: string, id: string) {
  return {
    seeds: [{ id: 'seed' }],
    tracks: [recommendationTrack(name, id)],
  } satisfies SpotifyRecommendationsResponse;
}

function recommendationTrack(
  name: string,
  id: string,
): SpotifyRecommendationTrack {
  return {
    album: {
      images: [{ url: 'https://images.example/track.png' }],
    },
    artists: [{ id: 'artist', name: 'Recommendation Artist' }],
    duration_ms: 180_000,
    id,
    name,
    popularity: 75,
    preview_url: null,
    uri: `spotify:track:${id}`,
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
