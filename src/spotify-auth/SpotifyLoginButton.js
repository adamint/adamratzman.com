import { Button } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/all';
import { useEffect } from 'react';
import randomstring from 'randomstring';
import { redirectToSpotifyLogin } from './SpotifyAuthUtils';

export function SpotifyLoginButton({
                                     scopes,
                                     clientId,
                                     redirectUri,
                                     codeVerifier,
                                     setCodeVerifier,
                                     state = null,
                                     redirectPathAfter,
                                     title = null,
                                   }) {
  useEffect(() => {
    const savedCodeVerifier = localStorage.getItem('spotify_code_verifier');
    if (codeVerifier !== savedCodeVerifier) setCodeVerifier(savedCodeVerifier);
    // eslint-disable-next-line
  }, []);


  async function handleClickLoginButton() {
    const newCodeVerifier = randomstring.generate(128);
    await redirectToSpotifyLogin(newCodeVerifier, redirectPathAfter, setCodeVerifier, scopes, clientId, redirectUri, state);
  }

  return <Button backgroundColor='#1DB954' rightIcon={<FaSpotify />} onClick={handleClickLoginButton}>
    {title ? title : <>Log in with Spotify</>}
  </Button>;
}