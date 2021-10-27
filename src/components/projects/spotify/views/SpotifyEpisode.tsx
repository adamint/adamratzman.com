import { Box, Flex, FlexProps, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import { trimStrimToCharacters } from '../../../utils/StringUtils';
import React from 'react';
import humanizeDuration from 'humanize-duration';

type SpotifyEpisodeProps = {
  episode: SpotifyApi.EpisodeObjectFull
  openInNewTab?: boolean;
}

export function SpotifyEpisode({ episode, openInNewTab = false, ...rest }: SpotifyEpisodeProps & FlexProps) {
  function EpisodeLink({ children }: { children: React.ReactNode }) {
    return <ChakraRouterLink href={episode.external_urls.spotify} target={openInNewTab ? '_blank' : '_self'}>
      {children}
    </ChakraRouterLink>;
  }

  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <EpisodeLink>
      <Image boxSize={75} mr={2.5} src={episode.images[0].url} />
    </EpisodeLink>
    <Box flex='1' my='auto'>
      <Heading size='md'><EpisodeLink><b>{episode.name}</b></EpisodeLink></Heading>
      <Text fontSize='md'>Duration: {humanizeDuration(episode.duration_ms, { units: ['m', 's'], round: true })}. From
        show <ChakraRouterLink
          href={episode.show.external_urls.spotify}>{episode.show.name}</ChakraRouterLink>. Release
        date: {episode.release_date} total
        songs. {episode.description && trimStrimToCharacters(episode.description, 100)}</Text>
    </Box>
  </Flex>;
}