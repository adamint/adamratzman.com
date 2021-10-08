import { Button } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/all';
import { getPkceAuthUrlFull } from './SpotifyAuthUtils';
import { useEffect } from 'react';

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
  }, []);


  async function handleClickLoginButton() {
    const newCodeVerifier = 'iq1iPNpchdAB9VuixjHzncx34LfY5vSEmax7rRFFFMwgc53Cm6XTZPJSt8saQRlzikbIUkgv0t6KRhrfEZXA6vRbVwbTqDFd7eCs8rAdfR27inlzdkk7uWqi5dRJibAq';
    //const newCodeVerifier = randomstring.generate(128);
    localStorage.setItem('spotify_code_verifier', newCodeVerifier);
    localStorage.setItem('spotify_redirect_after_auth', redirectPathAfter);
    setCodeVerifier(newCodeVerifier);
    window.location = await getPkceAuthUrlFull(scopes, clientId, redirectUri, newCodeVerifier, state);
  }

  return <Button backgroundColor='#1DB954' rightIcon={<FaSpotify />} onClick={handleClickLoginButton}>
    {title ? title : <>Log in with Spotify</>}
  </Button>;
}