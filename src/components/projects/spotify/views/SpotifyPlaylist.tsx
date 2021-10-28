import { Box, Flex, FlexProps, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { trimStrimToCharacters } from '../../../utils/StringUtils';
import React from 'react';

type SpotifyPlaylistProps = {
  playlist: SpotifyApi.PlaylistObjectFull | SpotifyApi.PlaylistObjectSimplified
  openInNewTab?: boolean;
}

export function SpotifyPlaylist({ playlist, openInNewTab = false, ...rest }: SpotifyPlaylistProps & FlexProps) {
  function PlaylistLink({ children }: { children: React.ReactNode }) {
    return <ChakraRouterLink href={`/projects/spotify/playlists/${playlist.id}`}
                             target={openInNewTab ? '_blank' : '_self'}>
      {children}
    </ChakraRouterLink>;
  }

  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <PlaylistLink>
      <Image boxSize={75} mr={2.5} src={playlist.images[0].url} alt='Spotify playlist preview image' />
    </PlaylistLink>
    <Box flex='1' my='auto'>
      <Heading size='md'><PlaylistLink><b>{playlist.name}</b></PlaylistLink></Heading>
      <Text fontSize='md'>From <ChakraRouterLink
        href={`/projects/spotify/users/${playlist.owner.id}`}>{playlist.owner.display_name}</ChakraRouterLink>. {playlist.tracks.total} total
        songs. {playlist.description && trimStrimToCharacters(playlist.description, 100)}</Text>
    </Box>
  </Flex>;
}