import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  type SelectedTrackAttribute,
} from '../src/routes/projects/spotify/recommend';
import { SpotifyArtistGenreTrackSearchAutocompleteComponent } from '../src/components/projects/spotify/playlist_generator/SpotifyArtistGenreTrackSearchAutocompleteComponent';
import { SpotifySeedCombobox } from '../src/components/projects/spotify/playlist_generator/SpotifySeedCombobox';
import { SpotifyTrackAttributeSelectorComponent } from '../src/components/projects/spotify/playlist_generator/SpotifyTrackAttributeSelectorComponent';
import { GetAndShowSpotifyTrackRecommendations } from '../src/components/projects/spotify/playlist_generator/GetAndShowSpotifyTrackRecommendations';
import { SpotifyGenerateAndShowPlaylistRecommendationsComponent } from '../src/components/projects/spotify/playlist_generator/SpotifyGenerateAndShowPlaylistRecommendationsComponent';
import { tuneableTrackAttributes } from '../src/components/projects/spotify/TrackAttribute';
import { parseRecommendedTrackIds } from '../src/routes/projects/spotify/recommend/create-playlist';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

  it('preserves artist and track results when genre loading fails', async () => {
    vi.stubGlobal('fetch', createSourceFailureFetch('genres'));
    renderSearch();

    searchFor('indie');

    expect(await screen.findByText('Indie Track')).toBeVisible();
    expect(screen.getByText('Indie Artist')).toBeVisible();
    expect(screen.queryByText('indie', { selector: 'b' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We were unable to search Spotify. Please try again.',
    );
  });

  it('preserves genre and track results when artist search fails', async () => {
    vi.stubGlobal('fetch', createSourceFailureFetch('artists'));
    renderSearch();

    searchFor('indie');

    expect(await screen.findByText('Indie Track')).toBeVisible();
    expect(screen.getByText('indie', { selector: 'b' })).toBeVisible();
    expect(screen.queryByText('Indie Artist')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We were unable to search Spotify. Please try again.',
    );
  });

  it('preserves artist and genre results when track search fails', async () => {
    vi.stubGlobal('fetch', createSourceFailureFetch('tracks'));
    renderSearch();

    searchFor('indie');

    expect(await screen.findByText('Indie Artist')).toBeVisible();
    expect(screen.getByText('indie', { selector: 'b' })).toBeVisible();
    expect(screen.queryByText('Indie Track')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We were unable to search Spotify. Please try again.',
    );
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

describe('Spotify seed and attribute controls', () => {
  it('exposes the native combobox, listbox, and active option state', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createSearchFetch({
      indie: {
        artists: Promise.resolve(searchResponse({
          items: [{
            name: 'Indie Artist',
            uri: 'spotify:artist:indieartist',
          }],
        })),
        tracks: Promise.resolve(searchResponse({
          items: [trackSearchResult('Indie Track', 'indietrack')],
        })),
      },
    }));
    renderSearch();

    const combobox = screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    searchFor('indie');

    const listbox = await screen.findByRole('listbox', {
      name: 'Spotify search suggestions',
    });
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-controls', listbox.id);
    expect(combobox).toHaveAttribute('aria-owns', listbox.id);
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options.every(option => option.id.length > 0)).toBe(true);
    expect(options.every(option => option.closest('[role="listbox"]') === listbox)).toBe(true);
    expect(options.every(option => option.parentElement === listbox)).toBe(true);

    await user.click(combobox);
    await user.keyboard('{ArrowDown}');

    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      options[0].id,
    );
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('declares the suggestion list as multiselectable', async () => {
    const user = userEvent.setup();
    const track: AutocompleteOption = {
      additionalText: 'Selected Artist',
      text: 'Selected Track',
      textMapper: () => <><b>Selected Track</b> by Selected Artist</>,
      type: 'track',
      uri: 'spotify:track:selectedtrack',
    };
    render(
      <ChakraProvider theme={theme}>
        <SeedComboboxHarness options={[track]} />
      </ChakraProvider>,
    );

    await user.click(screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    }));

    expect(screen.getByRole('listbox', {
      name: 'Spotify search suggestions',
    })).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('uses a readable active option background in dark mode', async () => {
    localStorage.setItem('chakra-ui-color-mode', 'dark');
    const user = userEvent.setup();
    const track: AutocompleteOption = {
      additionalText: 'Dark Artist',
      text: 'Dark Track',
      textMapper: () => <><b>Dark Track</b> by Dark Artist</>,
      type: 'track',
      uri: 'spotify:track:darktrack',
    };
    render(
      <ChakraProvider theme={theme}>
        <SeedComboboxHarness options={[track]} />
      </ChakraProvider>,
    );

    const combobox = screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    await user.click(combobox);
    await user.keyboard('{ArrowDown}');

    const activeOption = screen.getByRole('option', {
      name: /Dark Track/u,
    });
    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      activeOption.id,
    );
    expect(getComputedStyle(activeOption).background).toBe(
      'var(--chakra-colors-whitealpha-200)',
    );
  });

  it('selects a seed with the keyboard', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createSearchFetch({
      keyboard: {
        artists: Promise.resolve(searchResponse({ items: [] })),
        tracks: Promise.resolve(searchResponse({
          items: [trackSearchResult('Keyboard Track', 'keyboardtrack')],
        })),
      },
    }));
    renderSearch();

    searchFor('keyboard');
    await screen.findByRole('option', { name: /Keyboard Track/u });
    const combobox = screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    await user.click(combobox);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByTestId('selected-uris')).toHaveTextContent(
      'spotify:track:keyboardtrack',
    );
    expect(combobox).toHaveValue('');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveFocus();
  });

  it('moves through suggestions in their rendered group order', async () => {
    const user = userEvent.setup();
    const artist: AutocompleteOption = {
      text: 'Grouped Artist',
      textMapper: () => <b>Grouped Artist</b>,
      type: 'artist',
      uri: 'spotify:artist:groupedartist',
    };
    const track: AutocompleteOption = {
      additionalText: 'Grouped Artist',
      text: 'Grouped Track',
      textMapper: () => <><b>Grouped Track</b> by Grouped Artist</>,
      type: 'track',
      uri: 'spotify:track:groupedtrack',
    };
    render(
      <ChakraProvider theme={theme}>
        <SeedComboboxHarness options={[artist, track]} />
      </ChakraProvider>,
    );

    const combobox = screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    await user.click(combobox);
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Grouped Track');

    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      options[0].id,
    );
  });

  it('resets the active suggestion when asynchronous results change', async () => {
    const user = userEvent.setup();
    const genre: AutocompleteOption = {
      text: 'indie',
      textMapper: () => <b>indie</b>,
      type: 'genre',
      uri: 'spotify:genre:indie',
    };
    const track: AutocompleteOption = {
      additionalText: 'Grouped Artist',
      text: 'Grouped Track',
      textMapper: () => <><b>Grouped Track</b> by Grouped Artist</>,
      type: 'track',
      uri: 'spotify:track:groupedtrack',
    };
    const view = render(
      <ChakraProvider theme={theme}>
        <SeedComboboxHarness options={[genre]} />
      </ChakraProvider>,
    );

    const combobox = screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    await user.click(combobox);
    await user.keyboard('{ArrowDown}');
    expect(combobox).toHaveAttribute('aria-activedescendant');

    view.rerender(
      <ChakraProvider theme={theme}>
        <SeedComboboxHarness options={[track, genre]} />
      </ChakraProvider>,
    );

    await waitFor(() => {
      expect(combobox).not.toHaveAttribute('aria-activedescendant');
    });
  });

  it('selects a seed with a pointer without adding duplicates', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createFreshSearchFetch({
      artists: [],
      tracks: [trackSearchResult('Pointer Track', 'pointertrack')],
    }));
    renderSearch();

    searchFor('pointer');
    const selectedOption = await screen.findByRole('option', {
      name: /Pointer Track/u,
    });
    await user.click(selectedOption);
    expect(screen.getByTestId('selected-uris')).toHaveTextContent(
      'spotify:track:pointertrack',
    );

    searchFor('pointer');
    const duplicateOption = await screen.findByRole('option', {
      name: /Pointer Track/u,
    });
    expect(duplicateOption).toHaveAttribute('aria-selected', 'true');
    await user.click(duplicateOption);
    expect(screen.getByTestId('selected-uris')).toHaveTextContent(
      /^spotify:track:pointertrack$/u,
    );
  });

  it('clears on Escape and closes on blur', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createSearchFetch({
      indie: {
        artists: Promise.resolve(searchResponse({ items: [] })),
        tracks: Promise.resolve(searchResponse({
          items: [trackSearchResult('Indie Track', 'indietrack')],
        })),
      },
    }));
    renderSearch();

    const combobox = screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    searchFor('indie');
    await screen.findByRole('listbox', {
      name: 'Spotify search suggestions',
    });
    await user.click(combobox);
    await user.keyboard('{Escape}');

    expect(combobox).toHaveValue('');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).not.toHaveAttribute('aria-controls');
    expect(combobox).not.toHaveAttribute('aria-owns');
    expect(screen.queryByRole('listbox', {
      name: 'Spotify search suggestions',
    })).not.toBeInTheDocument();

    searchFor('indie');
    await screen.findByRole('listbox', {
      name: 'Spotify search suggestions',
    });
    await user.click(screen.getByRole('button', { name: 'After search' }));

    await waitFor(() => {
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
    });
    expect(combobox).toHaveValue('indie');
  });

  it('removes a selected seed and returns focus to the combobox', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createSearchFetch({
      removable: {
        artists: Promise.resolve(searchResponse({ items: [] })),
        tracks: Promise.resolve(searchResponse({
          items: [{
            artists: [
              { name: 'First Artist' },
              { name: 'Second Artist' },
            ],
            name: 'Removable Track',
            uri: 'spotify:track:removabletrack',
          }],
        })),
      },
    }));
    renderSearch();

    searchFor('removable');
    await user.click(await screen.findByRole('option', {
      name: /Removable Track/u,
    }));
    await user.click(screen.getByRole('button', {
      name: 'Remove Removable Track by First Artist, Second Artist from seeds',
    }));

    expect(screen.getByTestId('selected-uris')).toBeEmptyDOMElement();
    expect(screen.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    })).toHaveFocus();
  });

  it('preserves selected attribute values while adding and removing checkboxes', async () => {
    const user = userEvent.setup();
    const acousticness = tuneableTrackAttributes.find(
      attribute => attribute.id === 'acousticness',
    );
    if (!acousticness) throw new Error('Expected Acousticness.');
    renderAttributes([{
      id: acousticness.id,
      trackAttribute: acousticness,
      type: 'min',
      value: 0.73,
    }]);

    const acousticnessCheckbox = screen.getByRole('checkbox', {
      name: 'Acousticness',
    });
    const popularityCheckbox = screen.getByRole('checkbox', {
      name: 'Popularity',
    });
    expect(acousticnessCheckbox).toBeChecked();
    expect(popularityCheckbox).not.toBeChecked();

    await user.click(popularityCheckbox);
    expect(readSelectedAttributes()).toEqual([
      expect.objectContaining({
        id: 'acousticness',
        type: 'min',
        value: 0.73,
      }),
      expect.objectContaining({
        id: 'popularity',
        type: 'target',
        value: 50,
      }),
    ]);

    await user.click(acousticnessCheckbox);
    expect(readSelectedAttributes()).toEqual([
      expect.objectContaining({
        id: 'popularity',
        type: 'target',
        value: 50,
      }),
    ]);
  });

  it('does not mutate the selected attribute array while ordering controls', () => {
    const acousticness = tuneableTrackAttributes.find(
      attribute => attribute.id === 'acousticness',
    );
    const popularity = tuneableTrackAttributes.find(
      attribute => attribute.id === 'popularity',
    );
    if (!acousticness || !popularity) {
      throw new Error('Expected representative track attributes.');
    }
    const selectedTrackAttributes = Object.freeze([
      {
        id: popularity.id,
        trackAttribute: popularity,
        type: 'target' as const,
        value: popularity.defaultValue,
      },
      {
        id: acousticness.id,
        trackAttribute: acousticness,
        type: 'target' as const,
        value: acousticness.defaultValue,
      },
    ]) as unknown as SelectedTrackAttribute[];

    expect(() => render(
      <ChakraProvider theme={theme}>
        <SpotifyTrackAttributeSelectorComponent
          selectedTrackAttributes={selectedTrackAttributes}
          setSelectedTrackAttributes={vi.fn()}
        />
      </ChakraProvider>,
    )).not.toThrow();
    expect(selectedTrackAttributes.map(attribute => attribute.id)).toEqual([
      'popularity',
      'acousticness',
    ]);
  });

  it('labels each selected attribute mode and value control', async () => {
    const user = userEvent.setup();
    const acousticness = tuneableTrackAttributes.find(
      attribute => attribute.id === 'acousticness',
    );
    if (!acousticness) throw new Error('Expected Acousticness.');
    renderAttributes([{
      id: acousticness.id,
      trackAttribute: acousticness,
      type: 'target',
      value: 0.73,
    }]);

    expect(screen.getByRole('group', {
      name: 'Spotify track attributes',
    })).toBeVisible();
    const mode = screen.getByRole('combobox', {
      name: 'Acousticness tuning mode',
    });
    expect(mode).toHaveAttribute(
      'id',
      'spotify-track-attribute-acousticness-mode',
    );
    const slider = screen.getByRole('slider', {
      name: 'Acousticness value',
    });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '1');
    expect(slider).toHaveAttribute('aria-valuenow', '0.73');

    await user.selectOptions(mode, 'max');
    expect(readSelectedAttributes()[0]).toEqual(expect.objectContaining({
      id: 'acousticness',
      type: 'max',
      value: 0.73,
    }));
  });

  it('has no axe violations with suggestions, tags, and attributes visible', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', createFreshSearchFetch({
      artists: [{
        name: 'Accessible Artist',
        uri: 'spotify:artist:accessibleartist',
      }],
      tracks: [trackSearchResult('Accessible Track', 'accessibletrack')],
    }));
    const { container } = render(<SpotifyControlsHarness />);

    searchFor('accessible');
    await user.click(await screen.findByRole('option', {
      name: /Accessible Track/u,
    }));
    searchFor('accessible');
    await screen.findByRole('listbox', {
      name: 'Spotify search suggestions',
    });
    await user.click(screen.getByRole('checkbox', {
      name: 'Acousticness',
    }));
    await user.click(screen.getByRole('checkbox', {
      name: 'Popularity',
    }));

    await expectNoAxeViolations(container);
  });
});

