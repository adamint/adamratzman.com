import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Heading, Image } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useData } from '../../../../components/utils/useData';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import { useRouter } from 'next/router';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-auth/SpotifyAuthUtils';
import { useEffect } from 'react';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import Head from "next/head"

type SpotifyCategoryViewRouteParams = {
  categoryId: string;
}

function SpotifyCategoryViewRoute() {
  const router = useRouter();
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const { categoryId } = router.query as SpotifyCategoryViewRouteParams;
  const { data, loading, error } = useData(async () => {
    return {
      category: await (await guardedSpotifyApi.getApi()).getCategory(categoryId),
      categoryPlaylists: (await (await guardedSpotifyApi.getApi()).getCategoryPlaylists(categoryId)).playlists,
    };
  }, [categoryId]);

  useEffect(() => {
    if (error) router.replace('/projects/spotify');
  }, [error]);

  if (error) {
    return null;
  }

  return <SpotifyRouteComponent>
    <Head>
      <title>Spotify Category {categoryId}</title>
    </Head>
    <ProjectPage
      projectTitle={<><ChakraRouterLink
        href='/projects/spotify/categories'>Category</ChakraRouterLink> {data?.category ? <>{data.category.name} <Image
        display='inline' boxSize={50} src={data.category.icons[0].url} /></> : <>{categoryId}</>}</>}
      topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
      isLoading={loading}>
      {data && <>
        <Heading size='mdx' mb={2}>Top Playlists</Heading>
        {data.categoryPlaylists.items.map(playlist => <SpotifyPlaylist playlist={playlist} mb={3} key={playlist.id} />)}
      </>}
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyCategoryViewRoute