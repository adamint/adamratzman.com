import { ProjectPage } from '../../../../components/projects/ProjectPage';
import type { GetUserPlaylistsRequest } from '@adamratzman/contracts';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import { PageTitle } from '../../../../components/meta/PageTitle';
import { useParams } from 'react-router-dom';
import axios, { AxiosResponse } from 'axios';

type SpotifyUserViewRouteParams = {
  userId: string;
}

type SpotifyUserViewRouteProps = {
  totalPlaylists: number;
  user: SpotifyApi.UserProfileResponse
}

function SpotifyUserViewRoute({ totalPlaylists, user }: SpotifyUserViewRouteProps) {
  const { userId = '' } = useParams<SpotifyUserViewRouteParams>();
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const colorModeColor = useColorModeColor();

  async function getUserPlaylists(limitPerPage: number, pageOffset: number): Promise<SpotifyApi.ListOfUsersPlaylistsResponse> {
    return (await axios.post<GetUserPlaylistsRequest, AxiosResponse<SpotifyApi.ListOfUsersPlaylistsResponse>>(
        '/api/spotify/getUserPlaylists',
        { limit: limitPerPage, offset: pageOffset, userId: userId })
    ).data;
  }

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
