import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getClientCredentialsSpotifyApiNode } from '../../../../spotify-utils/SpotifyNodeApiUtils';
import axios, { AxiosResponse } from 'axios';
import { GetUserPlaylistsRequestBody } from '../../../api/spotify/getUserPlaylists';

type SpotifyUserViewRouteParams = {
  userId: string;
}

type SpotifyUserViewRouteProps = {
  totalPlaylists: number;
  user: SpotifyApi.UserProfileResponse
}

function SpotifyUserViewRoute({ totalPlaylists, user }: SpotifyUserViewRouteProps) {
  const router = useRouter();
  const { userId } = router.query as SpotifyUserViewRouteParams;
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const colorModeColor = useColorModeColor();

  async function getUserPlaylists(limitPerPage: number, pageOffset: number): Promise<SpotifyApi.ListOfUsersPlaylistsResponse> {
    return (await axios.post<GetUserPlaylistsRequestBody, AxiosResponse<SpotifyApi.ListOfUsersPlaylistsResponse>>(
        '/api/spotify/getUserPlaylists',
        { limit: limitPerPage, offset: pageOffset, userId: userId })
    ).data;
  }

  const childDataMapper = (playlist: SpotifyApi.PlaylistObjectSimplified) => <SpotifyPlaylist playlist={playlist}
                                                                                              key={playlist.id}
                                                                                              mb={5} />;

  return <>
    <Head>
      <title>Spotify user {user.display_name ?? user.id}</title>
    </Head>
    <ProjectPage projectTitle={<>User <b><ChakraRouterLink href={user.external_urls.spotify}
                                                           color={colorModeColor}>{user.display_name ?? user.id} <Image
      src={user.images?.at(0)?.url}
      display='inline' boxSize={50}
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

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { userId } = ctx.query as SpotifyUserViewRouteParams;
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    return {
      props: {
        user: (await spotifyApi.getUser(userId)).body,
        totalPlaylists: (await spotifyApi.getUserPlaylists(userId)).body.total,
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
