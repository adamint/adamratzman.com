import { Sha256 } from '@aws-crypto/sha256-browser';
import base64url from 'base64url';
import { useEffect } from 'react';

export async function getPkceAuthUrlFull(scopes: string[], clientId: string, redirectUri: string, codeVerifier: string, state: string | null): Promise<string> {
  /*
              return "https://accounts.spotify.com/authorize/?client_id=$clientId" +
                    "&response_type=code" +
                    "&redirect_uri=$redirectUri" +
                    "&code_challenge_method=S256" +
                    "&code_challenge=$codeChallenge" +
                    (state?.let { "&state=$it" } ?: "") +
                    if (scopes.isEmpty()) "" else "&scope=${scopes.joinToString("%20") { it.uri }}"
   */

  if (codeVerifier.length < 43 || codeVerifier.length > 128) throw new Error('Code verifier must be between 43..128 characters long');
  const codeChallenge = await getCodeChallengeForCodeVerifier(codeVerifier);

  let url = `https://accounts.spotify.com/authorize/?client_id=${clientId}`
    + `&response_type=code`
    + `&redirect_uri=${redirectUri}`
    + `&code_challenge_method=S256`
    + `&code_challenge=${codeChallenge}`;

  if (state) url += `&state=${state}`;
  if (scopes.length > 0) url += `&scope=${scopes.join('%20')}`;

  return url;
}

export async function getCodeChallengeForCodeVerifier(codeVerifier: string): Promise<string> {
  const hash = new Sha256();
  hash.update(codeVerifier);
  const result = await hash.digest();
  // @ts-ignore
  return base64url(result);
}

export function logoutOfSpotify() {
  localStorage.removeItem('spotify_pkce_callback_code');
  localStorage.removeItem('spotify_redirect_after_auth');
  localStorage.removeItem('spotify_token');
}

export async function redirectToSpotifyLogin(codeVerifier: string, redirectPathAfter: string, setCodeVerifier: Function, scopes: string[], clientId: string, redirectUri: string, state: string | null = null) {
  localStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_redirect_after_auth', redirectPathAfter);
  setCodeVerifier(codeVerifier);
  window.location.href = await getPkceAuthUrlFull(scopes, clientId, redirectUri, codeVerifier, state);
}

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

export type SpotifyTokenInfo = {
  expiry: number;
  token: SpotifyToken
}

export type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
  scope: string | null
}