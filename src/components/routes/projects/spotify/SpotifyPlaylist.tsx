import { Box, Flex, FlexProps, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { trimStrimToCharacters } from '../../../utils/StringUtils';

type SpotifyPlaylistProps = {
  playlist: SpotifyApi.PlaylistObjectFull | SpotifyApi.PlaylistObjectSimplified
}

export function SpotifyPlaylist({ playlist, ...rest } : SpotifyPlaylistProps & FlexProps) {
  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <Image boxSize={75} mr={2.5} src={playlist.images[0].url} />
    <Box flex='1' my='auto'>
      <Heading size='md'><ChakraRouterLink to={playlist.external_urls.spotify}><b>{playlist.name}</b></ChakraRouterLink></Heading>
      <Text fontSize='md'>From <ChakraRouterLink
        to={playlist.owner.external_urls.spotify}>{playlist.owner.display_name}</ChakraRouterLink>. {playlist.tracks.total} total
        songs. {playlist.description && trimStrimToCharacters(playlist.description, 100)}</Text>
    </Box>
  </Flex>;
}