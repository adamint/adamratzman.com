import { Box, Flex, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import humanizeDuration from 'humanize-duration';
import { reduceComponentsToString } from '../../../utils/StringUtils';

export function SpotifyTrack({ track, ...rest }) {
  const artistsComponent = reduceComponentsToString(track.artists.map(artist => <ChakraRouterLink
    to={`/projects/spotify/artists/${artist.id}`} key={artist.id}>{artist.name}</ChakraRouterLink>), ',');

  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <Image boxSize={75} mr={2.5} src={track.album.images[0].url} />
    <Box flex='1' my='auto'>
      <Heading size='md'><ChakraRouterLink
        to={`/projects/spotify/tracks/${track.id}`}><b>{track.name}</b></ChakraRouterLink></Heading>
      <Text fontSize='md'>By {artistsComponent}. Popularity: {track.popularity}%.
        Duration: {humanizeDuration(track.duration_ms, { units: ['m', 's'], round: true })}</Text>
    </Box>
  </Flex>;
}