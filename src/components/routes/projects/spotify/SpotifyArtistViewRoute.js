import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { useColorModeColor } from '../../../utils/useColorModeColor';
import { getAllPages } from '../../../utils/SpotifyApiPaginationHelper';
import { reduceComponentsToString } from '../../../utils/StringUtils';
import { SpotifyTrack } from './SpotifyTrack';

export function SpotifyArtistViewRoute({ spotifyApi, setSpotifyTokenInfo }) {
  const { artistId } = useParams();
  const history = useHistory();
  const { data, loading, error } = useData(async () => {
    return {
      artist: await spotifyApi.getArtist(artistId),
      artistTopTracks: await spotifyApi.getArtistTopTracks(artistId, 'US'),
      artistAlbums: await getAllPages(spotifyApi, spotifyApi.getArtistAlbums(artistId)),
      relatedArtists: (await spotifyApi.getArtistRelatedArtists(artistId)).artists,
    };
  }, [artistId]);

  useDocumentTitle(data ? `Spotify artist ${data.artist.name}` : 'Loading Spotify artist details...');
  const colorModeColor = useColorModeColor();

  console.log(data);
  const { artist, artistTopTracks, artistAlbums, relatedArtists } = data || {};

  if (error) {
    history.push('/projects/spotify');
    return null;
  }

  return <ProjectPage
    projectTitle={!data ? <>Loading artist details...</> : <>Artist <b><ChakraRouterLink
      to={artist.external_urls.spotify}
      color={colorModeColor}>{artist.name} <Image src={artist.images[0].url} display='inline' boxSize={50}
                                                  ml={2} /></ChakraRouterLink></b></>}
    marginBelowHeadingOverride={0}
    topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
    isLoading={loading}>
    {data && <>
      <Box mb={3}>
        <Text><b>ID: </b> {artist.id}</Text>
        <Text><b>Popularity: </b> {artist.popularity}</Text>
        <Text><b>Followers: </b> {artist.followers.total.toLocaleString()}</Text>
        <Text><b>Total albums: </b> {artistAlbums.total}</Text>
      </Box>
      <Box mb={3}>
        <Text><b>Associated genres: </b> {reduceComponentsToString(artist.genres.map(genre => <ChakraRouterLink
          to={`/projects/spotify/categories/${genre}`} key={genre}>{genre}</ChakraRouterLink>), ', ')}</Text>
        <Text><b>Related artists: </b> {reduceComponentsToString(relatedArtists.slice(0, 10).map(relatedArtist =>
          <ChakraRouterLink
            to={`/projects/spotify/artists/${relatedArtist.id}`}
            key={relatedArtist.id}>{relatedArtist.name}</ChakraRouterLink>), ', ')}</Text>
      </Box>
      <Box>
        <Text mb={2}><b>Top 5 tracks</b></Text>
        {artistTopTracks.tracks.slice(0, 5).map(track => <SpotifyTrack track={track} key={track.id} mb={3} />)}
      </Box>
    </>}
  </ProjectPage>;
}

