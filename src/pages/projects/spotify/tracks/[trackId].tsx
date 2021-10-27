import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import { reduceComponentsToString } from '../../../../components/utils/StringUtils';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getClientCredentialsSpotifyApiNode } from '../../../../spotify-utils/SpotifyNodeApiUtils';

type SpotifyTrackViewRouteParams = {
  trackId: string;
}

type SpotifyTrackViewRouteProps = {
  track: SpotifyApi.SingleTrackResponse;
}

function SpotifyTrackViewRoute({ track }: SpotifyTrackViewRouteProps) {
  const colorModeColor = useColorModeColor();

  return <>
    <Head>
      <title>Spotify track {track.name} by {track.artists.map(artist => artist.name).join(', ')}</title>
    </Head>
    <ProjectPage
      projectTitle={<>Track <b><ChakraRouterLink
        href={track.external_urls.spotify}
        color={colorModeColor}>{track.name}</ChakraRouterLink></b></>}
      marginBelowHeadingOverride={0}>
      <Text>By {reduceComponentsToString(track.artists.map(artist => <ChakraRouterLink
        href={`/projects/spotify/artists/${artist.id}`}
        key={artist.id}>{artist.name}</ChakraRouterLink>), ', ')}</Text>

      <Box mx='auto' textAlign='center' mt={3} alignContent='center'>
        <Image src={track.album.images[0].url} maxW='300px' mx='auto' mb={2} />
        <iframe src={`https://open.spotify.com/embed/track/${track.id}`} width='300' height='80'
                style={{ marginLeft: 'auto', marginRight: 'auto' }}
                title='Spotify player preview iframe' />
      </Box>
    </ProjectPage>
  </>;
}

export default SpotifyTrackViewRoute;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { trackId } = ctx.query as SpotifyTrackViewRouteParams;
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    return {
      props: {
        track: (await spotifyApi.getTrack(trackId)).body,
      },
    };
  } catch (e) {
    return {
      redirect: {
        permanent: false,
        destination: '/projects/spotify',
      },
    };
  }
};
