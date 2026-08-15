import { ProjectPage } from '../../../components/projects/ProjectPage';
import { Box, Heading, Image, SimpleGrid, useBreakpointValue } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { PageTitle } from '../../../components/meta/PageTitle';

type SpotifyViewAllCategoriesRouteProps = {
  categories: SpotifyApi.CategoryObject[];
}

function SpotifyViewAllCategoriesRoute({ categories }: SpotifyViewAllCategoriesRouteProps) {
  const columnNumber = useBreakpointValue({base: 1, md: 3})
  return <>
    <PageTitle title="Spotify Categories" />
    <ProjectPage projectTitle='Spotify Category List'>
      <SimpleGrid columns={columnNumber} spacing={10}>
        {categories.map((category, idx) => <Box key={`${category.id}-${idx}`} boxShadow='0 5px 15px rgb(0 0 0 / 8%)'
                                                minW='25%' p={10}>
          <Heading size='mdx' mb={3}><ChakraRouterLink
            href={`/projects/spotify/categories/${category.id}`}>{category.name}</ChakraRouterLink></Heading>
          <ChakraRouterLink href={`/projects/spotify/categories/${category.id}`}>
            <Image src={category.icons[0].url} alt='Spotify category preview image' />
          </ChakraRouterLink>
        </Box>)}
      </SimpleGrid>
    </ProjectPage>
  </>;
}

export default SpotifyViewAllCategoriesRoute;
