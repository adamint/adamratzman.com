import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/fa';
import React from 'react';
import {
  createPkceCodeVerifier,
  type SetCodeVerifier,
} from './SpotifyAuthUtils';
import { redirectToSpotifyLogin } from './RedirectToSpotifyLogin';
import { ChakraRouterLink } from '../../components/utils/ChakraRouterLink';

type SpotifyLoginButtonProps = {
  scopes: string[];
  clientId: string;
  redirectUri: string;
  setCodeVerifier: SetCodeVerifier;
  redirectPathAfter: string;
  buttonText?: string | null;
  title?: string;
}

export function SpotifyLoginButton({
                                     scopes,
                                     clientId,
                                     redirectUri,
                                     setCodeVerifier,
                                     redirectPathAfter,
                                     buttonText = null,
                                     title,
                                   }: SpotifyLoginButtonProps) {
  async function handleClickLoginButton() {
    const newCodeVerifier = createPkceCodeVerifier();
    await redirectToSpotifyLogin(
      newCodeVerifier,
      redirectPathAfter,
      setCodeVerifier,
      scopes,
      clientId,
      redirectUri,
    );
  }

  return <>
    {title && <Box mb={8}>
      <Heading size="lg" mb={1}>{title}</Heading>
      <Text>Or go back to the <ChakraRouterLink href='/projects'>projects page →</ChakraRouterLink></Text>
    </Box>}
    <Button backgroundColor='#1DB954' rightIcon={<FaSpotify />} onClick={() => {
      void handleClickLoginButton();
    }}>
      {buttonText ? buttonText : <>Log in with Spotify</>}
    </Button>
  </>;
}