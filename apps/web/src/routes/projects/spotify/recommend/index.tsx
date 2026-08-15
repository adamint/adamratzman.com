import { ProjectPage } from '../../../../components/projects/ProjectPage';
import React, { useState } from 'react';
import { SpotifyArtistGenreTrackSearchAutocompleteComponent } from '../../../../components/projects/spotify/playlist_generator/SpotifyArtistGenreTrackSearchAutocompleteComponent';
import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { SpotifyTrackAttributeSelectorComponent } from '../../../../components/projects/spotify/playlist_generator/SpotifyTrackAttributeSelectorComponent';
import type { TrackAttribute } from '../../../../components/projects/spotify/TrackAttribute';
import { SpotifyGenerateAndShowPlaylistRecommendationsComponent } from '../../../../components/projects/spotify/playlist_generator/SpotifyGenerateAndShowPlaylistRecommendationsComponent';
import { PageTitle } from '../../../../components/meta/PageTitle';

export interface SelectedObjects {
  [uri: string]: AutocompleteOption;
}

export type AutocompleteType = 'genre' | 'track' | 'artist'

export type AutocompleteOption = {
  uri: string;
  text: string;
  additionalText?: string;
  obj: unknown;
  textMapper: () => React.ReactElement,
  type: AutocompleteType
}

export type SelectedTrackAttributeType = 'target' | 'min' | 'max'

export type SelectedTrackAttribute = {
  id: TrackAttribute['id'];
  value: number;
  trackAttribute: TrackAttribute;
  type: SelectedTrackAttributeType
}

function SpotifyPlaylistGeneratorRoute() {
  const [selectedObjects, setSelectedObjects] = useState<SelectedObjects>({});
  const [selectedTrackAttributes, setSelectedTrackAttributes] = useState<SelectedTrackAttribute[]>([]);

  return <>
    <PageTitle title="Spotify Playlist Generator" />
    <>
      <ProjectPage projectTitle='Spotify playlist generator'>
        <Heading size='mdx' mb={1} variant='semiLight'>Songs, artists, and <ChakraRouterLink
          href='/projects/spotify/genres/list' target='_blank'>genres</ChakraRouterLink> (at least one is
          required)</Heading>
        <SpotifyArtistGenreTrackSearchAutocompleteComponent selectedObjects={selectedObjects}
                                                            setSelectedObjects={setSelectedObjects} />
        <Text mt={1} mb={5} fontSize='md'><b>At least one</b> genre, track, or artist, and <b>not more than 5</b>, are
          required.</Text>

        <Heading size='mdx' mb={1} variant='semiLight'>Desired track attributes</Heading>
        <SpotifyTrackAttributeSelectorComponent selectedTrackAttributes={selectedTrackAttributes}
                                                setSelectedTrackAttributes={setSelectedTrackAttributes} />

        <SpotifyGenerateAndShowPlaylistRecommendationsComponent selectedObjects={selectedObjects}
                                                                selectedTrackAttributes={selectedTrackAttributes} />
      </ProjectPage>
    </>
  </>;
}

export default SpotifyPlaylistGeneratorRoute;
