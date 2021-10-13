import { Box, Flex, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';

export function SpotifyArtist({ artist, ...rest }) {
  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <Image boxSize={75} mr={2.5} src={artist.images[0].url} />
    <Box flex='1' my='auto'>
      <Heading size='md'><ChakraRouterLink
        to={`/projects/spotify/artists/${artist.id}`}><b>{artist.name}</b></ChakraRouterLink></Heading>
      <Text fontSize='md'>Popularity: {artist.popularity}%. <b>{artist.followers.total}</b> followers.
        Genres: {artist.genres.join(', ')}</Text>
    </Box>
  </Flex>;
}