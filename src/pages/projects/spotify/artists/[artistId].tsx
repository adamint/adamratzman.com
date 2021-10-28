import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import { reduceComponentsToString } from '../../../../components/utils/StringUtils';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getClientCredentialsSpotifyApiNode } from '../../../../spotify-utils/SpotifyNodeApiUtils';

type SpotifyArtistViewRouteParams = {
  artistId: string;
}

type SpotifyArtistViewRouteProps = {
  artistTopTracks: SpotifyApi.ArtistsTopTracksResponse;
  artist: SpotifyApi.SingleArtistResponse;
  relatedArtists: SpotifyApi.ArtistObjectFull[];
  artistAlbums: SpotifyApi.ArtistsAlbumsResponse
}

function SpotifyArtistViewRoute({
                                  artist,
                                  artistTopTracks,
                                  artistAlbums,
                                  relatedArtists,
                                }: SpotifyArtistViewRouteProps) {
  const colorModeColor = useColorModeColor();

  return <>
    <Head>
      <title>Spotify artist {artist.name}</title>
    </Head>
    <ProjectPage projectTitle={<>Artist <b><ChakraRouterLink href={artist.external_urls.spotify}
                                                             color={colorModeColor}>{artist.name} <Image
      src={artist.images[0].url} display='inline' boxSize={50} alt='Spotify artist preview image'
      ml={2} /></ChakraRouterLink></b></>}
                 marginBelowHeadingOverride={0}>
      <Box mb={3}>
        <Text><b>ID: </b> {artist.id}</Text>
        <Text><b>Popularity: </b> {artist.popularity}</Text>
        <Text><b>Followers: </b> {artist.followers.total.toLocaleString()}</Text>
        <Text><b>Total albums: </b> {artistAlbums.total}</Text>
      </Box>
      <Box mb={3}>
        <Text><b>Associated genres: </b> {reduceComponentsToString(artist.genres.map((genre: string) =>
          <ChakraRouterLink
            href={`/projects/spotify/categories/${genre}`} key={genre}>{genre}</ChakraRouterLink>), ', ')}</Text>
        <Text><b>Related
          artists: </b> {reduceComponentsToString(relatedArtists.slice(0, 10).map((relatedArtist: SpotifyApi.ArtistObjectFull) =>
          <ChakraRouterLink
            href={`/projects/spotify/artists/${relatedArtist.id}`}
            key={relatedArtist.id}>{relatedArtist.name}</ChakraRouterLink>), ', ')}</Text>
      </Box>
      <Box>
        <Text mb={2}><b>Top 5 tracks</b></Text>
        {artistTopTracks.tracks.slice(0, 5).map((track: SpotifyApi.TrackObjectFull) => <SpotifyTrack
          track={track}
          key={track.id}
          mb={3} />)}
      </Box>
    </ProjectPage>
  </>;
}

export default SpotifyArtistViewRoute;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { artistId } = ctx.query as SpotifyArtistViewRouteParams;
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    return {
      props: {
        artist: (await spotifyApi.getArtist(artistId)).body,
        artistTopTracks: (await spotifyApi.getArtistTopTracks(artistId, 'US')).body,
        artistAlbums: (await spotifyApi.getArtistAlbums(artistId, { limit: 50 })).body,
        relatedArtists: (await spotifyApi.getArtistRelatedArtists(artistId)).body.artists,
      },
    };
  } catch (e) {
    return {
      redirect: {
        permanent: false,
        destination: '/projects/spotify',
      },
    };
  }
};
