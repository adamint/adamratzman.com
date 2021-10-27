import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useData } from '../../../../components/utils/useData';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import { reduceComponentsToString } from '../../../../components/utils/StringUtils';
import { useRouter } from 'next/router';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-auth/SpotifyAuthUtils';
import { useEffect } from 'react';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import Head from 'next/head';

type SpotifyTrackViewRouteParams = {
  trackId: string;
}

function SpotifyTrackViewRoute() {
  const router = useRouter();
  const { trackId } = router.query as SpotifyTrackViewRouteParams;
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);

  const {
    data,
    loading,
    error,
  } = useData(async () => await (await guardedSpotifyApi.getApi()).getTrack(trackId), [trackId]);
  const colorModeColor = useColorModeColor();

  useEffect(() => {
    if (error) router.push('/projects/spotify');
  }, [error]);

  if (error) {
    return null;
  }

  return <SpotifyRouteComponent>
    <Head>
      <title>{data ? `Spotify track ${data.name} by ${data.artists.map(artist => artist.name).join(', ')}` : 'Loading Spotify track details...'}</title>
    </Head>
    <ProjectPage
      projectTitle={!data ? <>Loading track details...</> : <>Track <b><ChakraRouterLink
        href={data.external_urls.spotify}
        color={colorModeColor}>{data.name}</ChakraRouterLink></b></>}
      marginBelowHeadingOverride={0}
      topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
      isLoading={loading}>
      {data && <>
        <Text>By {reduceComponentsToString(data.artists.map(artist => <ChakraRouterLink
          href={`/projects/spotify/artists/${artist.id}`}
          key={artist.id}>{artist.name}</ChakraRouterLink>), ', ')}</Text>

        <Box mx='auto' textAlign='center' mt={3} alignContent='center'>
          <Image src={data.album.images[0].url} maxW='300px' mx='auto' mb={2} />
          <iframe src={`https://open.spotify.com/embed/track/${trackId}`} width='300' height='80'
                  style={{ marginLeft: 'auto', marginRight: 'auto' }}
                  title='Spotify player preview iframe' />
        </Box>
      </>}
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyTrackViewRoute;
