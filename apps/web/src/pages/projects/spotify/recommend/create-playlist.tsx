import { useRouter } from 'next/router';
import Head from 'next/head';
import { SpotifyLogoutButton } from '../../../../spotify-utils/auth/SpotifyLogoutButton';
import React, { useEffect } from 'react';
import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { RequireSpotifyScopesOrElseShowLogin } from '../../../../spotify-utils/auth/RequireSpotifyScopesOrElseShowLogin';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-utils/auth/SpotifyAuthUtils';
import { useData } from '../../../../components/utils/useData';
import { Box, Button, Heading, Spinner, useDisclosure } from '@chakra-ui/react';
import { CreateSpotifyPlaylistModal } from '../../../../components/projects/spotify/playlist_generator/CreateSpotifyPlaylistModal';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useNoShowBeforeRender } from '../../../../components/utils/useNoShowBeforeRender';

type CreatePlaylistFromRecommendationsRouteParams = {
  trackIds: string[]
}

function CreatePlaylistFromRecommendationsRoute() {
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const router = useRouter();
  const query = router.query as CreatePlaylistFromRecommendationsRouteParams;
  const trackIds: any = query.trackIds ?? [];
  const noShowBeforeRender = useNoShowBeforeRender();
  const createPlaylistDisclosure = useDisclosure({ defaultIsOpen: false });

  const { data, loading, error } = useData(async (trackIdsToSearch: string[] | string) => {
    const ids = typeof trackIdsToSearch === 'string' ? trackIdsToSearch.split(',') : trackIdsToSearch;
    if (!spotifyTokenInfo) return null;
    const spotifyApi = await guardedSpotifyApi.getApi();

    if (!trackIdsToSearch || trackIdsToSearch.length === 0) {
      return {
        recommendedTracks: [],
        spotifyUserId: null,
      };
    } else return {
      recommendedTracks: (await spotifyApi.getTracks(ids)).tracks,
      spotifyUserId: (await spotifyApi.getMe()).id,
    };
  }, [trackIds, spotifyTokenInfo], [trackIds]);

  useEffect(() => {
    if (error) {
      console.log(error);
      router.push('/projects/spotify');
    }

    // eslint-disable-next-line
  }, [error]);

  if (error) return null;

  // @ts-ignore
  return <>
    <Head>
      <title>Create your Spotify Playlist</title>
    </Head>
    <SpotifyRouteComponent title='Create a playlist from your recommended tracks'>
      {spotifyTokenInfo && <RequireSpotifyScopesOrElseShowLogin
        requiredScopes={['playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative']}
        clientId={spotifyClientId}
        redirectUri={spotifyRedirectUri()}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={router.asPath}
        spotifyToken={spotifyTokenInfo.token}
        title='Create a playlist from your recommended tracks'>
        <ProjectPage
          projectTitle={<>Create your Spotify playlist
            - <b>{(typeof trackIds === 'string' ? trackIds.split(',') : trackIds).length}</b> tracks</>}
          topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
          descriptionOverride={<>Go back to the <ChakraRouterLink href='/projects/spotify/recommend'>recommendation page
            →</ChakraRouterLink></>}>
          {(loading || !noShowBeforeRender || !data) ? <Box>Loading recommended tracks... <Spinner size='sm' /></Box>
            : <>
              {!createPlaylistDisclosure.isOpen && <Box mb={10}>
                <Button colorScheme='green' onClick={createPlaylistDisclosure.onOpen}>Create playlist</Button>
              </Box>}

              <Box>
                <Heading size='lg' mb={2}>Tracks</Heading>
                {data.recommendedTracks.map(track => <SpotifyTrack track={track as SpotifyApi.TrackObjectFull}
                                                                   openInNewTab mb={3}
                                                                   key={track.id} />)}
              </Box>

              {data.spotifyUserId && <CreateSpotifyPlaylistModal guardedSpotifyApi={guardedSpotifyApi}
                                                                 createPlaylistDisclosure={createPlaylistDisclosure}
                                                                 spotifyUserId={data.spotifyUserId}
                                                                 recommendedTracks={data.recommendedTracks} />}
            </>}
        </ProjectPage>
      </RequireSpotifyScopesOrElseShowLogin>}
    </SpotifyRouteComponent>
  </>;
}

export default CreatePlaylistFromRecommendationsRoute;