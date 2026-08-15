import { SpotifyLogoutButton } from '../../../../spotify-utils/auth/SpotifyLogoutButton';
import React, { useEffect, useMemo } from 'react';
import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { RequireSpotifyScopesOrElseShowLogin } from '../../../../spotify-utils/auth/RequireSpotifyScopesOrElseShowLogin';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import {
  buildSpotifyRedirectPath,
  useSpotifyWebApiGuardValidPkceToken,
} from '../../../../spotify-utils/auth/SpotifyAuthUtils';
import { useData } from '../../../../components/utils/useData';
import { Box, Button, Heading, Spinner, useDisclosure } from '@chakra-ui/react';
import { CreateSpotifyPlaylistModal } from '../../../../components/projects/spotify/playlist_generator/CreateSpotifyPlaylistModal';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useNoShowBeforeRender } from '../../../../components/utils/useNoShowBeforeRender';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

type RecommendedPlaylistData = {
  recommendedTracks: SpotifyApi.TrackObjectFull[];
  spotifyUserId: string | null;
} | null;

function CreatePlaylistFromRecommendationsRoute() {
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackIds = useMemo(
    () => searchParams.getAll('trackIds').flatMap(value => value.split(',')).filter(Boolean),
    [searchParams],
  );
  const noShowBeforeRender = useNoShowBeforeRender();
  const createPlaylistDisclosure = useDisclosure({ defaultIsOpen: false });

  const { data, loading, error } = useData<RecommendedPlaylistData, unknown>(async (trackIdsToSearch: string[]) => {
    if (!spotifyTokenInfo) return null;
    const spotifyApi = await guardedSpotifyApi.getApi();

    if (trackIdsToSearch.length === 0) {
      return {
        recommendedTracks: [],
        spotifyUserId: null,
      };
    } else return {
      recommendedTracks: (await spotifyApi.getTracks(trackIdsToSearch)).tracks,
      spotifyUserId: (await spotifyApi.getMe()).id,
    };
  }, [trackIds, spotifyTokenInfo], [trackIds]);

  useEffect(() => {
    if (error) {
      console.log(error);
      void navigate('/projects/spotify');
    }
  }, [error, navigate]);

  if (error) return null;

  return <>
    <PageTitle title="Create your Spotify Playlist" />
    <SpotifyRouteComponent title='Create a playlist from your recommended tracks'>
      {spotifyTokenInfo && <RequireSpotifyScopesOrElseShowLogin
        requiredScopes={['playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative']}
        clientId={spotifyClientId}
        redirectUri={spotifyRedirectUri()}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={buildSpotifyRedirectPath(location)}
        spotifyToken={spotifyTokenInfo.token}
        title='Create a playlist from your recommended tracks'>
        <ProjectPage
          projectTitle={<>Create your Spotify playlist
            - <b>{trackIds.length}</b> tracks</>}
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
                {data.recommendedTracks.map(track => <SpotifyTrack track={track}
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