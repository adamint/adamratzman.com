import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Heading,
  Text,
} from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/fa';
import React, { useState } from 'react';
import {
  createPkceCodeVerifier,
  spotifyAuthStorageKeys,
  type SetCodeVerifier,
  SpotifyAuthUtils,
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
  const [authorizationFailed, setAuthorizationFailed] = useState(false);

  async function handleClickLoginButton() {
    setAuthorizationFailed(false);
    let consumedCallbackCode: string | null = null;
    try {
      consumedCallbackCode = localStorage.getItem(spotifyAuthStorageKeys.consumedCallbackCode);
      const newCodeVerifier = createPkceCodeVerifier();
      await redirectToSpotifyLogin(
        newCodeVerifier,
        redirectPathAfter,
        setCodeVerifier,
        scopes,
        clientId,
        redirectUri,
      );
    } catch {
      clearFailedAuthorizationAttempt(setCodeVerifier, consumedCallbackCode);
      setAuthorizationFailed(true);
    }
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
    {authorizationFailed && <Alert status='error' mt={4}>
      <AlertIcon />
      Spotify sign-in is temporarily unavailable. Please try again.
    </Alert>}
  </>;
}

function clearFailedAuthorizationAttempt(
  setCodeVerifier: SetCodeVerifier,
  consumedCallbackCode: string | null,
) {
  try {
    SpotifyAuthUtils.clearAuthorizationTransaction();
  } catch {
    // Continue with the remaining best-effort cleanup.
  }
  if (consumedCallbackCode !== null) {
    try {
      localStorage.setItem(spotifyAuthStorageKeys.consumedCallbackCode, consumedCallbackCode);
    } catch {
      // Keep the UI unauthenticated when storage remains unavailable.
    }
  }
  setCodeVerifier(undefined);
}