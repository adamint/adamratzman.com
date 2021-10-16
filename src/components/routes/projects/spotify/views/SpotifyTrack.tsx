import { Box, Flex, FlexProps, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../../utils/ChakraRouterLink';
import humanizeDuration from 'humanize-duration';
import { reduceComponentsToString } from '../../../../utils/StringUtils';
import React from 'react';

type SpotifyTrackProps = {
  track: SpotifyApi.TrackObjectFull;
  openInNewTab?: boolean
}

export function SpotifyTrack({ track, openInNewTab = false, ...rest }: SpotifyTrackProps & FlexProps) {
  const artistsComponent = reduceComponentsToString(track.artists.map(artist => <ChakraRouterLink
    to={`/projects/spotify/artists/${artist.id}`} key={artist.id}
    target={openInNewTab ? '_blank' : '_self'}>{artist.name}</ChakraRouterLink>), ', ');

  function TrackLink({ children }: { children: React.ReactNode }) {
    return <ChakraRouterLink to={`/projects/spotify/tracks/${track.id}`} target={openInNewTab ? '_blank' : '_self'}>
      {children}
    </ChakraRouterLink>;
  }

  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <TrackLink>
      <Image boxSize={75} mr={2.5} src={track.album.images[0].url} />
    </TrackLink>
    <Box flex='1' my='auto'>
      <Heading size='md'>
        <TrackLink><b>{track.name}</b></TrackLink>
      </Heading>
      <Text fontSize='md'>By {artistsComponent}. Popularity: {track.popularity}%.
        Duration: {humanizeDuration(track.duration_ms, { units: ['m', 's'], round: true })}</Text>
    </Box>
  </Flex>;
}