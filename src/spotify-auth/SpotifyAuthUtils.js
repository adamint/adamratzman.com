import { Sha256 } from '@aws-crypto/sha256-browser';
import base64url from 'base64url';

export async function getPkceAuthUrlFull(scopes, clientId, redirectUri, codeVerifier, state) {
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

export async function getCodeChallengeForCodeVerifier(codeVerifier) {
  const hash = new Sha256();
  hash.update(codeVerifier);
  const result = await hash.digest();
  return base64url(result);
}

export function logoutOfSpotify() {
  localStorage.removeItem('spotify_pkce_callback_code');
  localStorage.removeItem('spotify_redirect_after_auth');
  localStorage.removeItem('spotify_token');
}