describe('Spotify recommendation request lifecycle', () => {
  it('exposes recommendation validation errors as alerts', () => {
    const trackAttribute = tuneableTrackAttributes[0];
    render(
      <ChakraProvider theme={theme}>
        <SpotifyGenerateAndShowPlaylistRecommendationsComponent
          selectedObjects={{}}
          selectedTrackAttributes={[{
            id: trackAttribute.id,
            trackAttribute,
            type: 'target',
            value: trackAttribute.defaultValue,
          }]}
        />
      </ChakraProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You need to add at least one artist, track, or genre.',
    );
  });

  it('exposes the maximum seed validation error as an alert', () => {
    const selectedObjects = Array.from({ length: 6 }).reduce<SelectedObjects>(
      (objects, _, index) => ({
        ...objects,
        ...selectedTrack(String(index)),
      }),
      {},
    );
    render(
      <ChakraProvider theme={theme}>
        <SpotifyGenerateAndShowPlaylistRecommendationsComponent
          selectedObjects={selectedObjects}
          selectedTrackAttributes={[]}
        />
      </ChakraProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You can only have between one and five artists, tracks, and genres.',
    );
  });

  it('announces loading when no recommendation data is available', async () => {
    const response = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(response.promise));
    const view = renderRecommendations(selectedTrack('seed'));

    const status = await screen.findByRole('status');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Loading recommendations...',
    );
    expectVisualLoadingIsHiddenFromAssistiveTechnology();

    view.unmount();
  });

  it('shows the reviewed generic error for malformed recommendations with a missing URI', async () => {
    const malformed = recommendationResponse('RAW MALFORMED TRACK', 'malformed');
    delete (malformed.tracks[0] as Partial<SpotifyRecommendationTrack>).uri;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(malformed)));

    renderRecommendations(selectedTrack('seed'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We were unable to load Spotify recommendations. Please try again.',
    );
    expect(document.body).not.toHaveTextContent('RAW MALFORMED TRACK');
  });

  it('announces the loaded count without wrapping track cards in the status region', async () => {
    const response = {
      seeds: [{ id: 'seed' }],
      tracks: [
        recommendationTrack('First Recommendation', 'firsttrack'),
        recommendationTrack('Second Recommendation', 'secondtrack'),
      ],
    } satisfies SpotifyRecommendationsResponse;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response)));
    const { container } = renderRecommendations(selectedTrack('seed'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        '2 Spotify recommendations loaded.',
      );
    });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(within(status).queryByRole('heading', {
      name: 'First Recommendation',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'First Recommendation',
    })).toBeVisible();

    await expectNoAxeViolations(container);
  });

  it('renders recommendation text and links without album artwork', async () => {
    const response = recommendationResponse(
      'Recommendation Without Artwork',
      'artworkless123',
    );
    response.tracks[0].album.images = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response)));

    renderRecommendations(selectedTrack('seed'));

    expect(await screen.findByRole('heading', {
      name: 'Recommendation Without Artwork',
    })).toBeVisible();
    expect(screen.getByRole('link', {
      name: 'Recommendation Without Artwork',
    })).toHaveAttribute(
      'href',
      '/projects/spotify/tracks/artworkless123',
    );
    expect(screen.getByText(/Recommendation Artist/u)).toBeVisible();
    expect(screen.queryByRole('img', {
      name: 'Spotify track preview image',
    })).not.toBeInTheDocument();
  });

  it('coalesces rapid changes and retains visible recommendations until generation starts', async () => {
    const fetchMock = vi.fn((
      _input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => {
      const seed = recommendationSeed(init);
      if (seed === 'initial') {
        return Promise.resolve(Response.json(
          recommendationResponse('Initial Recommendation', 'initialtrack'),
        ));
      }
      if (seed === 'final') {
        return Promise.resolve(Response.json(
          recommendationResponse('Final Recommendation', 'finaltrack'),
        ));
      }

      throw new Error(`Unexpected recommendation seed: ${seed}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = renderRecommendations(selectedTrack('initial'));

    expect(await screen.findByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.useFakeTimers();
    view.rerender(recommendationTree(selectedTrack('middle')));
    view.rerender(recommendationTree(selectedTrack('final')));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(349);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', {
      name: 'Final Recommendation',
    })).toBeVisible();
    expect(screen.queryByRole('heading', {
      name: 'Initial Recommendation',
    })).not.toBeInTheDocument();
  });

  it('keeps old recommendations visible while the debounced generation loads', async () => {
    const finalResponse = deferred<Response>();
    const fetchMock = vi.fn((
      _input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => (
      recommendationSeed(init) === 'initial'
        ? Promise.resolve(Response.json(
          recommendationResponse('Initial Recommendation', 'initialtrack'),
        ))
        : finalResponse.promise
    ));
    vi.stubGlobal('fetch', fetchMock);
    const view = renderRecommendations(selectedTrack('initial'));

    expect(await screen.findByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();
    const announcement = screen.getByRole('status');
    expect(announcement).toHaveTextContent(
      '1 Spotify recommendations loaded.',
    );

    vi.useFakeTimers();
    view.rerender(recommendationTree(selectedTrack('final')));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(screen.getByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toBe(announcement);
    expect(announcement).toHaveTextContent('Loading recommendations...');
    expectVisualLoadingIsHiddenFromAssistiveTechnology();

    finalResponse.resolve(Response.json(
      recommendationResponse('Final Recommendation', 'finaltrack'),
    ));
    await act(async () => {
      await finalResponse.promise;
    });
    vi.useRealTimers();

    expect(await screen.findByRole('heading', {
      name: 'Final Recommendation',
    })).toBeVisible();
    expect(screen.getByRole('status')).toBe(announcement);
    expect(announcement).toHaveTextContent(
      '1 Spotify recommendations loaded.',
    );
    expect(screen.queryByRole('heading', {
      name: 'Initial Recommendation',
    })).not.toBeInTheDocument();
  });

  it('clears old recommendations when all seeds are removed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(
      recommendationResponse('Initial Recommendation', 'initialtrack'),
    )));
    const view = renderRecommendations(selectedTrack('initial'));

    expect(await screen.findByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();

    view.rerender(recommendationTree({}));

    expect(screen.queryByRole('heading', {
      name: 'Initial Recommendation',
    })).not.toBeInTheDocument();
  });

  it('does not restore a cleared generation when seeds are quickly re-added', async () => {
    const requestedSeeds: string[] = [];
    vi.stubGlobal('fetch', vi.fn((
      _input: RequestInfo | URL,
      init: RequestInit = {},
    ) => {
      const seed = recommendationSeed(init);
      if (!seed) throw new Error('Expected a recommendation seed.');
      requestedSeeds.push(seed);
      return Promise.resolve(Response.json(recommendationResponse(
        seed === 'initial' ? 'Initial Recommendation' : 'Final Recommendation',
        `${seed}track`,
      )));
    }));
    const view = renderRecommendations(selectedTrack('initial'));

    expect(await screen.findByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();

    vi.useFakeTimers();
    view.rerender(recommendationTree({}));
    expect(screen.queryByRole('heading', {
      name: 'Initial Recommendation',
    })).not.toBeInTheDocument();

    view.rerender(recommendationTree(selectedTrack('final')));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(requestedSeeds).toEqual(['initial']);
    expect(screen.queryByRole('heading', {
      name: 'Initial Recommendation',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading recommendations...',
    );
    expectVisualLoadingIsHiddenFromAssistiveTechnology();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(requestedSeeds).toEqual(['initial', 'final']);
    vi.useRealTimers();
    expect(await screen.findByRole('heading', {
      name: 'Final Recommendation',
    })).toBeVisible();
  });

  it('clears old recommendations when the current generation fails', async () => {
    const finalResponse = deferred<Response>();
    const fetchMock = vi.fn((
      _input: RequestInfo | URL,
      init: RequestInit = {},
    ): Promise<Response> => (
      recommendationSeed(init) === 'initial'
        ? Promise.resolve(Response.json(
          recommendationResponse('Initial Recommendation', 'initialtrack'),
        ))
        : finalResponse.promise
    ));
    vi.stubGlobal('fetch', fetchMock);
    const view = renderRecommendations(selectedTrack('initial'));

    expect(await screen.findByRole('heading', {
      name: 'Initial Recommendation',
    })).toBeVisible();

    vi.useFakeTimers();
    view.rerender(recommendationTree(selectedTrack('final')));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    finalResponse.reject(new Error('RAW CURRENT FAILURE'));
    await act(async () => {
      await finalResponse.promise.catch(() => undefined);
      await Promise.resolve();
    });
    vi.useRealTimers();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We were unable to load Spotify recommendations. Please try again.',
    );
    expect(screen.queryByRole('heading', {
      name: 'Initial Recommendation',
    })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('RAW CURRENT FAILURE');
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
        recommendationResponse('New Recommendation', 'newtrack'),
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
      recommendationResponse('Old Recommendation', 'oldtrack'),
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
          recommendationResponse('Current Recommendation', 'currenttrack'),
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
    const firstId = 'trackOne123';
    const secondId = 'trackTwo456';
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
    expect(parseRecommendedTrackIds(url.searchParams)).toEqual({
      kind: 'valid',
      trackIds: [firstId, secondId],
    });
    expect(href).toContain('trackIds=trackOne123');
    expect(href).toContain('trackIds=trackTwo456');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(link);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('generates playlist query parameters without URLSearchParams.size', async () => {
    const sizeDescriptor = Object.getOwnPropertyDescriptor(
      URLSearchParams.prototype,
      'size',
    );
    if (!sizeDescriptor) throw new Error('Expected URLSearchParams.size.');
    Object.defineProperty(URLSearchParams.prototype, 'size', {
      configurable: true,
      value: undefined,
    });

    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(
        recommendationResponse('Compatible Recommendation', 'compatible123'),
      )));
      renderRecommendations(selectedTrack('seed'));

      const link = await screen.findByRole('link', {
        name: 'Create your playlist (requires Spotify login) →',
      });
      const href = link.getAttribute('href');
      expect(href).not.toBeNull();
      expect(new URL(href!, window.location.origin).searchParams.getAll(
        'trackIds',
      )).toEqual(['compatible123']);
    } finally {
      Object.defineProperty(
        URLSearchParams.prototype,
        'size',
        sizeDescriptor,
      );
    }
  });
});

type SearchDeferredResponses = Record<string, {
  artists: Promise<Response>;
  tracks: Promise<Response>;
}>;

type SearchSource = 'artists' | 'genres' | 'tracks';

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

function createFreshSearchFetch({
  artists,
  tracks,
}: {
  artists: Array<{ name: string; uri: string }>;
  tracks: ReturnType<typeof trackSearchResult>[];
}) {
  return vi.fn((
    input: RequestInfo | URL,
  ): Promise<Response> => {
    const url = requestUrl(input);
    if (url.endsWith('/getAvailableGenreSeeds')) {
      return Promise.resolve(Response.json(['indie', 'rock']));
    }
    return Promise.resolve(Response.json({
      items: url.endsWith('/searchTracks') ? tracks : artists,
    }));
  });
}

function createSourceFailureFetch(failingSource: SearchSource) {
  return vi.fn((
    input: RequestInfo | URL,
  ): Promise<Response> => {
    const url = requestUrl(input);
    if (url.endsWith('/getAvailableGenreSeeds')) {
      return failingSource === 'genres'
        ? Promise.reject(new Error('RAW GENRE FAILURE'))
        : Promise.resolve(Response.json(['indie', 'rock']));
    }
    if (url.endsWith('/searchTracks')) {
      return failingSource === 'tracks'
        ? Promise.reject(new Error('RAW TRACK FAILURE'))
        : Promise.resolve(Response.json({
          items: [trackSearchResult('Indie Track', 'indietrack')],
        }));
    }

    return failingSource === 'artists'
      ? Promise.reject(new Error('RAW ARTIST FAILURE'))
      : Promise.resolve(Response.json({
        items: [{
          name: 'Indie Artist',
          uri: 'spotify:artist:indieartist',
        }],
      }));
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
    <button type="button">After search</button>
  </ChakraProvider>;
}

function renderAttributes(
  initialSelectedTrackAttributes: SelectedTrackAttribute[],
) {
  return render(
    <ChakraProvider theme={theme}>
      <AttributeHarness
        initialSelectedTrackAttributes={initialSelectedTrackAttributes}
      />
    </ChakraProvider>,
  );
}

function AttributeHarness({
  initialSelectedTrackAttributes,
}: {
  initialSelectedTrackAttributes: SelectedTrackAttribute[];
}) {
  const [selectedTrackAttributes, setSelectedTrackAttributes] = useState(
    initialSelectedTrackAttributes,
  );

  return <>
    <SpotifyTrackAttributeSelectorComponent
      selectedTrackAttributes={selectedTrackAttributes}
      setSelectedTrackAttributes={setSelectedTrackAttributes}
    />
    <output data-testid="selected-attributes">
      {JSON.stringify(selectedTrackAttributes)}
    </output>
  </>;
}

function SpotifyControlsHarness() {
  const [selectedObjects, setSelectedObjects] = useState<SelectedObjects>({});
  const [selectedTrackAttributes, setSelectedTrackAttributes] = useState<
    SelectedTrackAttribute[]
  >([]);

  return <ChakraProvider theme={theme}>
    <SpotifyArtistGenreTrackSearchAutocompleteComponent
      selectedObjects={selectedObjects}
      setSelectedObjects={setSelectedObjects}
    />
    <SpotifyTrackAttributeSelectorComponent
      selectedTrackAttributes={selectedTrackAttributes}
      setSelectedTrackAttributes={setSelectedTrackAttributes}
    />
  </ChakraProvider>;
}

function SeedComboboxHarness({
  options,
}: {
  options: AutocompleteOption[];
}) {
  const [inputText, setInputText] = useState('grouped');
  const [selectedObjects, setSelectedObjects] = useState<SelectedObjects>({});

  return <SpotifySeedCombobox
    inputText={inputText}
    onInputTextChange={setInputText}
    onRemove={uri => {
      const nextSelectedObjects = { ...selectedObjects };
      delete nextSelectedObjects[uri];
      setSelectedObjects(nextSelectedObjects);
    }}
    onSelect={option => setSelectedObjects({
      ...selectedObjects,
      [option.uri]: option,
    })}
    options={options}
    selectedObjects={selectedObjects}
  />;
}

function readSelectedAttributes(): SelectedTrackAttribute[] {
  return JSON.parse(
    screen.getByTestId('selected-attributes').textContent ?? '[]',
  ) as SelectedTrackAttribute[];
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

function expectVisualLoadingIsHiddenFromAssistiveTechnology() {
  expect(screen.getAllByText('Loading recommendations...').some(element => (
    element.closest('[aria-hidden="true"]') !== null
  ))).toBe(true);
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
