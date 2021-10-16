import { ProjectPage } from '../ProjectPage';
import { SpotifyLogoutButton } from '../../../../spotify-auth/SpotifyLogoutButton';
import { Box, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { useData } from '../../../utils/useData';
import { useHistory, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../../utils/useDocumentTitle';
import { useColorModeColor } from '../../../utils/useColorModeColor';
import { SpotifyRouteProps } from './SpotifyRoute';
import React, { useState } from 'react';
import { PaginatedSpotifyDisplay } from './views/PaginatedSpotifyDisplay';
import { SpotifyPlaylist } from './views/SpotifyPlaylist';

type SpotifyUserViewRouteParams = {
  userId: string;
}

type SpotifyUserData = {
  user: SpotifyApi.UserObjectPublic;
  totalPlaylists: number
}

export function SpotifyUserViewRoute({ guardedSpotifyApi, setSpotifyTokenInfo }: SpotifyRouteProps) {
  const { userId } = useParams<SpotifyUserViewRouteParams>();
  const history = useHistory();
  const { data, loading, error } = useData<SpotifyUserData>(async () => {
    const spotifyApi = await guardedSpotifyApi.getApi();
    return {
      user: await spotifyApi.getUser(userId),
      totalPlaylists: (await spotifyApi.getUserPlaylists(userId)).total,
    };
  }, [userId]);
  const [limitPerPage, setLimitPerPage] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);

  useDocumentTitle(data ? `Spotify user ${data.user.display_name ?? data.user.id}` : 'Loading Spotify user details...');
  const colorModeColor = useColorModeColor();

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
    history.push('/projects/spotify');
    return null;
  }
  return <ProjectPage projectTitle={!data ? <>Loading user details...</> : <>User <b><ChakraRouterLink
    to={data.user.external_urls.spotify}
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
  </ProjectPage>;
}

