import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Heading, Image } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { SpotifyPlaylist } from './views/SpotifyPlaylist';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { SpotifyRouteProps } from './SpotifyRoute';

type SpotifyCategoryViewRouteParams = {
  categoryId: string;
}

export function SpotifyCategoryViewRoute({guardedSpotifyApi, setSpotifyTokenInfo }: SpotifyRouteProps) {
  const { categoryId } = useParams<SpotifyCategoryViewRouteParams>();
  useDocumentTitle(`Spotify Category ${categoryId}`);
  const history = useHistory();
  const { data, loading, error } = useData(async () => {
    return {
      category: await (await guardedSpotifyApi.getApi()).getCategory(categoryId),
      categoryPlaylists: (await (await guardedSpotifyApi.getApi()).getCategoryPlaylists(categoryId)).playlists,
    };
  }, [categoryId]);

  if (error) {
    history.replace('/projects/spotify');
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
      {data.categoryPlaylists.items.map(playlist => <SpotifyPlaylist playlist={playlist} mb={3} key={playlist.id} />)}
    </>}
  </ProjectPage>;
}

