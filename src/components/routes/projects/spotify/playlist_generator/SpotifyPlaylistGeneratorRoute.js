import { ProjectPage } from '../../ProjectPage';
import { SpotifyLogoutButton } from '../../../../../spotify-auth/SpotifyLogoutButton';
import { useDocumentTitle } from '../../../../utils/useDocumentTitle';
import { useState } from 'react';
import { SpotifyArtistGenreTrackSearchAutocompleteComponent } from './SpotifyArtistGenreTrackSearchAutocompleteComponent';
import { Alert, AlertDescription, AlertIcon, Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../utils/ChakraRouterLink';
import { SpotifyTrackAttributeSelectorComponent } from './SpotifyTrackAttributeSelectorComponent';
import { GetAndShowSpotifyTrackRecommendations } from './GetAndShowSpotifyTrackRecommendations';

export function SpotifyPlaylistGeneratorRoute({ spotifyApi, setSpotifyTokenInfo }) {
  useDocumentTitle(`Spotify Playlist Generator`);
  const [selectedObjects, setSelectedObjects] = useState({});
  const [selectedTrackAttributes, setSelectedTrackAttributes] = useState([]);

  return <ProjectPage
    projectTitle='Spotify playlist generator'
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
  >
    <Heading size='mdx' mb={1} variant='semiLight'>Songs, artists, and <ChakraRouterLink
      to='/projects/spotify/genres/list' target='_blank'>genres</ChakraRouterLink> (at least one is required)</Heading>
    <SpotifyArtistGenreTrackSearchAutocompleteComponent spotifyApi={spotifyApi}
                                                        selectedObjects={selectedObjects}
                                                        setSelectedObjects={setSelectedObjects} />
    <Text mt={1} mb={5} fontSize='md'><b>At least one</b> genre, track, or artist, and <b>not more than 5</b>, are
      required.</Text>

    <Heading size='mdx' mb={1} variant='semiLight'>Desired track attributes</Heading>
    <SpotifyTrackAttributeSelectorComponent selectedTrackAttributes={selectedTrackAttributes}
                                            setSelectedTrackAttributes={setSelectedTrackAttributes} />

    <SpotifyGenerateAndShowPlaylistRecommendationsComponent spotifyApi={spotifyApi}
                                                            selectedObjects={selectedObjects}
                                                            selectedTrackAttributes={selectedTrackAttributes} />
  </ProjectPage>;
}

function SpotifyGenerateAndShowPlaylistRecommendationsComponent({
                                                                  spotifyApi,
                                                                  selectedObjects,
                                                                  selectedTrackAttributes,
                                                                }) {
  if (Object.entries(selectedObjects).length === 0) {
    if (selectedTrackAttributes.length > 0) {
      return <Alert status='error' mt={10}>
        <AlertIcon />
        <AlertDescription>You need to add at least one artist, track, or genre.</AlertDescription>
      </Alert>;
    } else return null;
  } else if (Object.entries(selectedObjects).length > 5) {
    return <Alert status='error' mt={10}>
      <AlertIcon />
      <AlertDescription>You can only have between one and five artists, tracks, and genres.</AlertDescription>
    </Alert>;
  } else return <GetAndShowSpotifyTrackRecommendations spotifyApi={spotifyApi}
                                                       selectedObjects={selectedObjects}
                                                       selectedTrackAttributes={selectedTrackAttributes} />;
}
