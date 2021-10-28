import { Button, Heading } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/all';
import { useEffect } from 'react';
import randomstring from 'randomstring';
import { redirectToSpotifyLogin } from './SpotifyAuthUtils';

type SpotifyLoginButtonProps = {
  scopes: string[];
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setCodeVerifier: Function;
  state?: string | null;
  redirectPathAfter: string;
  buttonText?: string | null;
  title?: string;
}

export function SpotifyLoginButton({
                                     scopes,
                                     clientId,
                                     redirectUri,
                                     codeVerifier,
                                     setCodeVerifier,
                                     state = null,
                                     redirectPathAfter,
                                     buttonText = null,
                                     title,
                                   }: SpotifyLoginButtonProps) {
  useEffect(() => {
    const savedCodeVerifier = localStorage.getItem('spotify_code_verifier');
    if (codeVerifier !== savedCodeVerifier) setCodeVerifier(savedCodeVerifier);
    // eslint-disable-next-line
  }, []);


  async function handleClickLoginButton() {
    const newCodeVerifier = randomstring.generate(128);
    await redirectToSpotifyLogin(newCodeVerifier, redirectPathAfter, setCodeVerifier, scopes, clientId, redirectUri, state);
  }

  return <>
    {title && <Heading size="lg" mb={2}>{title}</Heading>}
    <Button backgroundColor='#1DB954' rightIcon={<FaSpotify />} onClick={handleClickLoginButton}>
      {buttonText ? buttonText : <>Log in with Spotify</>}
    </Button>
  </>;
}