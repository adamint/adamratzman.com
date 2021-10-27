import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getClientCredentialsSpotifyApiNode } from '../../../../spotify-utils/SpotifyNodeApiUtils';

type SpotifyGenreListRouteProps = {
  genres: string[]
}

function SpotifyGenreListRoute({ genres }: SpotifyGenreListRouteProps) {
  return <>
    <Head>
      <title>Spotify Genres</title>
    </Head>
    <ProjectPage projectTitle='Spotify Genres'>
      <Text mb={3}>Note: some genre links may not work. Spotify only maintains a subset of genre pages on its
        website.</Text>
      <UnorderedList>
        {genres.map(genre => <ListItem key={genre} fontSize={17} mb={0.3}>
          <ChakraRouterLink href={`/projects/spotify/categories/${genre}`}>{genre}</ChakraRouterLink>
        </ListItem>)}
      </UnorderedList>
    </ProjectPage>
  </>;
}

export default SpotifyGenreListRoute;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  return {
    props: {
      genres: (await spotifyApi.getAvailableGenreSeeds()).body.genres,
    },
  };
};
