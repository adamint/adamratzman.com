import { SpotifyLogoutButton } from '../../../../spotify-utils/auth/SpotifyLogoutButton';
import React, { useMemo, useRef } from 'react';
import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { RequireSpotifyScopesOrElseShowLogin } from '../../../../spotify-utils/auth/RequireSpotifyScopesOrElseShowLogin';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import {
  buildSpotifyRedirectPath,
  useSpotifyWebApiGuardValidPkceToken,
} from '../../../../spotify-utils/auth/SpotifyAuthUtils';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Heading,
  Spinner,
  useDisclosure,
} from '@chakra-ui/react';
import { CreateSpotifyPlaylistModal } from '../../../../components/projects/spotify/playlist_generator/CreateSpotifyPlaylistModal';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useNoShowBeforeRender } from '../../../../components/utils/useNoShowBeforeRender';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLatestAsyncData } from '../../../../components/utils/useLatestAsyncData';
import { isSpotifyTrackId } from '../../../../api/spotifyBrowserValidation';

type RecommendedPlaylistData = {
  recommendedTracks: SpotifyApi.TrackObjectFull[];
  spotifyUserId: string;
};

export type RecommendedTrackIds =
  | { kind: 'valid'; trackIds: string[] }
  | { kind: 'invalid' };

export function parseRecommendedTrackIds(
  searchParams: URLSearchParams,
): RecommendedTrackIds {
  const trackIds: string[] = [];
  const seenTrackIds = new Set<string>();

  for (const parameter of searchParams.getAll('trackIds')) {
    for (const rawTrackId of parameter.split(',')) {
      const trackId = rawTrackId.trim();
      if (!trackId || seenTrackIds.has(trackId)) continue;
      if (!isSpotifyTrackId(trackId)) return { kind: 'invalid' };

      seenTrackIds.add(trackId);
      trackIds.push(trackId);
      if (trackIds.length > 50) return { kind: 'invalid' };
    }
  }

  return { kind: 'valid', trackIds };
}

function CreatePlaylistFromRecommendationsRoute() {
  const [searchParams] = useSearchParams();
  const recommendedTrackIds = useMemo(
    () => parseRecommendedTrackIds(searchParams),
    [searchParams],
  );

  return <>
    <PageTitle title="Create your Spotify Playlist" />
    {recommendedTrackIds.kind === 'invalid'
      ? <PlaylistRouteMessage>
        <Alert status='error'>
          <AlertIcon />
          <AlertTitle mr={2}>We were unable to load these recommendations.</AlertTitle>
          <AlertDescription>Please return to the recommendation page and try again.</AlertDescription>
        </Alert>
      </PlaylistRouteMessage>
      : recommendedTrackIds.trackIds.length === 0
        ? <PlaylistRouteMessage>
          <Alert status='info'>
            <AlertIcon />
            <AlertTitle mr={2}>There are no recommended tracks to add.</AlertTitle>
            <AlertDescription>
              Go back to the <ChakraRouterLink href='/projects/spotify/recommend'>recommendation page
                →</ChakraRouterLink>
            </AlertDescription>
          </Alert>
        </PlaylistRouteMessage>
        : <SpotifyRouteComponent title='Create a playlist from your recommended tracks'>
          <CreatePlaylistFromRecommendationsContent
            trackIds={recommendedTrackIds.trackIds}
          />
        </SpotifyRouteComponent>}
  </>;
}

function PlaylistRouteMessage({ children }: { children: React.ReactNode }) {
  return <ProjectPage
    projectTitle='Create your Spotify playlist'
    descriptionOverride={<>Go back to the <ChakraRouterLink href='/projects/spotify/recommend'>recommendation page
      →</ChakraRouterLink></>}
  >
    {children}
  </ProjectPage>;
}

function CreatePlaylistFromRecommendationsContent({
  trackIds,
}: {
  trackIds: string[];
}) {
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const guardedSpotifyApiRef = useRef(guardedSpotifyApi);
  guardedSpotifyApiRef.current = guardedSpotifyApi;
  const location = useLocation();
  const noShowBeforeRender = useNoShowBeforeRender();
  const createPlaylistDisclosure = useDisclosure({ defaultIsOpen: false });
  const producer = useMemo(() => {
    if (!spotifyTokenInfo) return null;

    return async (signal: AbortSignal): Promise<RecommendedPlaylistData> => {
      const spotifyApi = await guardedSpotifyApiRef.current.getApi();
      signal.throwIfAborted();
      const [tracksResponse, spotifyUser] = await Promise.all([
        spotifyApi.getTracks(trackIds),
        spotifyApi.getMe(),
      ]);
      signal.throwIfAborted();

      return {
        recommendedTracks: tracksResponse.tracks.filter(
          (track): track is SpotifyApi.TrackObjectFull => track !== null,
        ),
        spotifyUserId: spotifyUser.id,
      };
    };
  }, [spotifyTokenInfo, trackIds]);
  const { data, loading, error } = useLatestAsyncData(producer);

  return spotifyTokenInfo && <RequireSpotifyScopesOrElseShowLogin
        requiredScopes={['playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative']}
        clientId={spotifyClientId}
        redirectUri={spotifyRedirectUri()}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={buildSpotifyRedirectPath(location)}
        spotifyToken={spotifyTokenInfo.token}
        title='Create a playlist from your recommended tracks'>
        <ProjectPage
          projectTitle={<>Create your Spotify playlist{data
            ? <> - <b>{data.recommendedTracks.length}</b> tracks</>
            : null}</>}
          topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
          descriptionOverride={<>Go back to the <ChakraRouterLink href='/projects/spotify/recommend'>recommendation page
            →</ChakraRouterLink></>}>
          {error
            ? <Alert status='error'>
              <AlertIcon />
              <AlertTitle mr={2}>We were unable to load the recommended tracks.</AlertTitle>
              <AlertDescription>Please try again.</AlertDescription>
            </Alert>
            : (loading || !noShowBeforeRender || !data)
              ? <Box>Loading recommended tracks... <Spinner size='sm' /></Box>
              : data.recommendedTracks.length === 0
                ? <Alert status='error'>
                  <AlertIcon />
                  <AlertTitle mr={2}>We were unable to load any of the recommended tracks.</AlertTitle>
                  <AlertDescription>
                    Please return to the recommendation page and try again.
                  </AlertDescription>
                </Alert>
                : <>
              {data.recommendedTracks.length < trackIds.length && <Alert status='warning' mb={5}>
                <AlertIcon />
                <AlertTitle mr={2}>Some recommended tracks are unavailable.</AlertTitle>
                <AlertDescription>
                  Your playlist will include the tracks shown below.
                </AlertDescription>
              </Alert>}
              {!createPlaylistDisclosure.isOpen && <Box mb={10}>
                <Button colorScheme='green' onClick={createPlaylistDisclosure.onOpen}>Create playlist</Button>
              </Box>}

              <Box>
                <Heading size='lg' mb={2}>Tracks</Heading>
                {data.recommendedTracks.map(track => <SpotifyTrack track={track}
                                                                   openInNewTab mb={3}
                                                                   key={track.id} />)}
              </Box>

              <CreateSpotifyPlaylistModal guardedSpotifyApi={guardedSpotifyApi}
                                          createPlaylistDisclosure={createPlaylistDisclosure}
                                          spotifyUserId={data.spotifyUserId}
                                          recommendedTracks={data.recommendedTracks} />
            </>}
        </ProjectPage>
      </RequireSpotifyScopesOrElseShowLogin>;
}

export default CreatePlaylistFromRecommendationsRoute;