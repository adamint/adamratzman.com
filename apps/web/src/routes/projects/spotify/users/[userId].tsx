import { ProjectPage } from '../../../../components/projects/ProjectPage';
import type { GetUserPlaylistsRequest } from '@adamratzman/contracts';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useCallback, useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useLoaderData } from 'react-router-dom';
import axios, { AxiosResponse } from 'axios';
import { userLoader } from '../../../../api/spotifyLoaders';

type SpotifyUserContentProps = ReturnType<typeof useLoaderData<typeof userLoader>>;

function SpotifyUserViewRoute() {
  const { totalPlaylists, user, userId } = useLoaderData<typeof userLoader>();

  return <SpotifyUserContent
    key={userId}
    totalPlaylists={totalPlaylists}
    user={user}
    userId={userId}
  />;
}

function SpotifyUserContent({ totalPlaylists, user, userId }: SpotifyUserContentProps) {
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const colorModeColor = useColorModeColor();

  const getUserPlaylists = useCallback(async (
    limit: number,
    offset: number,
    signal: AbortSignal,
  ): Promise<SpotifyApi.ListOfUsersPlaylistsResponse> => {
    return (await axios.post<GetUserPlaylistsRequest, AxiosResponse<SpotifyApi.ListOfUsersPlaylistsResponse>>(
      '/api/spotify/getUserPlaylists',
      { limit, offset, userId },
      { signal },
    )).data;
  }, [userId]);

  const childDataMapper = (playlist: SpotifyApi.PlaylistObjectSimplified) => <SpotifyPlaylist playlist={playlist}
                                                                                              key={playlist.id}
                                                                                              mb={5} />;

  return <>
    <PageTitle title={`Spotify user ${user.display_name ?? user.id}`} />
    <ProjectPage projectTitle={<>User <b><ChakraRouterLink href={user.external_urls.spotify}
                                                           color={colorModeColor}>{user.display_name ?? user.id} <Image
      src={user.images?.at(0)?.url} alt='User profile image display' display='inline' boxSize={50}
      ml={2} /></ChakraRouterLink></b></>}
                 marginBelowHeadingOverride={0}>
      <Box mb={6}>
        {user.followers && <Text><b>Followers: </b> {user.followers.total.toLocaleString()}</Text>}
        <Text><b>ID: </b> {user.id}</Text>
      </Box>

      <Box>
        <Heading mb={2} size='md' variant='semiLight'><b>User playlists</b> ({totalPlaylists})</Heading>
        <PaginatedSpotifyDisplay dataProducer={getUserPlaylists}
                                 childDataMapper={childDataMapper}
                                 filterNotNull={child => !!child}
                                 limitPerPage={limitPerPage}
                                 setLimitPerPage={setLimitPerPage}
                                 pageOffset={pageOffset}
                                 setPageOffset={setPageOffset} />
      </Box>
    </ProjectPage>
  </>;
}

export default SpotifyUserViewRoute;
