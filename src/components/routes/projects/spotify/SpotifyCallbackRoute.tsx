import { Heading, Text } from '@chakra-ui/react';
import { ChakraRouterLink } from '../../../utils/ChakraRouterLink';

export function SpotifyCallbackRoute() {
  return <>
    <Heading size='md'>Loading...</Heading>
    <Text>If you're not redirected, please go back to <ChakraRouterLink to='/projects'>the projects
      page</ChakraRouterLink>.</Text>
  </>;
}