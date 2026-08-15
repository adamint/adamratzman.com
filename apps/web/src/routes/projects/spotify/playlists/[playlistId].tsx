import { ProjectPage } from '../../../../components/projects/ProjectPage';
import type { GetPlaylistTracksRequest } from '@adamratzman/contracts';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useCallback, useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { SpotifyEpisode } from '../../../../components/projects/spotify/views/SpotifyEpisode';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useLoaderData } from 'react-router-dom';
import axios, { AxiosResponse } from 'axios';
import { playlistLoader } from '../../../../api/spotifyLoaders';

type SpotifyPlaylistContentProps = ReturnType<typeof useLoaderData<typeof playlistLoader>>;

function SpotifyPlaylistViewRoute() {
  const { playlist, playlistId } = useLoaderData<typeof playlistLoader>();

  return <SpotifyPlaylistContent key={playlistId} playlist={playlist} playlistId={playlistId} />;
}

function SpotifyPlaylistContent({ playlist, playlistId }: SpotifyPlaylistContentProps) {
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const imageUrl = playlist.images.at(0)?.url;

  const colorModeColor = useColorModeColor();

  const getPlaylistTracks = useCallback(async (
    limit: number,
    offset: number,
    signal: AbortSignal,
  ): Promise<SpotifyApi.PlaylistTrackResponse> => {
    return (await axios.post<GetPlaylistTracksRequest, AxiosResponse<SpotifyApi.PlaylistTrackResponse>>(
      '/api/spotify/getPlaylistTracks',
      { limit, offset, playlistId },
      { signal },
    )).data;
  }, [playlistId]);

  function childDataMapper(playlistTrack: SpotifyApi.PlaylistTrackObject) {
    const trackObject = playlistTrack.track;

    function isEpisode(obj: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObjectFull): obj is SpotifyApi.EpisodeObjectFull {
      return (obj as SpotifyApi.EpisodeObjectFull)?.show !== undefined;
    }

    if (isEpisode(trackObject)) return <SpotifyEpisode episode={trackObject} key={trackObject.id} mb={5} />;
    else return <SpotifyTrack track={trackObject} key={trackObject.id} mb={5} />;
  }

  return <>
    <PageTitle title={`Spotify playlist ${playlist.name}`} />
    <ProjectPage projectTitle={<>Playlist <b><ChakraRouterLink href={playlist.external_urls.spotify}
                                                               color={colorModeColor}>{playlist.name} {imageUrl && <Image
      src={imageUrl} display='inline' boxSize={50} alt="First playlist album image"
      ml={2} />}</ChakraRouterLink></b></>}
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
                                 filterNotNull={(child: SpotifyApi.PlaylistTrackObject) => child.track != null}
                                 limitPerPage={limitPerPage}
                                 setLimitPerPage={setLimitPerPage}
                                 pageOffset={pageOffset}
                                 setPageOffset={setPageOffset} />
      </Box>
    </ProjectPage>
  </>;
}

export default SpotifyPlaylistViewRoute;
