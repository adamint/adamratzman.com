import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useData } from '../../../../components/utils/useData';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useEffect, useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyTrack } from '../../../../components/projects/spotify/views/SpotifyTrack';
import { SpotifyEpisode } from '../../../../components/projects/spotify/views/SpotifyEpisode';
import { useRouter } from 'next/router';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-auth/SpotifyAuthUtils';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import Head from 'next/head';

type SpotifyPlaylistViewRouteParams = {
  playlistId: string;
}

function SpotifyPlaylistViewRoute() {
  const router = useRouter();
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const { playlistId } = router.query as SpotifyPlaylistViewRouteParams;
  const { data, loading, error } = useData<SpotifyApi.PlaylistObjectFull>(async () => {
    const spotifyApi = await guardedSpotifyApi.getApi();
    return await spotifyApi.getPlaylist(playlistId);
  }, [playlistId]);
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const colorModeColor = useColorModeColor();

  async function getPlaylistTracks(limitPerPage: number, pageOffset: number): Promise<SpotifyApi.PlaylistTrackResponse> {
    return await (await guardedSpotifyApi.getApi()).getPlaylistTracks(playlistId, {
      limit: limitPerPage,
      offset: pageOffset * limitPerPage,
    });
  }

  function childDataMapper(playlistTrack: SpotifyApi.PlaylistTrackObject) {
    const trackObject = playlistTrack.track;

    function isEpisode(obj: SpotifyApi.TrackObjectFull | SpotifyApi.EpisodeObjectFull): obj is SpotifyApi.EpisodeObjectFull {
      return (obj as SpotifyApi.EpisodeObjectFull).show !== undefined;
    }

    if (isEpisode(trackObject)) return <SpotifyEpisode episode={trackObject} key={trackObject.id} mb={5} />;
    else return <SpotifyTrack track={trackObject} key={trackObject.id} mb={5} />;
  }

  useEffect(() => {
    if (error) router.push('/projects/spotify');
  }, [error]);

  if (error) {
    return null;
  }
  return <SpotifyRouteComponent>
    <Head>
      <title>{data ? `Spotify playlist ${data.name}` : 'Loading Spotify playlist details...'}</title>
    </Head>
    <ProjectPage projectTitle={!data ? <>Loading playlist details...</> : <>Playlist <b><ChakraRouterLink
      href={data.external_urls.spotify}
      color={colorModeColor}>{data.name} <Image src={data.images.at(0)?.url} display='inline' boxSize={50}
                                                ml={2} /></ChakraRouterLink></b></>}
                 marginBelowHeadingOverride={0}
                 topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
                 isLoading={loading}>
      {data && <>
        <Box mb={6}>
          <Text><b>By: </b> <ChakraRouterLink
            href={`/projects/spotify/users/${data.owner.id}`}>{data.owner.display_name || data.owner.id} {data.owner.followers?.total &&
          <>(<b>{data.owner.followers?.total}</b> followers)</>}</ChakraRouterLink></Text>
          {data.description && <Text><b>Description: </b> {data.description}</Text>}
          <Text><b>Followers: </b> {data.followers.total.toLocaleString()}</Text>
          <Text><b>Public: </b> {data.public ? 'yes' : 'no'}</Text>
          <Text><b>Collaborative: </b> {data.collaborative ? 'yes' : 'no'}</Text>
          <Text><b>ID: </b> {data.id}</Text>
        </Box>

        <Box>
          <Heading mb={2} size='md' variant='semiLight'><b>Playlist Tracks</b> ({data.tracks.total})</Heading>
          <PaginatedSpotifyDisplay dataProducer={getPlaylistTracks}
                                   childDataMapper={childDataMapper}
                                   limitPerPage={limitPerPage}
                                   setLimitPerPage={setLimitPerPage}
                                   pageOffset={pageOffset}
                                   setPageOffset={setPageOffset} />
        </Box>

      </>}
    </ProjectPage>
  </SpotifyRouteComponent>;
}

export default SpotifyPlaylistViewRoute;
