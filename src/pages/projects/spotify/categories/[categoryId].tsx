import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Heading, Image } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getClientCredentialsSpotifyApiNode } from '../../../../spotify-utils/SpotifyNodeApiUtils';

type SpotifyCategoryViewRouteParams = {
  categoryId: string;
}

type SpotifyCategoryViewRouteProps = {
  category: SpotifyApi.SingleCategoryResponse;
  categoryPlaylists: SpotifyApi.PagingObject<SpotifyApi.PlaylistObjectSimplified>
}

function SpotifyCategoryViewRoute({ category, categoryPlaylists }: SpotifyCategoryViewRouteProps) {
  return <>
    <Head>
      <title>Spotify Category {category.name}</title>
    </Head>
    <ProjectPage
      projectTitle={<><ChakraRouterLink
        href='/projects/spotify/categories'>Category</ChakraRouterLink> {category.name} <Image
        display='inline' boxSize={50} src={category.icons[0].url} /></>}>
      <Heading size='mdx' mb={2}>Top Playlists</Heading>
      {categoryPlaylists.items.map(playlist => <SpotifyPlaylist playlist={playlist} mb={3} key={playlist.id} />)}
    </ProjectPage>
  </>;
}

export default SpotifyCategoryViewRoute;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { categoryId } = ctx.query as SpotifyCategoryViewRouteParams;
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    return {
      props: {
        category: (await spotifyApi.getCategory(categoryId)).body,
        categoryPlaylists: (await spotifyApi.getPlaylistsForCategory(categoryId)).body.playlists,
      },
    };
  } catch (e) {
    return {
      redirect: {
        permanent: false,
        destination: '/projects/spotify/categories',
      },
    };
  }
};
