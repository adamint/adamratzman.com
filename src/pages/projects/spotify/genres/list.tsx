import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { ListItem, Text, UnorderedList, useToast } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useData } from '../../../../components/utils/useData';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-auth/SpotifyAuthUtils';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import Head from 'next/head';

function SpotifyGenreListRoute() {
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);

  const {
    data,
    loading,
    error,
  } = useData<string[]>(async () => (await (await guardedSpotifyApi.getApi()).getAvailableGenreSeeds()).genres);
  const toast = useToast();

  if (error) toast({
    status: 'error',
    title: 'Couldn\'t get genres!',
  });

  return <SpotifyRouteComponent>
    <Head>
      <title>Spotify Genres</title>
    </Head>
    <ProjectPage projectTitle='Spotify Genres'
                 topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
                 isLoading={loading}>
      {data && <>
        <Text mb={3}>Note: some genre links may not work. Spotify only maintains a subset of genre pages on its
          website.</Text>
        <UnorderedList>
          {data.map(genre => <ListItem key={genre} fontSize={17} mb={0.3}>
            <ChakraRouterLink href={`/projects/spotify/categories/${genre}`}>{genre}</ChakraRouterLink>
          </ListItem>)}
        </UnorderedList>
      </>}
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyGenreListRoute;