import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/fa';
import React, { useEffect } from 'react';
import {
  createPkceCodeVerifier,
  redirectToSpotifyLogin,
  type SetCodeVerifier,
} from './SpotifyAuthUtils';
import { ChakraRouterLink } from '../../components/utils/ChakraRouterLink';

type SpotifyLoginButtonProps = {
  scopes: string[];
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setCodeVerifier: SetCodeVerifier;
  state?: string | null;
  redirectPathAfter: string;
  buttonText?: string | null;
  title?: string;
}

export function SpotifyLoginButton({
                                     scopes,
                                     clientId,
                                     redirectUri,
                                     codeVerifier,
                                     setCodeVerifier,
                                     state = null,
                                     redirectPathAfter,
                                     buttonText = null,
                                     title,
                                   }: SpotifyLoginButtonProps) {
  useEffect(() => {
    const savedCodeVerifier = localStorage.getItem('spotify_code_verifier');
    if (codeVerifier !== savedCodeVerifier) setCodeVerifier(savedCodeVerifier);
  }, []);


  async function handleClickLoginButton() {
    const newCodeVerifier = createPkceCodeVerifier();
    await redirectToSpotifyLogin(newCodeVerifier, redirectPathAfter, setCodeVerifier, scopes, clientId, redirectUri, state);
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