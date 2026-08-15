import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../components/utils/ChakraRouterLink';
import { SpotifyRouteComponent } from '../../../components/projects/spotify/SpotifyRouteComponent';
import { PageTitle } from '../../../components/meta/PageTitle';

function SpotifyCallbackRoute() {
  return <>
    <PageTitle title="Completing Spotify sign-in" />
    <Heading as='h1' size='md'>Completing Spotify sign-in</Heading>
    <SpotifyRouteComponent>
      <Text>If you&apos;re not redirected, please go back to <ChakraRouterLink href='/projects'>the projects
        page</ChakraRouterLink>.</Text>
    </SpotifyRouteComponent>
  </>;
}

export default SpotifyCallbackRoute