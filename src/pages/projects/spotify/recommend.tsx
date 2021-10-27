import { ProjectPage } from '../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../spotify-auth/SpotifyLogoutButton';
import React, { useState } from 'react';
import { SpotifyArtistGenreTrackSearchAutocompleteComponent } from '../../../components/projects/spotify/playlist_generator/SpotifyArtistGenreTrackSearchAutocompleteComponent';
import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { SpotifyTrackAttributeSelectorComponent } from '../../../components/projects/spotify/playlist_generator/SpotifyTrackAttributeSelectorComponent';
import { TrackAttribute } from '../../../components/projects/spotify/TrackAttribute';
import { SpotifyGenerateAndShowPlaylistRecommendationsComponent } from '../../../components/projects/spotify/playlist_generator/SpotifyGenerateAndShowPlaylistRecommendationsComponent';
import { useSpotifyStore } from '../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../spotify-auth/SpotifyAuthUtils';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';
import { RequireSpotifyScopesOrElseShowLogin } from '../../../spotify-auth/RequireSpotifyScopesOrElseShowLogin';
import shallow from 'zustand/shallow';
import Head from 'next/head';

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

function SpotifyPlaylistGeneratorRoute() {
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);

  const [selectedObjects, setSelectedObjects] = useState<SelectedObjects>({});
  const [selectedTrackAttributes, setSelectedTrackAttributes] = useState<SelectedTrackAttribute[]>([]);

  return <SpotifyRouteComponent>
    <Head>
      <title>Spotify Playlist Generator</title>
    </Head>
    {spotifyTokenInfo && <RequireSpotifyScopesOrElseShowLogin
      requiredScopes={['playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative']}
      clientId={spotifyClientId}
      redirectUri={spotifyRedirectUri}
      codeVerifier={codeVerifier}
      setCodeVerifier={setCodeVerifier}
      redirectPathAfter='/projects/spotify/recommend'
      spotifyToken={spotifyTokenInfo.token}>
      <ProjectPage
        projectTitle='Spotify playlist generator'
        topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}>
        <Heading size='mdx' mb={1} variant='semiLight'>Songs, artists, and <ChakraRouterLink
          href='/projects/spotify/genres/list' target='_blank'>genres</ChakraRouterLink> (at least one is
          required)</Heading>
        <SpotifyArtistGenreTrackSearchAutocompleteComponent guardedSpotifyApi={guardedSpotifyApi}
                                                            selectedObjects={selectedObjects}
                                                            setSelectedObjects={setSelectedObjects} />
        <Text mt={1} mb={5} fontSize='md'><b>At least one</b> genre, track, or artist, and <b>not more than 5</b>, are
          required.</Text>

        <Heading size='mdx' mb={1} variant='semiLight'>Desired track attributes</Heading>
        <SpotifyTrackAttributeSelectorComponent selectedTrackAttributes={selectedTrackAttributes}
                                                setSelectedTrackAttributes={setSelectedTrackAttributes} />

        <SpotifyGenerateAndShowPlaylistRecommendationsComponent guardedSpotifyApi={guardedSpotifyApi}
                                                                selectedObjects={selectedObjects}
                                                                selectedTrackAttributes={selectedTrackAttributes} />
      </ProjectPage>
    </RequireSpotifyScopesOrElseShowLogin>}
  </SpotifyRouteComponent>;
}

export default SpotifyPlaylistGeneratorRoute;
