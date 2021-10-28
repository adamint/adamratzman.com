import React, { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import Fuse from 'fuse.js';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import {
  AutoComplete,
  AutoCompleteGroup,
  AutoCompleteGroupTitle,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteList,
  AutoCompleteTag,
} from '@choc-ui/chakra-autocomplete';
import { AutocompleteOption, AutocompleteType, SelectedObjects } from '../../../../pages/projects/spotify/recommend';
import axios, { AxiosResponse } from 'axios';
import { SearchTracksOrArtistsBody } from '../../../../pages/api/spotify/searchTracks';

type SpotifyArtistGenreTrackSearchAutocompleteComponentProps = {
  selectedObjects: SelectedObjects;
  setSelectedObjects: Function;
}

export function SpotifyArtistGenreTrackSearchAutocompleteComponent({
                                                                     selectedObjects,
                                                                     setSelectedObjects,
                                                                   }: SpotifyArtistGenreTrackSearchAutocompleteComponentProps) {
  const [inputText, setInputText] = useState('');
  const [allAvailableGenreSeeds, setAllAvailableGenreSeeds] = useState<string[]>([]);
  const [allAutocompleteOptions, setAllAutocompleteOptions] = useState<AutocompleteOption[]>([]);

  useEffect(() => {
    (async () => {
      setAllAvailableGenreSeeds((await axios.get<string[]>('/api/spotify/getAvailableGenreSeeds')).data);
    })();
    // eslint-disable-next-line
  }, []);

  async function searchAndFilterResults(query: string) {
    if (query.length < 1) {
      setAllAutocompleteOptions([]);
      return;
    }

    const genrePromise = async () => {
      console.log(allAvailableGenreSeeds)

      return allAvailableGenreSeeds.filter(genreSeed => genreSeed.includes(query.toLowerCase())).map((genreSeed: string) => {
        return {
          uri: `spotify:genre:${genreSeed}`,
          text: genreSeed,
          additionalText: null,
          obj: genreSeed,
          textMapper: () => <><b>{genreSeed}</b></>,
          type: 'genre',
        };
      });
    };

    const trackPromise = async () => {
      const tracks = (await axios.post<SearchTracksOrArtistsBody, AxiosResponse<SpotifyApi.PagingObject<SpotifyApi.TrackObjectFull>>>(
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
      const artists = (await axios.post<SearchTracksOrArtistsBody, AxiosResponse<SpotifyApi.PagingObject<SpotifyApi.ArtistObjectFull>>>(
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

    const [genres, tracks, artists] = await Promise.all([genrePromise(), trackPromise(), artistPromise()]);

    const allFoundObjects = [...tracks, ...artists, ...genres];

    const fuse = new Fuse(allFoundObjects, {
      keys: ['text', 'additionalText'],
    });

    const searchResults = fuse.search(query);
    const searchResultItems = searchResults.map(result => result.item as AutocompleteOption);

    setAllAutocompleteOptions(searchResultItems);
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const query = event.target.value;
    setInputText(query);
    await searchAndFilterResults(query);
  }

  const handleInputChangeDebounced = AwesomeDebouncePromise(handleInputChange, 350);

  function getAutocompleteItem(option: AutocompleteOption, groupId: AutocompleteType) {
    return <AutoCompleteItem
      key={`autocomplete-spotify-option-${option.uri}`}
      value={option}
      groupId={groupId}>
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
  }

  let topTenResults: AutocompleteOption[];
  if (allAutocompleteOptions.filter(opt => opt.type === 'track').slice(0, 10).length + allAutocompleteOptions.filter(opt => opt.type === 'artist').slice(0, 10).length >= 15) {
    topTenResults = allAutocompleteOptions.filter(opt => opt.type === 'track').slice(0, 8)
      .concat(allAutocompleteOptions.filter(opt => opt.type === 'artist').slice(0, 7))
      .concat(allAutocompleteOptions.filter(opt => opt.type === 'genre'));
  } else topTenResults = allAutocompleteOptions.slice(0, 15);

  return <AutoComplete rollNavigation={false}
                       filter={(query, optionValue) => allAutocompleteOptions.some(opt => opt.uri === optionValue)}
                       multiple
                       onChange={handleAutocompleteSelectedValuesChange}>
    <AutoCompleteInput variant='filled' placeholder='Enter a Spotify track, artist, or genre...' autoFocus
                       value={inputText}
                       onChange={
                         async e => {
                           if (e.target.value.length <= 1) await handleInputChange(e);
                           else await handleInputChangeDebounced(e);
                         }
                       }>
      {({ tags }) => {
        return tags.map(tag => {
          const uri = tag.label;
          const optionObj = selectedObjects[uri];
          if (!optionObj) return null;
          let bgColor;
          if (optionObj.type === 'genre') bgColor = 'teal.400';
          else if (optionObj.type === 'track') bgColor = 'orange.400';
          else bgColor = 'green.400';

          function onRemoveTag() {
            const newSelectedObjects = { ...selectedObjects };
            delete newSelectedObjects[uri];
            setSelectedObjects(newSelectedObjects);
            tag.onRemove();
          }

          return <AutoCompleteTag
            key={uri}
            // @ts-ignore
            label={optionObj.textMapper()}
            onRemove={onRemoveTag}
            bgColor={bgColor}
          />;
        });
      }
      }
    </AutoCompleteInput>
    <AutoCompleteList maxH='100%'>
      <AutoCompleteGroup id='track' showDivider>
        <AutoCompleteGroupTitle><b><u>Tracks</u></b></AutoCompleteGroupTitle>

        {topTenResults.filter(option => option.type === 'track').map(option => getAutocompleteItem(option, 'track'))}
      </AutoCompleteGroup>

      <AutoCompleteGroup id='artist' showDivider>
        <AutoCompleteGroupTitle><b><u>Artists</u></b></AutoCompleteGroupTitle>

        {topTenResults.filter(option => option.type === 'artist').map(option => getAutocompleteItem(option, 'artist'))}
      </AutoCompleteGroup>

      <AutoCompleteGroup id='genre' showDivider>
        <AutoCompleteGroupTitle><b><u>Genres</u></b></AutoCompleteGroupTitle>

        {topTenResults.filter(option => option.type === 'genre').map(option => getAutocompleteItem(option, 'genre'))}
      </AutoCompleteGroup>

    </AutoCompleteList>
  </AutoComplete>;
}