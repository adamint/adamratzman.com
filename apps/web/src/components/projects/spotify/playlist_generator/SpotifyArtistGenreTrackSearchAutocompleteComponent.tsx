import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
} from '@chakra-ui/react';
import Fuse from 'fuse.js';
import type {
  SearchRequest,
  SpotifySearchPage,
} from '@adamratzman/contracts';
import { AutocompleteOption, SelectedObjects } from '../../../../routes/projects/spotify/recommend';
import { fetchJson } from '../../../../api/client';
import {
  isSpotifyArtistSearchPage,
  isSpotifyGenreList,
  isSpotifyTrackSearchPage,
} from '../../../../api/spotifyBrowserValidation';
import { useLatestAsyncData } from '../../../utils/useLatestAsyncData';
import { SpotifySeedCombobox } from './SpotifySeedCombobox';

type SpotifyArtistGenreTrackSearchAutocompleteComponentProps = {
  selectedObjects: SelectedObjects;
  setSelectedObjects: (selectedObjects: SelectedObjects) => void;
}

async function getAvailableGenreSeeds(signal: AbortSignal) {
  const response = await fetchJson<unknown>(
    '/api/spotify/getAvailableGenreSeeds',
    { signal },
  );
  if (!isSpotifyGenreList(response)) throw new Error();
  return response;
}

export function SpotifyArtistGenreTrackSearchAutocompleteComponent({
                                                                     selectedObjects,
                                                                     setSelectedObjects,
                                                                   }: SpotifyArtistGenreTrackSearchAutocompleteComponentProps) {
  const [inputText, setInputText] = useState('');
  const query = inputText.trim();
  const genreState = useLatestAsyncData(getAvailableGenreSeeds);
  const artistProducer = useMemo(
    () => createSpotifySearchProducer(
      query,
      '/api/spotify/searchArtists',
      isSpotifyArtistSearchPage,
    ),
    [query],
  );
  const trackProducer = useMemo(
    () => createSpotifySearchProducer(
      query,
      '/api/spotify/searchTracks',
      isSpotifyTrackSearchPage,
    ),
    [query],
  );
  const artistState = useLatestAsyncData(artistProducer);
  const trackState = useLatestAsyncData(trackProducer);
  const allAutocompleteOptions = useMemo(() => {
    if (!query) return [];

    const genres: AutocompleteOption[] = (genreState.data ?? [])
      .filter(genreSeed => genreSeed.includes(query.toLowerCase()))
      .map(genreSeed => ({
        uri: `spotify:genre:${genreSeed}`,
        text: genreSeed,
        additionalText: undefined,
        textMapper: () => <><b>{genreSeed}</b></>,
        type: 'genre',
      }));
    const tracks: AutocompleteOption[] = (trackState.data ?? []).map(track => ({
      uri: track.uri,
      text: track.name,
      additionalText: track.artists.map(artist => artist.name).join(' '),
      displayText: `${track.name} by ${track.artists.map(
        artist => artist.name,
      ).join(', ')}`,
      textMapper: () => <>
        <b>{track.name}</b> <Box as='span' ml={1}>
          by {track.artists.map(artist => artist.name).join(', ')}
        </Box>
      </>,
      type: 'track',
    }));
    const artists: AutocompleteOption[] = (artistState.data ?? []).map(artist => ({
      uri: artist.uri,
      text: artist.name,
      additionalText: undefined,
      textMapper: () => <><b>{artist.name}</b></>,
      type: 'artist',
    }));
    const fuse = new Fuse([...tracks, ...artists, ...genres], {
      keys: ['text', 'additionalText'],
    });

    return fuse.search(query).map(result => result.item);
  }, [
    artistState.data,
    genreState.data,
    query,
    trackState.data,
  ]);

  function handleOptionSelected(option: AutocompleteOption) {
    if (selectedObjects[option.uri]) return;
    setSelectedObjects({
      ...selectedObjects,
      [option.uri]: option,
    });
  }

  function handleOptionRemoved(uri: string) {
    const newSelectedObjects = { ...selectedObjects };
    delete newSelectedObjects[uri];
    setSelectedObjects(newSelectedObjects);
  }

  let topResults: AutocompleteOption[];
  if (allAutocompleteOptions.filter(opt => opt.type === 'track').slice(0, 5).length + allAutocompleteOptions.filter(opt => opt.type === 'artist').slice(0, 5).length >= 8) {
    topResults = allAutocompleteOptions.filter(opt => opt.type === 'track').slice(0, 4)
      .concat(allAutocompleteOptions.filter(opt => opt.type === 'artist').slice(0, 4))
      .concat(allAutocompleteOptions.filter(opt => opt.type === 'genre').slice(0, 4));
  } else topResults = allAutocompleteOptions.slice(0, 15);

  return <>
    <SpotifySeedCombobox
      inputText={inputText}
      onInputTextChange={setInputText}
      onRemove={handleOptionRemoved}
      onSelect={handleOptionSelected}
      options={topResults}
      selectedObjects={selectedObjects}
    />
    {query && (genreState.error || artistState.error || trackState.error) && <Alert role='alert' status='error' mt={2}>
      <AlertIcon />
      <AlertDescription>
        We were unable to search Spotify. Please try again.
      </AlertDescription>
    </Alert>}
  </>;
}

function createSpotifySearchProducer<Item>(
  query: string,
  endpoint: string,
  isValidPage: (value: unknown) => value is SpotifySearchPage<Item>,
) {
  if (!query) return null;

  return async (signal: AbortSignal): Promise<Item[]> => {
    await abortableDelay(250, signal);
    const request: SearchRequest = {
      options: { limit: 10 },
      query,
    };
    const response = await fetchJson<unknown>(endpoint, {
      body: JSON.stringify(request),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
      signal,
    });
    if (!isValidPage(response)) throw new Error();
    return response.items;
  };
}

function abortableDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('The request was aborted.', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);

    if (signal.aborted) {
      handleAbort();
      return;
    }

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}