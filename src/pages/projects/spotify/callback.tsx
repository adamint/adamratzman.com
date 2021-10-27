import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';

function SpotifyCallbackRoute() {
  return <SpotifyRouteComponent>
    <Heading size='md'>Loading...</Heading>
    <Text>If you're not redirected, please go back to <ChakraRouterLink href='/projects'>the projects
      page</ChakraRouterLink>.</Text>
  </SpotifyRouteComponent>;
}

export default SpotifyCallbackRoute