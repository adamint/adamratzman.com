import { ProjectPage } from '../../../../components/projects/ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../components/utils/ChakraRouterLink';
import { useData } from '../../../../components/utils/useData';
import { useColorModeColor } from '../../../../components/utils/useColorModeColor';
import React, { useEffect, useState } from 'react';
import { PaginatedSpotifyDisplay } from '../../../../components/projects/spotify/views/PaginatedSpotifyDisplay';
import { SpotifyPlaylist } from '../../../../components/projects/spotify/views/SpotifyPlaylist';
import { useSpotifyStore } from '../../../../components/utils/useSpotifyStore';
import { useSpotifyWebApiGuardValidPkceToken } from '../../../../spotify-auth/SpotifyAuthUtils';
import { useRouter } from 'next/router';
import { SpotifyRouteComponent } from '../../../../components/projects/spotify/SpotifyRouteComponent';
import Head from 'next/head';

type SpotifyUserViewRouteParams = {
  userId: string;
}

type SpotifyUserData = {
  user: SpotifyApi.UserObjectPublic;
  totalPlaylists: number
}

function SpotifyUserViewRoute() {
  const router = useRouter();
  const { userId } = router.query as SpotifyUserViewRouteParams;
  const [spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyClientId, state.spotifyTokenInfo, state.setSpotifyTokenInfo]);
  const guardedSpotifyApi = useSpotifyWebApiGuardValidPkceToken(spotifyClientId, spotifyTokenInfo, setSpotifyTokenInfo);
  const { data, loading, error } = useData<SpotifyUserData>(async () => {
    const spotifyApi = await guardedSpotifyApi.getApi();
    return {
      user: await spotifyApi.getUser(userId),
      totalPlaylists: (await spotifyApi.getUserPlaylists(userId)).total,
    };
  }, [userId]);
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const colorModeColor = useColorModeColor();

  useEffect(() => {
    if (error) router.push('/projects/spotify');
  }, [error]);

  async function getUserPlaylists(limitPerPage: number, pageOffset: number): Promise<SpotifyApi.ListOfUsersPlaylistsResponse> {
    return await (await guardedSpotifyApi.getApi()).getUserPlaylists(userId, {
      limit: limitPerPage,
      offset: pageOffset * limitPerPage,
    });
  }

  const childDataMapper = (playlist: SpotifyApi.PlaylistObjectSimplified) => <SpotifyPlaylist playlist={playlist}
                                                                                              key={playlist.id}
                                                                                              mb={5} />;

  if (error) {
    return null;
  }
  return <SpotifyRouteComponent>
    <Head>
      <title>{data ? `Spotify user ${data.user.display_name ?? data.user.id}` : 'Loading Spotify user details...'}</title>
    </Head>
    <ProjectPage projectTitle={!data ? <>Loading user details...</> : <>User <b><ChakraRouterLink
      href={data.user.external_urls.spotify}
      color={colorModeColor}>{data.user.display_name ?? data.user.id} <Image src={data.user.images?.at(0)?.url}
                                                                             display='inline' boxSize={50}
                                                                             ml={2} /></ChakraRouterLink></b></>}
                 marginBelowHeadingOverride={0}
                 topRight={<SpotifyLogoutButton setSpotifyTokenInfo={setSpotifyTokenInfo} />}
                 isLoading={loading}>
      {data && <>
        <Box mb={6}>
          {data.user.followers && <Text><b>Followers: </b> {data.user.followers.total.toLocaleString()}</Text>}
          <Text><b>ID: </b> {data.user.id}</Text>
        </Box>

        <Box>
          <Heading mb={2} size='md' variant='semiLight'><b>User playlists</b> ({data.totalPlaylists})</Heading>
          <PaginatedSpotifyDisplay dataProducer={getUserPlaylists}
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

export default SpotifyUserViewRoute;
