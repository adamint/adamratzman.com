import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useData } from '../../../../components/utils/useData';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import { reduceComponentsToString } from '../../../../components/utils/StringUtils';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-auth/SpotifyAuthUtils';
import Head from 'next/head';

type SpotifyArtistViewRouteParams = {
  artistId: string;
}

function SpotifyArtistViewRoute() {
  const router = useRouter();
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const { artistId } = router.query as SpotifyArtistViewRouteParams;

  const { data, loading, error } = useData(async () => {
    const spotifyApi = await guardedSpotifyApi.getApi();
    return {
      artist: await spotifyApi.getArtist(artistId),
      artistTopTracks: await spotifyApi.getArtistTopTracks(artistId, 'US'),
      artistAlbums: await spotifyApi.getArtistAlbums(artistId, { limit: 50 }),
      relatedArtists: (await spotifyApi.getArtistRelatedArtists(artistId)).artists,
    };
  }, [artistId]);

  const colorModeColor = useColorModeColor();

  useEffect(() => {
    if (error) router.push('/projects/spotify');
  }, [error]);

  if (error) {
    return null;
  }
  return <SpotifyRouteComponent>
    <Head>
      <title>{data ? `Spotify artist ${data.artist.name}` : 'Loading Spotify artist details...'}</title>
    </Head>
    <ProjectPage projectTitle={!data ? <>Loading artist details...</> : <>Artist <b><ChakraRouterLink
      href={data.artist.external_urls.spotify}
      color={colorModeColor}>{data.artist.name} <Image src={data.artist.images[0].url} display='inline' boxSize={50}
                                                       ml={2} /></ChakraRouterLink></b></>}
                 marginBelowHeadingOverride={0}
                 topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
                 isLoading={loading}>
      {data && <>
        <Box mb={3}>
          <Text><b>ID: </b> {data.artist.id}</Text>
          <Text><b>Popularity: </b> {data.artist.popularity}</Text>
          <Text><b>Followers: </b> {data.artist.followers.total.toLocaleString()}</Text>
          <Text><b>Total albums: </b> {data.artistAlbums.total}</Text>
        </Box>
        <Box mb={3}>
          <Text><b>Associated genres: </b> {reduceComponentsToString(data.artist.genres.map((genre: string) =>
            <ChakraRouterLink
              href={`/projects/spotify/categories/${genre}`} key={genre}>{genre}</ChakraRouterLink>), ', ')}</Text>
          <Text><b>Related
            artists: </b> {reduceComponentsToString(data.relatedArtists.slice(0, 10).map((relatedArtist: SpotifyApi.ArtistObjectFull) =>
            <ChakraRouterLink
              href={`/projects/spotify/artists/${relatedArtist.id}`}
              key={relatedArtist.id}>{relatedArtist.name}</ChakraRouterLink>), ', ')}</Text>
        </Box>
        <Box>
          <Text mb={2}><b>Top 5 tracks</b></Text>
          {data.artistTopTracks.tracks.slice(0, 5).map((track: SpotifyApi.TrackObjectFull) => <SpotifyTrack
            track={track}
            key={track.id}
            mb={3} />)}
        </Box>
      </>}
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyArtistViewRoute;