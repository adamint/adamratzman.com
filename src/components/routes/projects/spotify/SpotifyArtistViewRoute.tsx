import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { useColorModeColor } from '../../../utils/useColorModeColor';
import { reduceComponentsToString } from '../../../utils/StringUtils';
import { SpotifyTrack } from './views/SpotifyTrack';
import { SpotifyRouteProps } from './SpotifyRoute';

type SpotifyArtistViewRouteParams = {
  artistId: string;
}

export function SpotifyArtistViewRoute({ guardedSpotifyApi, setSpotifyTokenInfo }: SpotifyRouteProps) {
  const { artistId } = useParams<SpotifyArtistViewRouteParams>();
  const history = useHistory();
  const { data, loading, error } = useData(async () => {
    const spotifyApi = await guardedSpotifyApi.getApi();
    return {
      artist: await spotifyApi.getArtist(artistId),
      artistTopTracks: await spotifyApi.getArtistTopTracks(artistId, 'US'),
      artistAlbums: await spotifyApi.getArtistAlbums(artistId, { limit: 50 }),
      relatedArtists: (await spotifyApi.getArtistRelatedArtists(artistId)).artists,
    };
  }, [artistId]);

  useDocumentTitle(data ? `Spotify artist ${data.artist.name}` : 'Loading Spotify artist details...');
  const colorModeColor = useColorModeColor();

  if (error) {
    history.push('/projects/spotify');
    return null;
  }
  return <ProjectPage projectTitle={!data ? <>Loading artist details...</> : <>Artist <b><ChakraRouterLink
    to={data.artist.external_urls.spotify}
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
            to={`/projects/spotify/categories/${genre}`} key={genre}>{genre}</ChakraRouterLink>), ', ')}</Text>
        <Text><b>Related
          artists: </b> {reduceComponentsToString(data.relatedArtists.slice(0, 10).map((relatedArtist: SpotifyApi.ArtistObjectFull) =>
          <ChakraRouterLink
            to={`/projects/spotify/artists/${relatedArtist.id}`}
            key={relatedArtist.id}>{relatedArtist.name}</ChakraRouterLink>), ', ')}</Text>
      </Box>
      <Box>
        <Text mb={2}><b>Top 5 tracks</b></Text>
        {data.artistTopTracks.tracks.slice(0, 5).map((track: SpotifyApi.TrackObjectFull) => <SpotifyTrack track={track}
                                                                                                          key={track.id}
                                                                                                          mb={3} />)}
      </Box>
    </>}
  </ProjectPage>;
}

