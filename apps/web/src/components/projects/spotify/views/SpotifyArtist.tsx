import { Box, Flex, FlexProps, Heading, Image, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';
import React from 'react';

type SpotifyArtistProps = {
  artist: SpotifyApi.ArtistObjectFull
  openInNewTab?: boolean;
}

export function SpotifyArtist({ artist, openInNewTab = false, ...rest }: SpotifyArtistProps & FlexProps) {
  function ArtistLink({ children }: { children: React.ReactNode }) {
    return <ChakraRouterLink href={`/projects/spotify/artists/${artist.id}`} target={openInNewTab ? '_blank' : '_self'}>
      {children}
    </ChakraRouterLink>;
  }

  return <Flex {...rest} maxW={{ base: '100%', md: '75%' }}>
    <ArtistLink>
    <Image boxSize={75} mr={2.5} src={artist.images[0].url} alt="Spotify artist preview image" />
    </ArtistLink>
    <Box flex='1' my='auto'>
      <Heading size='md'><ArtistLink><b>{artist.name}</b></ArtistLink></Heading>
      <Text fontSize='md'>Popularity: {artist.popularity}%. <b>{artist.followers.total.toLocaleString()}</b> followers.
        Genres: {artist.genres.join(', ')}</Text>
    </Box>
  </Flex>;
}