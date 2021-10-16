import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { useColorModeColor } from '../../../utils/useColorModeColor';
import { reduceComponentsToString } from '../../../utils/StringUtils';
import { SpotifyRouteProps } from './SpotifyRoute';

type SpotifyTrackViewRouteParams = {
  trackId: string;
}

export function SpotifyTrackViewRoute({guardedSpotifyApi, setSpotifyTokenInfo }: SpotifyRouteProps) {
  const { trackId } = useParams<SpotifyTrackViewRouteParams>();
  const history = useHistory();
  const { data, loading, error } = useData(async () => await (await guardedSpotifyApi.getApi()).getTrack(trackId), [trackId]);
  const colorModeColor = useColorModeColor();

  useDocumentTitle(data ? `Spotify track ${data.name} by ${data.artists.map(artist => artist.name).join(', ')}` : 'Loading Spotify track details...');

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  return <ProjectPage
    projectTitle={!data ? <>Loading track details...</> : <>Track <b><ChakraRouterLink to={data.external_urls.spotify}
                                                                                       color={colorModeColor}>{data.name}</ChakraRouterLink></b></>}
    marginBelowHeadingOverride={0}
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
    isLoading={loading}>
    {data && <>
      <Text>By {reduceComponentsToString(data.artists.map(artist => <ChakraRouterLink
        to={`/projects/spotify/artists/${artist.id}`} key={artist.id}>{artist.name}</ChakraRouterLink>), ', ')}</Text>

      <Box mx='auto' textAlign='center' mt={3} alignContent='center'>
        <Image src={data.album.images[0].url} maxW='300px' mx='auto' mb={2} />
        <iframe src={`https://open.spotify.com/embed/track/${trackId}`} width='300' height='80'
                style={{ marginLeft: 'auto', marginRight: 'auto' }}
                title='Spotify player preview iframe' />
      </Box>
    </>}
  </ProjectPage>;
}

