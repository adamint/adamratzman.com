import { ProjectPage } from '../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../spotify-auth/SpotifyLogoutButton';
import { useData } from '../../../components/utils/useData';
import { getAllPages } from '../../../components/utils/SpotifyApiPaginationHelper';
import { Box, Heading, Image, SimpleGrid } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { useSpotifyStore } from '../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../spotify-auth/SpotifyAuthUtils';
import { useRouter } from 'next/router';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';
import { useEffect } from 'react';
import Head from 'next/head';

function SpotifyViewAllCategoriesRoute() {
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const router = useRouter();
  const { data, loading, error } = useData(async () => {
    const spotifyApi = await guardedSpotifyApi.getApi();
    return await getAllPages<SpotifyApi.PagingObject<SpotifyApi.CategoryObject>, SpotifyApi.CategoryObject>(spotifyApi, spotifyApi.getCategories({ limit: 50 }), null, response => response.categories);
  });

  useEffect(() => {
    if (error) router.push('/projects/spotify');
  }, [error]);

  if (error) {
    return null;
  }

  return <SpotifyRouteComponent>
    <Head>
      <title>Spotify Categories</title>
    </Head>
    <ProjectPage
      projectTitle='Spotify Category List'
      topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
      isLoading={loading}>
      {data && <>
        <SimpleGrid columns={3} spacing={10}>
          {data.items.map((category, idx) => <Box key={`${category.id}-${idx}`} boxShadow='0 5px 15px rgb(0 0 0 / 8%)'
                                                  minW='25%' p={10}>
            <Heading size='mdx' mb={3}><ChakraRouterLink
              href={`/projects/spotify/categories/${category.id}`}>{category.name}</ChakraRouterLink></Heading>
            <ChakraRouterLink href={`/projects/spotify/categories/${category.id}`}>
              <Image src={category.icons[0].url} />
            </ChakraRouterLink>
          </Box>)}
        </SimpleGrid>
      </>}
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyViewAllCategoriesRoute;
