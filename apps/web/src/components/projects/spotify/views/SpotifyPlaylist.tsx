import { Box, Flex, FlexProps, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { trimStrimToCharacters } from '../../../utils/StringUtils';
import React from 'react';
import type { SpotifyPlaylistCard } from '../../../../api/spotifyLoaderTypes';

type SpotifyPlaylistProps = {
  playlist: SpotifyPlaylistCard;
  openInNewTab?: boolean;
}

export function SpotifyPlaylist({ playlist, openInNewTab = false, ...rest }: SpotifyPlaylistProps & FlexProps) {
  const imageUrl = playlist.images.at(0)?.url;

  function PlaylistLink({ children, variant }: { children: React.ReactNode; variant?: 'media' }) {
    return <ChakraRouterLink href={`/projects/spotify/playlists/${playlist.id}`}
                             target={openInNewTab ? '_blank' : '_self'}
                             variant={variant}>
      {children}
    </ChakraRouterLink>;
  }

  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    {imageUrl && <PlaylistLink variant='media'>
      <Image boxSize={75} mr={2.5} src={imageUrl} alt='Spotify playlist preview image' />
    </PlaylistLink>}
    <Box flex='1' my='auto'>
      <Heading size='md'><PlaylistLink><b>{playlist.name}</b></PlaylistLink></Heading>
      <Text fontSize='md'>From <ChakraRouterLink
        href={`/projects/spotify/users/${playlist.owner.id}`}>{playlist.owner.display_name}</ChakraRouterLink>. {playlist.tracks.total} total
        songs. {playlist.description && trimStrimToCharacters(playlist.description, 100)}</Text>
    </Box>
  </Flex>;
}