import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useLoaderData } from 'react-router-dom';
import { genresLoader } from '../../../../api/spotifyLoaders';

function SpotifyGenreListRoute() {
  const { genres } = useLoaderData<typeof genresLoader>();
  return <>
    <PageTitle title="Spotify Genres" />
    <ProjectPage projectTitle='Spotify Genres'>
      <Text mb={3}>Note: some genre links may not work. Spotify only maintains a subset of genre pages on its
        website.</Text>
      <UnorderedList>
        {genres.map(genre => <ListItem key={genre} fontSize={17} mb={0.3}>
          <ChakraRouterLink
            href={`/projects/spotify/categories/${encodeURIComponent(genre)}`}>{genre}</ChakraRouterLink>
        </ListItem>)}
      </UnorderedList>
    </ProjectPage>
  </>;
}

export default SpotifyGenreListRoute;
