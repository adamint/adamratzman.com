import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Heading, Image } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useLoaderData } from 'react-router-dom';
import { categoryLoader } from '../../../../api/spotifyLoaders';

function SpotifyCategoryViewRoute() {
  const { category, categoryPlaylists } = useLoaderData<typeof categoryLoader>();
  return <>
    <PageTitle title={`Spotify Category ${category.name}`} />
    <ProjectPage
      projectTitle={<><ChakraRouterLink
        href='/projects/spotify/categories'>Category</ChakraRouterLink> {category.name} <Image
        display='inline' boxSize={50} src={category.icons[0].url} alt="Spotify category preview image" /></>}>
      <Heading size='mdx' mb={2}>Top Playlists</Heading>
      {categoryPlaylists.items.map(playlist => <SpotifyPlaylist playlist={playlist} mb={3} key={playlist.id} />)}
    </ProjectPage>
  </>;
}

export default SpotifyCategoryViewRoute;
