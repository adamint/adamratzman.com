import { useEffect } from 'react';
import { redirectToSpotifyLogin } from './SpotifyAuthUtils';

type RedirectToSpotifyLoginProps = {
  codeVerifier: string;
  redirectPathAfter: string;
  setCodeVerifier: Function;
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
    (async () => {
      await redirectToSpotifyLogin(codeVerifier, redirectPathAfter, setCodeVerifier, scopes, clientId, redirectUri, state);
    })();
    // eslint-disable-next-line
  }, []);

  return null;
}