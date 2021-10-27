import { Button } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/all';
import { logoutOfSpotify } from './SpotifyAuthUtils';

type SpotifyLogoutButtonProps = {
  setSpotifyTokenInfo: Function;
}

export function SpotifyLogoutButton({ setSpotifyTokenInfo } : SpotifyLogoutButtonProps) {
  function handleClickLogoutButton() {
    logoutOfSpotify();
    setSpotifyTokenInfo(null);
  }

  return <Button backgroundColor='#1DB954' rightIcon={<FaSpotify />} onClick={handleClickLogoutButton}>Log out of
    Spotify</Button>;
}