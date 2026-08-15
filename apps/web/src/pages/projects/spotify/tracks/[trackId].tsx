import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import { reduceComponentsToString } from '../../../../components/utils/StringUtils';
import Head from 'next/head';
import { useLoaderData } from 'react-router-dom';
import { loadSpotifyTrackRouteData } from '../../../../api/spotifyLoaders';

function SpotifyTrackViewRoute() {
  const loaderData = useLoaderData<typeof loadSpotifyTrackRouteData>();
  if (loaderData instanceof Response) {
    return null;
  }
  const { track } = loaderData;
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
        <Image src={track.album.images[0].url} maxW='300px' mx='auto' mb={2} alt='Spotify track preview image' />
        <iframe src={`https://open.spotify.com/embed/track/${track.id}`} width='300' height='80'
                style={{ marginLeft: 'auto', marginRight: 'auto' }}
                title='Spotify player preview iframe' />
      </Box>
    </ProjectPage>
  </>;
}

export default SpotifyTrackViewRoute;
