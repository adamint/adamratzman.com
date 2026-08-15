import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
} from '@chakra-ui/react';
import Fuse from 'fuse.js';
import {
  AutoComplete,
  AutoCompleteGroup,
  AutoCompleteGroupTitle,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete';
import type {
  SearchRequest,
  SpotifyAutocompleteArtist,
  SpotifyAutocompleteTrack,
} from '@adamratzman/contracts';
import { AutocompleteOption, SelectedObjects } from '../../../../routes/projects/spotify/recommend';
import { fetchJson } from '../../../../api/client';
import {
  isSpotifyArtistSearchPage,
  isSpotifyGenreList,
  isSpotifyTrackSearchPage,
} from '../../../../api/spotifyBrowserValidation';
import { useLatestAsyncData } from '../../../utils/useLatestAsyncData';

type SpotifyArtistGenreTrackSearchAutocompleteComponentProps = {
  selectedObjects: SelectedObjects;
  setSelectedObjects: (selectedObjects: SelectedObjects) => void;
}

type SpotifySearchResults = {
  artists: SpotifyAutocompleteArtist[];
  tracks: SpotifyAutocompleteTrack[];
};

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
  const [tagToRemove, setTagToRemove] = useState<{ onRemove: () => void } | null>(null);
  const query = inputText.trim();
  const genreState = useLatestAsyncData(getAvailableGenreSeeds);
  const searchProducer = useMemo(() => {
    if (!query) return null;

    return async (signal: AbortSignal): Promise<SpotifySearchResults> => {
      await abortableDelay(250, signal);
      const request: SearchRequest = {
        options: { limit: 10 },
        query,
      };
      const init: RequestInit = {
        body: JSON.stringify(request),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        signal,
      };
      const [trackResponse, artistResponse] = await Promise.all([
        fetchJson<unknown>('/api/spotify/searchTracks', init),
        fetchJson<unknown>('/api/spotify/searchArtists', init),
      ]);

      if (!isSpotifyTrackSearchPage(trackResponse)
        || !isSpotifyArtistSearchPage(artistResponse)) {
        throw new Error();
      }

      return {
        artists: artistResponse.items,
        tracks: trackResponse.items,
      };
    };
  }, [query]);
  const searchState = useLatestAsyncData(searchProducer);
  const allAutocompleteOptions = useMemo(() => {
    if (!query || genreState.error || searchState.error || !searchState.data) {
      return [];
    }

    const genres: AutocompleteOption[] = (genreState.data ?? [])
      .filter(genreSeed => genreSeed.includes(query.toLowerCase()))
      .map(genreSeed => ({
        uri: `spotify:genre:${genreSeed}`,
        text: genreSeed,
        additionalText: undefined,
        textMapper: () => <><b>{genreSeed}</b></>,
        type: 'genre',
      }));
    const tracks: AutocompleteOption[] = searchState.data.tracks.map(track => ({
      uri: track.uri,
      text: track.name,
      additionalText: track.artists.map(artist => artist.name).join(' '),
      textMapper: () => <>
        <b>{track.name}</b> <Box as='span' ml={1}>
          by {track.artists.map(artist => artist.name).join(', ')}
        </Box>
      </>,
      type: 'track',
    }));
    const artists: AutocompleteOption[] = searchState.data.artists.map(artist => ({
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
    genreState.data,
    genreState.error,
    query,
    searchState.data,
    searchState.error,
  ]);

  useEffect(() => {
    if (tagToRemove) {
      tagToRemove.onRemove();
      setTagToRemove(null);
    }
  }, [tagToRemove, selectedObjects]);

  function getAutocompleteItem(option: AutocompleteOption) {
    return <AutoCompleteItem
      key={`autocomplete-spotify-option-${option.uri}`}
      value={option.uri}>
      {option.textMapper()}
    </AutoCompleteItem>;
  }

  function handleAutocompleteSelectedValuesChange(values: string[]) {
    const newSelectedObjects: SelectedObjects = { ...selectedObjects };
    values.forEach((value: string) => {
      if (!newSelectedObjects[value]) {
        const foundOption = allAutocompleteOptions.find(opt => opt.uri === value);
        if (foundOption) newSelectedObjects[value] = foundOption;
      }
    });
    setSelectedObjects(newSelectedObjects);
    setInputText('');
  }

  let topResults: AutocompleteOption[];
  if (allAutocompleteOptions.filter(opt => opt.type === 'track').slice(0, 5).length + allAutocompleteOptions.filter(opt => opt.type === 'artist').slice(0, 5).length >= 8) {
    topResults = allAutocompleteOptions.filter(opt => opt.type === 'track').slice(0, 4)
      .concat(allAutocompleteOptions.filter(opt => opt.type === 'artist').slice(0, 4))
      .concat(allAutocompleteOptions.filter(opt => opt.type === 'genre').slice(0, 4));
  } else topResults = allAutocompleteOptions.slice(0, 15);

  const trackGroup = [
    <AutoCompleteGroupTitle key='group-key'><b><u>Tracks</u></b></AutoCompleteGroupTitle>,
    ...topResults.filter(option => option.type === 'track').map(option => getAutocompleteItem(option)),
  ];

  const artistGroup = [
    <AutoCompleteGroupTitle key='group-key'><b><u>Artists</u></b></AutoCompleteGroupTitle>,
    ...topResults.filter(option => option.type === 'artist').map(option => getAutocompleteItem(option)),
  ];

  const genreGroup = [
    <AutoCompleteGroupTitle key='group-key'><b><u>Genres</u></b></AutoCompleteGroupTitle>,
    ...topResults.filter(option => option.type === 'genre').map(option => getAutocompleteItem(option)),
  ];

  return <AutoComplete filter={(_query: string, optionValue: unknown) => {
    return typeof optionValue === 'string'
      && allAutocompleteOptions.some(opt => opt.uri === optionValue);
  }}
                       multiple
                       onChange={(values: unknown) => {
                         if (Array.isArray(values) && values.every(value => typeof value === 'string')) {
                           handleAutocompleteSelectedValuesChange(values);
                         }
                       }}>
    <AutoCompleteInput variant='filled' placeholder='Enter a Spotify track, artist, or genre...' autoFocus
                       value={inputText}
                       onChange={e => {
                         setInputText(e.target.value);
                       }}>
      {({ tags }: { tags: Array<{ label: unknown; onRemove: () => void }> }) => {
        return tags.map(tag => {
          const uri = tag.label;
          if (typeof uri !== 'string') return null;
          const selectedUri = uri;
          const optionObj = selectedObjects[selectedUri];
          if (!optionObj) return null;
          let bgColor;
          if (optionObj.type === 'genre') bgColor = 'teal.400';
          else if (optionObj.type === 'track') bgColor = 'orange.400';
          else bgColor = 'green.400';

          function onRemoveTag() {
            const newSelectedObjects = { ...selectedObjects };
            delete newSelectedObjects[selectedUri];
            setSelectedObjects(newSelectedObjects);
            setTagToRemove({ onRemove: tag.onRemove });
          }

          return <AutoCompleteTag
            key={selectedUri}
            // @ts-expect-error The compatibility package accepts React nodes at runtime but types this as string.
            label={optionObj.textMapper()}
            onRemove={onRemoveTag}
            bgColor={bgColor}
          />;
        });
      }
      }
    </AutoCompleteInput>
    <AutoCompleteList maxH='100%'>
      <AutoCompleteGroup showDivider>
        {trackGroup}
      </AutoCompleteGroup>

      <AutoCompleteGroup showDivider>
        {artistGroup}
      </AutoCompleteGroup>

      <AutoCompleteGroup showDivider>
        {genreGroup}
      </AutoCompleteGroup>

    </AutoCompleteList>
    {(genreState.error || searchState.error) && <Alert status='error' mt={2}>
      <AlertIcon />
      <AlertDescription>
        We were unable to search Spotify. Please try again.
      </AlertDescription>
    </Alert>}
  </AutoComplete>;
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