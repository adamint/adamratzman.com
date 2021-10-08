import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { ListItem, Text, UnorderedList, useToast } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';

export function SpotifyGenreListRoute({ spotifyApi, setSpotifyTokenInfo }) {
  const { data, loading, error } = useData(async () => (await spotifyApi.getAvailableGenreSeeds()).genres);
  const toast = useToast();

  if (error) toast({
    status: 'error',
    title: 'Couldn\'t get genres!',
  });

  return <ProjectPage projectTitle='Spotify Genres'
                      topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
                      isLoading={loading}>
    {data && <>
      <Text mb={3}>Note: some genre links may not work. Spotify only maintains a subset of genre pages on its
        website.</Text>
      <UnorderedList>
        {data.map(genre => <ListItem key={genre} fontSize={17} mb={0.3}>
          <ChakraRouterLink to={`/projects/spotify/category/${genre}`}>{genre}</ChakraRouterLink>
        </ListItem>)}
      </UnorderedList>
    </>}
  </ProjectPage>;
}