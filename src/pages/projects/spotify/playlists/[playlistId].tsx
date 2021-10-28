import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { SpotifyEpisode } from '../../../../components/projects/spotify/views/SpotifyEpisode';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getClientCredentialsSpotifyApiNode } from '../../../../spotify-utils/SpotifyNodeApiUtils';
import axios, { AxiosResponse } from 'axios';
import { GetPlaylistTracksRequestBody } from '../../../api/spotify/getPlaylistTracks';

type SpotifyPlaylistViewRouteProps = {
  playlist: SpotifyApi.PlaylistObjectFull
}

type SpotifyPlaylistViewRouteParams = {
  playlistId: string;
}

function SpotifyPlaylistViewRoute({ playlist }: SpotifyPlaylistViewRouteProps) {
  const router = useRouter();
  const { playlistId } = router.query as SpotifyPlaylistViewRouteParams;
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const colorModeColor = useColorModeColor();

  async function getPlaylistTracks(limitPerPage: number, pageOffset: number): Promise<SpotifyApi.PlaylistTrackResponse> {
    return (await axios.post<GetPlaylistTracksRequestBody, AxiosResponse<SpotifyApi.PlaylistTrackResponse>>(
        '/api/spotify/getPlaylistTracks',
        { limit: limitPerPage, offset: pageOffset, playlistId: playlistId })
    ).data;
  }

  function childDataMapper(playlistTrack: SpotifyApi.PlaylistTrackObject) {
    const trackObject = playlistTrack.track;

    function isEpisode(obj: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObjectFull): obj is SpotifyApi.EpisodeObjectFull {
      return (obj as SpotifyApi.EpisodeObjectFull)?.show !== undefined;
    }

    if (isEpisode(trackObject)) return <SpotifyEpisode episode={trackObject} key={trackObject.id} mb={5} />;
    else return <SpotifyTrack track={trackObject} key={trackObject.id} mb={5} />;
  }

  return <>
    <Head>
      <title>Spotify playlist {playlist.name}</title>
    </Head>
    <ProjectPage projectTitle={<>Playlist <b><ChakraRouterLink href={playlist.external_urls.spotify}
                                                               color={colorModeColor}>{playlist.name} <Image
      src={playlist.images.at(0)?.url} display='inline' boxSize={50} alt="First playlist album image"
      ml={2} /></ChakraRouterLink></b></>}
                 marginBelowHeadingOverride={0}>
      <Box mb={6}>
        <Text><b>By: </b> <ChakraRouterLink
          href={`/projects/spotify/users/${playlist.owner.id}`}>{playlist.owner.display_name || playlist.owner.id} {playlist.owner.followers?.total &&
        <>(<b>{playlist.owner.followers?.total}</b> followers)</>}</ChakraRouterLink></Text>
        {playlist.description && <Text><b>Description: </b> {playlist.description}</Text>}
        <Text><b>Followers: </b> {playlist.followers.total.toLocaleString()}</Text>
        <Text><b>Public: </b> {playlist.public ? 'yes' : 'no'}</Text>
        <Text><b>Collaborative: </b> {playlist.collaborative ? 'yes' : 'no'}</Text>
        <Text><b>ID: </b> {playlist.id}</Text>
      </Box>

      <Box>
        <Heading mb={2} size='md' variant='semiLight'><b>Playlist Tracks</b> ({playlist.tracks.total})</Heading>
        <PaginatedSpotifyDisplay dataProducer={getPlaylistTracks}
                                 childDataMapper={childDataMapper}
                                 filterNotNull={child => !!child.track}
                                 limitPerPage={limitPerPage}
                                 setLimitPerPage={setLimitPerPage}
                                 pageOffset={pageOffset}
                                 setPageOffset={setPageOffset} />
      </Box>
    </ProjectPage>
  </>;
}

export default SpotifyPlaylistViewRoute;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { playlistId } = ctx.query as SpotifyPlaylistViewRouteParams;
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    return {
      props: {
        playlist: (await spotifyApi.getPlaylist(playlistId)).body,
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
