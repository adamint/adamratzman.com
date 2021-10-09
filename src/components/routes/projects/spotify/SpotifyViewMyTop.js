import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Heading, Image } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { SpotifyPlaylist } from './SpotifyPlaylist';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';

export function SpotifyViewMyTop({ spotifyApi, setSpotifyTokenInfo }) {
  useDocumentTitle(`Your top Spotify tracks and artists`)
  const history = useHistory();
  const { data, loading, error } = useData(async () => {
    return {
       };
  });

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  console.log(data);

  return <ProjectPage
    projectTitle="Your top tracks and artists"
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
    isLoading={loading}>
    {data && <>
      <Heading size='mdx' mb={2}>Top Playlists</Heading>

    </>}
  </ProjectPage>;
}

