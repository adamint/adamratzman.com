import { Box, Heading, Text } from '@chakra-ui/react';
import { SpotifyLoginButton } from './SpotifyLoginButton';
import { type SetCodeVerifier, SpotifyToken, SpotifyTokenInfo } from './SpotifyAuthUtils';
import React, { useEffect, useState } from 'react';

type RequireSpotifyScopesOrElseShowLoginProps = {
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setCodeVerifier: SetCodeVerifier;
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

  function getStoredTokenInfo() {
    const storedToken = localStorage.getItem('spotify_token');
    return storedToken ? JSON.parse(storedToken) as SpotifyTokenInfo : null;
  }

  useEffect(() => {
    const updateTokenInfo = () => setSpotifyTokenInfoStringLocalStorage(getStoredTokenInfo());

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
        <Heading size='md' mb={1}>You&apos;re missing required Spotify authorization scopes. Please reauthorize to view this
          page</Heading>
        <Text fontSize='md'>You&apos;re missing the following scope(s): <b>{doesntHaveScopes.join(', ')}</b>.</Text>
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