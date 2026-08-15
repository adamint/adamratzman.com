import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';

function SpotifyCallbackRoute() {
  return <>
    <Heading as='h1' size='md'>Completing Spotify sign-in</Heading>
    <SpotifyRouteComponent>
      <Text>If you&apos;re not redirected, please go back to <ChakraRouterLink href='/projects'>the projects
        page</ChakraRouterLink>.</Text>
    </SpotifyRouteComponent>
  </>;
}

export default SpotifyCallbackRoute