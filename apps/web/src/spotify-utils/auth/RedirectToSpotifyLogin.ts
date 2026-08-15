import { useEffect } from 'react';
import { redirectToSpotifyLogin, type SetCodeVerifier } from './SpotifyAuthUtils';

type RedirectToSpotifyLoginProps = {
  codeVerifier: string;
  redirectPathAfter: string;
  setCodeVerifier: SetCodeVerifier;
  scopes: string[];
  clientId: string;
  redirectUri: string;
  state?: string | null;
}

export function RedirectToSpotifyLogin({
                                         codeVerifier,
                                         redirectPathAfter,
                                         setCodeVerifier,
                                         scopes,
                                         clientId,
                                         redirectUri,
                                         state = null,
                                       }: RedirectToSpotifyLoginProps) {
  useEffect(() => {
    void (async () => {
      await redirectToSpotifyLogin(codeVerifier, redirectPathAfter, setCodeVerifier, scopes, clientId, redirectUri, state);
    })();
  }, []);

  return null;
}