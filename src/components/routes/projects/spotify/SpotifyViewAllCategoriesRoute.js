import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { useData } from '../../../utils/useData';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { getAllPages } from '../../../utils/SpotifyApiPaginationHelper';
import { useHistory } from 'react-router-dom';
import { Box, Heading, Image, SimpleGrid } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';

export function SpotifyViewAllCategoriesRoute({ spotifyApi, setSpotifyTokenInfo }) {
  useDocumentTitle(`Spotify Categories`);
  const history = useHistory();
  const { data, loading, error } = useData(async () => {
    return (await getAllPages(spotifyApi, spotifyApi.getCategories({ limit: 50 }))).categories;
  });

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  return <ProjectPage
    projectTitle='Spotify Category List'
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
    isLoading={loading}>
    {data && <>
      <SimpleGrid columns={3} spacing={10}>
        {data.items.map(category => <Box key={category.id} boxShadow='0 5px 15px rgb(0 0 0 / 8%)' minW="25%" p={10}>
          <Heading size="mdx" mb={3}><ChakraRouterLink to={`/projects/spotify/categories/${category.id}`}>{category.name}</ChakraRouterLink></Heading>
          <ChakraRouterLink to={`/projects/spotify/categories/${category.id}`}>
            <Image src={category.icons[0].url} />
          </ChakraRouterLink>
        </Box>)}
      </SimpleGrid>
    </>}
  </ProjectPage>;
}

