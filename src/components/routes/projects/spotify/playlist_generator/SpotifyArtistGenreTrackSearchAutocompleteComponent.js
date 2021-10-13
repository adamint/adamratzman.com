import { useEffect, useState } from 'react';
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

export function SpotifyArtistGenreTrackSearchAutocompleteComponent({
                                                                     spotifyApi,
                                                                     selectedObjects,
                                                                     setSelectedObjects,
                                                                   }) {
  const [inputText, setInputText] = useState('');
  const [allAvailableGenreSeeds, setAllAvailableGenreSeeds] = useState([]);
  const [allAutocompleteOptions, setAllAutocompleteOptions] = useState([]);

  useEffect(() => {
    (async () => {
      setAllAvailableGenreSeeds((await spotifyApi.getAvailableGenreSeeds()).genres);
    })();
    // eslint-disable-next-line
  }, []);

  async function searchAndFilterResults(query) {
    if (query.length < 1) {
      setAllAutocompleteOptions([]);
      return;
    }

    const genrePromise = async () => {
      return allAvailableGenreSeeds.filter(genreSeed => genreSeed.includes(query.toLowerCase()))
        .map(genreSeed => {
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
      return (await spotifyApi.searchTracks(query, { limit: 10 })).tracks.items
        .map(track => {
          return {
            uri: track.uri,
            text: track.name,
            additionalText: track.artists.map(artist => artist.name).join(' '),
            obj: track,
            textMapper: () => <><b>{track.name}</b> <Box as='span'
                                                         ml={1}> by {track.artists.map(artist => artist.name).join(', ')}</Box></>,
            type: 'track',
          };
        });
    };
    const artistPromise = async () => {
      return (await spotifyApi.searchArtists(query, { limit: 10 })).artists.items
        .map(artist => {
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
    const searchResultItems = searchResults.map(result => result.item);

    setAllAutocompleteOptions(searchResultItems);
  }

  async function handleInputChange(event) {
    const query = event.target.value;
    setInputText(query);
    await searchAndFilterResults(query);
  }

  const handleInputChangeDebounced = AwesomeDebouncePromise(handleInputChange, 350);

  function getAutocompleteItem(option, groupId) {
    return <AutoCompleteItem
      key={`autocomplete-spotify-option-${option.uri}`}
      value={option}
      groupId={groupId}>
      {option.textMapper()}
    </AutoCompleteItem>;
  }

  function handleAutocompleteSelectedValuesChange(values) {
    const newSelectedObjects = { ...selectedObjects };
    values.forEach(value => {
      if (!newSelectedObjects[value]) newSelectedObjects[value] = allAutocompleteOptions.find(opt => opt.uri === value);
    });
    setSelectedObjects(newSelectedObjects);
  }

  let topTenResults;
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
            label={optionObj.textMapper()}
            onRemove={onRemoveTag}
            bgColor={bgColor}
          />;
        });
      }
      }
    </AutoCompleteInput>
    <AutoCompleteList maxH='100%'>
      <AutoCompleteGroup id='tracks' showDivider>
        <AutoCompleteGroupTitle><b><u>Tracks</u></b></AutoCompleteGroupTitle>

        {topTenResults.filter(option => option.type === 'track').map(option => getAutocompleteItem(option, 'tracks'))}
      </AutoCompleteGroup>

      <AutoCompleteGroup id='artists' showDivider>
        <AutoCompleteGroupTitle><b><u>Artists</u></b></AutoCompleteGroupTitle>

        {topTenResults.filter(option => option.type === 'artist').map(option => getAutocompleteItem(option, 'artists'))}
      </AutoCompleteGroup>

      <AutoCompleteGroup id='genres' showDivider>
        <AutoCompleteGroupTitle><b><u>Genres</u></b></AutoCompleteGroupTitle>

        {topTenResults.filter(option => option.type === 'genre').map(option => getAutocompleteItem(option, 'genres'))}
      </AutoCompleteGroup>

    </AutoCompleteList>
  </AutoComplete>;
}