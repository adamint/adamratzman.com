import { ProjectPage } from '../../ProjectPage';
import { SpotifyLogoutButton } from '../../../../../spotify-auth/SpotifyLogoutButton';
import { useDocumentTitle } from '../../../../utils/useDocumentTitle';
import React, { useState } from 'react';
import { SpotifyArtistGenreTrackSearchAutocompleteComponent } from './SpotifyArtistGenreTrackSearchAutocompleteComponent';
import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../utils/ChakraRouterLink';
import { SpotifyTrackAttributeSelectorComponent } from './SpotifyTrackAttributeSelectorComponent';
import { SpotifyRouteProps } from '../SpotifyRoute';
import { TrackAttribute } from './TrackAttribute';
import { SpotifyGenerateAndShowPlaylistRecommendationsComponent } from './SpotifyGenerateAndShowPlaylistRecommendationsComponent';

export interface SelectedObjects {
  [uri: string]: AutocompleteOption;
}

export type AutocompleteType = 'genre' | 'track' | 'artist'

export type AutocompleteOption = {
  uri: string;
  text: string;
  additionalText?: string;
  obj: any;
  textMapper: () => React.ReactElement,
  type: AutocompleteType
}

export type SelectedTrackAttributeType = 'target' | 'min' | 'max'

export type SelectedTrackAttribute = {
  id: string;
  value: number;
  trackAttribute: TrackAttribute;
  type: SelectedTrackAttributeType
}

export function SpotifyPlaylistGeneratorRoute({ spotifyApi, setSpotifyTokenInfo }: SpotifyRouteProps) {
  useDocumentTitle(`Spotify Playlist Generator`);
  const [selectedObjects, setSelectedObjects] = useState<SelectedObjects>({});
  const [selectedTrackAttributes, setSelectedTrackAttributes] = useState<SelectedTrackAttribute[]>([]);

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

