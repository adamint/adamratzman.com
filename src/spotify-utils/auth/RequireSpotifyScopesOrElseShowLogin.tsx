import { Box, Heading, Text } from '@chakra-ui/react';
import { SpotifyLoginButton } from './SpotifyLoginButton';
import { SpotifyToken, SpotifyTokenInfo } from './SpotifyAuthUtils';
import React, { useEffect } from 'react';
import { useLocalStorage } from '@rehooks/local-storage';

type RequireSpotifyScopesOrElseShowLoginProps = {
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setCodeVerifier: Function;
  redirectPathAfter: string;
  requiredScopes: string[];
  spotifyToken: SpotifyToken;
  children: React.ReactNode
}


export function RequireSpotifyScopesOrElseShowLogin({
                                                      clientId,
                                                      redirectUri,
                                                      codeVerifier,
                                                      setCodeVerifier,
                                                      redirectPathAfter,
                                                      requiredScopes,
                                                      spotifyToken,
                                                      children,
                                                    }: RequireSpotifyScopesOrElseShowLoginProps) {
  const [spotifyTokenInfoStringLocalStorage, setSpotifyTokenInfoStringLocalStorage] = useLocalStorage<SpotifyTokenInfo | null | undefined>(
    'spotify_token',
    undefined,
  );

  useEffect(() => {
    setSpotifyTokenInfoStringLocalStorage(
      localStorage.getItem('spotify_token') ? JSON.parse(localStorage.getItem('spotify_token') as string) : null,
    );
  }, []);

  const hasScopes = spotifyToken.scope?.split(' ') ?? [];

  if (spotifyTokenInfoStringLocalStorage === undefined) return null;
  if (spotifyTokenInfoStringLocalStorage && spotifyTokenInfoStringLocalStorage.expiry < Date.now()) {
    return null;
  }
  if (requiredScopes.some(requiredScope => !hasScopes.includes(requiredScope))) {
    const doesntHaveScopes = requiredScopes.filter(requiredScope => !hasScopes.includes(requiredScope));
    const scopesToAuthorizeWith = hasScopes.concat(doesntHaveScopes);
    return <>
      <Box mb={5}>
        <Heading size='md' mb={1}>You're missing required Spotify authorization scopes. Please reauthorize to view this
          page</Heading>
        <Text fontSize='md'>You're missing the following scope(s): <b>{doesntHaveScopes.join(', ')}</b>.</Text>
      </Box>
      <SpotifyLoginButton
        title='Please reauthorize to view this page'
        scopes={scopesToAuthorizeWith}
        clientId={clientId}
        redirectUri={redirectUri}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={redirectPathAfter} />
    </>;
  }

  return <>
    {children}
  </>;
}