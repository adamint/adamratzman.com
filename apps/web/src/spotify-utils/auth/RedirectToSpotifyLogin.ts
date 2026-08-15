import { useEffect } from 'react';
import {
  getPkceAuthUrlFull,
  isLocalAbsolutePath,
  type SetCodeVerifier,
  SpotifyAuthUtils,
} from './SpotifyAuthUtils';

const spotifyRedirectAfterAuthStorageKey = 'spotify_redirect_after_auth';
const spotifyPkceCallbackCodeStorageKey = 'spotify_pkce_callback_code';
const minimumSpotifyStateLength = 32;

export async function prepareSpotifyLoginRedirect(
  codeVerifier: string,
  redirectPathAfter: string,
  setCodeVerifier: SetCodeVerifier,
  scopes: string[],
  clientId: string,
  redirectUri: string,
  state?: string,
) {
  const nextState = state || SpotifyAuthUtils.getRandomCode(minimumSpotifyStateLength);
  const safeRedirectPath = isLocalAbsolutePath(redirectPathAfter)
    ? redirectPathAfter
    : '/projects/spotify';

  localStorage.removeItem(spotifyPkceCallbackCodeStorageKey);
  SpotifyAuthUtils.storeVerifier(codeVerifier);
  SpotifyAuthUtils.storeState(nextState);
  localStorage.setItem(spotifyRedirectAfterAuthStorageKey, safeRedirectPath);
  setCodeVerifier(codeVerifier);

  return getPkceAuthUrlFull(
    scopes,
    clientId,
    redirectUri,
    codeVerifier,
    nextState,
  );
}

export async function redirectToSpotifyLogin(
  codeVerifier: string,
  redirectPathAfter: string,
  setCodeVerifier: SetCodeVerifier,
  scopes: string[],
  clientId: string,
  redirectUri: string,
  state?: string,
) {
  window.location.href = await prepareSpotifyLoginRedirect(
    codeVerifier,
    redirectPathAfter,
    setCodeVerifier,
    scopes,
    clientId,
    redirectUri,
    state,
  );
}

type RedirectToSpotifyLoginProps = {
  codeVerifier: string;
  redirectPathAfter: string;
  setCodeVerifier: SetCodeVerifier;
  scopes: string[];
  clientId: string;
  redirectUri: string;
  state?: string;
}

export function RedirectToSpotifyLogin({
                                         codeVerifier,
                                         redirectPathAfter,
                                         setCodeVerifier,
                                         scopes,
                                         clientId,
                                         redirectUri,
                                         state,
                                       }: RedirectToSpotifyLoginProps) {
  useEffect(() => {
    void (async () => {
      await redirectToSpotifyLogin(codeVerifier, redirectPathAfter, setCodeVerifier, scopes, clientId, redirectUri, state);
    })();
  }, []);

  return null;
}