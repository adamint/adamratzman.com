import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
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
import type { SearchRequest } from '@adamratzman/contracts';
import { AutocompleteOption, SelectedObjects } from '../../../../pages/projects/spotify/recommend';
import axios, { AxiosResponse } from 'axios';

type SpotifyArtistGenreTrackSearchAutocompleteComponentProps = {
  selectedObjects: SelectedObjects;
  setSelectedObjects: (selectedObjects: SelectedObjects) => void;
}

async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>, setInputText: (query: string) => void, searchAndFilterResults: (query: string) => Promise<void>) {
  const query = event.target.value;
  setInputText(query);
  await searchAndFilterResults(query);
}

export function SpotifyArtistGenreTrackSearchAutocompleteComponent({
                                                                     selectedObjects,
                                                                     setSelectedObjects,
                                                                   }: SpotifyArtistGenreTrackSearchAutocompleteComponentProps) {
  const [inputText, setInputText] = useState('');
  const [allAvailableGenreSeeds, setAllAvailableGenreSeeds] = useState<string[]>([]);
  const [allAutocompleteOptions, setAllAutocompleteOptions] = useState<AutocompleteOption[]>([]);
  const [tagToRemove, setTagToRemove] = useState<{ onRemove: () => void } | null>(null);

  useEffect(() => {
    if (tagToRemove) {
      tagToRemove.onRemove();
      setTagToRemove(null);
    }
  }, [tagToRemove, selectedObjects]);

  useEffect(() => {
    void (async () => {
      setAllAvailableGenreSeeds((await axios.get<string[]>('/api/spotify/getAvailableGenreSeeds')).data);
    })();
  }, []);

  async function searchAndFilterResults(query: string) {
    if (query.length < 1) {
      setAllAutocompleteOptions([]);
      return;
    }

    const genres: AutocompleteOption[] = allAvailableGenreSeeds
      .filter(genreSeed => genreSeed.includes(query.toLowerCase()))
      .map((genreSeed: string) => ({
        uri: `spotify:genre:${genreSeed}`,
        text: genreSeed,
        additionalText: undefined,
        obj: genreSeed,
        textMapper: () => <><b>{genreSeed}</b></>,
        type: 'genre',
      }));

    const trackPromise = async () => {
      const tracks = (await axios.post<SearchRequest, AxiosResponse<SpotifyApi.PagingObject<SpotifyApi.TrackObjectFull>>>(
        '/api/spotify/searchTracks',
        { query: query, options: { limit: 10 } },
      )).data.items;

      return tracks.map((track: SpotifyApi.TrackObjectFull) => {
        return {
          uri: track.uri,
          text: track.name,
          additionalText: track.artists.map((artist: SpotifyApi.ArtistObjectSimplified) => artist.name).join(' '),
          obj: track,
          textMapper: () => <>
            <b>{track.name}</b> <Box as='span'
                                     ml={1}> by {track.artists.map((artist: SpotifyApi.ArtistObjectSimplified) => artist.name).join(', ')}</Box>
          </>,
          type: 'track',
        };
      });
    };

    const artistPromise = async () => {
      const artists = (await axios.post<SearchRequest, AxiosResponse<SpotifyApi.PagingObject<SpotifyApi.ArtistObjectFull>>>(
        '/api/spotify/searchArtists',
        { query: query, options: { limit: 10 } },
      )).data.items;

      return artists.map((artist: SpotifyApi.ArtistObjectFull) => {
        return {
          uri: artist.uri,
          text: artist.name,
          additionalText: null,
          obj: artist,
          textMapper: () => <><b>{artist.name}</b></>,
          type: 'artist',
        };
      });
    };

    const [tracks, artists] = await Promise.all([trackPromise(), artistPromise()]);

    const allFoundObjects = [...tracks, ...artists, ...genres];

    const fuse = new Fuse(allFoundObjects, {
      keys: ['text', 'additionalText'],
    });

    const searchResults = fuse.search(query);
    const searchResultItems = searchResults.map(result => result.item as AutocompleteOption);

    setAllAutocompleteOptions(searchResultItems);
  }

  function getAutocompleteItem(option: AutocompleteOption) {
    return <AutoCompleteItem
      key={`autocomplete-spotify-option-${option.uri}`}
      value={option}>
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
                         void handleInputChange(e, setInputText, searchAndFilterResults);
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
  </AutoComplete>;
}