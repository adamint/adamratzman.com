import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Heading, Image } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { SpotifyPlaylist } from './SpotifyPlaylist';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';

export function SpotifyCategoryViewRoute({ spotifyApi, setSpotifyTokenInfo }) {
  const { categoryId } = useParams();
  useDocumentTitle(`Spotify Category ${categoryId}`)
  const history = useHistory();
  const { data, loading, error } = useData(async () => {
    return {
      category: await spotifyApi.getCategory(categoryId),
      categoryPlaylists: (await spotifyApi.getCategoryPlaylists(categoryId)).playlists,
    };
  });

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  return <ProjectPage
    projectTitle={<><ChakraRouterLink
      to='/projects/spotify/categories'>Category</ChakraRouterLink> {data?.category ? <>{data.category.name} <Image
      display='inline' boxSize={50} src={data.category.icons[0].url} /></> : <>{categoryId}</>}</>}
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
    isLoading={loading}>
    {data && <>
      <Heading size='mdx' mb={2}>Top Playlists</Heading>
      {data.categoryPlaylists.items.map(playlist => <SpotifyPlaylist playlist={playlist} mb={3} />)}
    </>}
  </ProjectPage>;
}

