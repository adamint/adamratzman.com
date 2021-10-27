import { ProjectPage } from '../../../components/projects/ProjectPage';
import { getAllPagesNode } from '../../../components/utils/SpotifyApiPaginationHelper';
import { Box, Heading, Image, SimpleGrid } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { useSpotifyStore } from '../../../components/utils/useSpotifyStore';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import SpotifyWebApiNode from 'spotify-web-api-node';
import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

type SpotifyViewAllCategoriesRouteProps = {
  categories: SpotifyApi.CategoryObject[];
}

function SpotifyViewAllCategoriesRoute({ categories }: SpotifyViewAllCategoriesRouteProps) {
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  /*const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
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
  }*/

  return <>
    <Head>
      <title>Spotify Categories</title>
    </Head>
    <ProjectPage projectTitle='Spotify Category List'>
      <SimpleGrid columns={3} spacing={10}>
        {categories.map((category, idx) => <Box key={`${category.id}-${idx}`} boxShadow='0 5px 15px rgb(0 0 0 / 8%)'
                                                minW='25%' p={10}>
          <Heading size='mdx' mb={3}><ChakraRouterLink
            href={`/projects/spotify/categories/${category.id}`}>{category.name}</ChakraRouterLink></Heading>
          <ChakraRouterLink href={`/projects/spotify/categories/${category.id}`}>
            <Image src={category.icons[0].url} />
          </ChakraRouterLink>
        </Box>)}
      </SimpleGrid>
    </ProjectPage>
  </>;
}

export default SpotifyViewAllCategoriesRoute;

export const getServerSideProps: GetServerSideProps = async () => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  const allCategoriesPagingObject = await getAllPagesNode(spotifyApi, async (limit, offset) => {
    return (await spotifyApi.getCategories({
      limit: limit,
      offset: offset,
    })).body.categories;
  });
  const allCategories: SpotifyApi.CategoryObject[] = allCategoriesPagingObject.items;
  return {
    props: {
      categories: allCategories,
    },
  };
};
