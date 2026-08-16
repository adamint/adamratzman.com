import { Button } from '@chakra-ui/react';
import { FaSpotify } from 'react-icons/fa';
import { logoutOfSpotify } from './SpotifyAuthUtils';

type SpotifyLogoutButtonProps = {
  setSpotifyTokenInfo: Function;
}

export function SpotifyLogoutButton({ setSpotifyTokenInfo } : SpotifyLogoutButtonProps) {
  function handleClickLogoutButton() {
    logoutOfSpotify();
    setSpotifyTokenInfo(null);
  }

  return <Button
    backgroundColor='#1DB954'
    color='gray.900'
    rightIcon={<FaSpotify />}
    _active={{ backgroundColor: '#169B45' }}
    _hover={{ backgroundColor: '#1ED760' }}
    onClick={handleClickLogoutButton}
  >
    Log out of Spotify
  </Button>;
}