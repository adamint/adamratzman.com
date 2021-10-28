import { Box, Flex, FlexProps, Heading, HStack, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import humanizeDuration from 'humanize-duration';
import { reduceComponentsToString } from '../../../utils/StringUtils';
import React from 'react';

type SpotifyTrackProps = {
  track: SpotifyApi.TrackObjectFull;
  openInNewTab?: boolean
}

export function SpotifyTrack({ track, openInNewTab = false, ...rest }: SpotifyTrackProps & FlexProps) {
  console.log(track);

  const artistsComponent = reduceComponentsToString(track.artists.map(artist => <ChakraRouterLink
    href={`/projects/spotify/artists/${artist.id}`} key={artist.id}
    target={openInNewTab ? '_blank' : '_self'}>{artist.name}</ChakraRouterLink>), ', ');

  function TrackLink({ children }: { children: React.ReactNode }) {
    return <ChakraRouterLink href={`/projects/spotify/tracks/${track.id}`} target={openInNewTab ? '_blank' : '_self'}>
      {children}
    </ChakraRouterLink>;
  }

  return <Flex {...rest} maxW={{ base: '100%', md: '95%' }}>
    <TrackLink>
      <Image boxSize={75} mr={2.5} src={track.album.images[0].url} alt='Spotify track preview image' />
    </TrackLink>
    <Box flex='1' my='auto'>
      <Heading size='md'>
        <TrackLink><b>{track.name}</b></TrackLink>
      </Heading>
      <HStack>
        <Text fontSize='md'>By {artistsComponent}. Popularity: {track.popularity}%.
          Duration: {humanizeDuration(track.duration_ms, { units: ['m', 's'], round: true })}</Text>
        {track.preview_url && <Box>
          <audio controls>
            <source src={track.preview_url} type='audio/mp3' />
          </audio>
        </Box>}
      </HStack>
    </Box>
  </Flex>;
}