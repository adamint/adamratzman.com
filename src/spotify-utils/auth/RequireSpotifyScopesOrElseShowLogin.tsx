import { Box, Heading, Text } from '@chakra-ui/react';
import { SpotifyLoginButton } from './SpotifyLoginButton';
import { SpotifyToken, SpotifyTokenInfo } from './SpotifyAuthUtils';
import React, { useEffect, useState } from 'react';

type RequireSpotifyScopesOrElseShowLoginProps = {
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setCodeVerifier: Function;
  redirectPathAfter: string;
  requiredScopes: string[];
  spotifyToken: SpotifyToken;
  children: React.ReactNode;
  title: string;
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
                                                      title,
                                                    }: RequireSpotifyScopesOrElseShowLoginProps) {
  const [spotifyTokenInfoStringLocalStorage, setSpotifyTokenInfoStringLocalStorage] = useState<SpotifyTokenInfo | null | undefined>(undefined);
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  useEffect(() => {
    const updateTokenInfo = () => setSpotifyTokenInfoStringLocalStorage(
      localStorage.getItem('spotify_token') ? JSON.parse(localStorage.getItem('spotify_token') as string) : null,
    );

    updateTokenInfo();
    const refreshId = setInterval(updateTokenInfo, 100);
    setShouldRender(true);
    return () => clearInterval(refreshId);
  }, []);

  const hasScopes = spotifyToken.scope?.split(' ') ?? [];

  if (spotifyTokenInfoStringLocalStorage === undefined || !shouldRender) return null;
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
        buttonText='Please reauthorize to view this page'
        scopes={scopesToAuthorizeWith}
        clientId={clientId}
        redirectUri={redirectUri}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={redirectPathAfter}
        title={title} />
    </>;
  }

  return <>
    {children}
  </>;
}