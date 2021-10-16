import { useHistory, useLocation } from 'react-router-dom';
import axios, { AxiosResponse } from 'axios';
import { useEffect } from 'react';
import {
  doSpotifyPkceRefresh,
  logoutOfSpotify,
  saveTokenAndGetRedirectPath,
  SpotifyToken,
  SpotifyTokenInfo,
} from './SpotifyAuthUtils';
import { deleteFromStorage, useLocalStorage, writeStorage } from '@rehooks/local-storage';

type SpotifyCallbackIngestionTokenProducerComponentProps = {
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setSpotifyTokenInfo: Function;
}

export function SpotifyCallbackIngestionTokenProducerComponent({
                                                                 clientId,
                                                                 redirectUri,
                                                                 codeVerifier,
                                                                 setSpotifyTokenInfo,
                                                               }: SpotifyCallbackIngestionTokenProducerComponentProps) {
  const [spotifyTokenInfoStringLocalStorage] = useLocalStorage<SpotifyTokenInfo | null>(
    'spotify_token',
    localStorage.getItem('spotify_token') ? JSON.parse(localStorage.getItem('spotify_token') as string) : null,
  );

  const [spotifyPkceCallbackCodeLocalStorage] = useLocalStorage<string | null>(
    'spotify_pkce_callback_code',
    localStorage.getItem('spotify_pkce_callback_code'),
  );
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    (async () => {
        if (!codeVerifier || !spotifyPkceCallbackCodeLocalStorage) return;
        const authCode = new URLSearchParams(window.location.search).get('code');
        const existingTokenInfo: SpotifyTokenInfo | null = spotifyTokenInfoStringLocalStorage ? spotifyTokenInfoStringLocalStorage : null;
        if (spotifyPkceCallbackCodeLocalStorage !== authCode && codeVerifier && authCode) {
          writeStorage('spotify_pkce_callback_code', authCode);

          const params = new URLSearchParams();
          params.append('grant_type', 'authorization_code');
          params.append('code', authCode);
          params.append('redirect_uri', redirectUri);
          params.append('client_id', clientId);
          params.append('code_verifier', codeVerifier);

          try {
            const pkceResponse = await axios.post<URLSearchParams, AxiosResponse<SpotifyToken>>('https://accounts.spotify.com/api/token', params);
            const pathToRedirectTo = saveTokenAndGetRedirectPath(pkceResponse.data, setSpotifyTokenInfo);
            history.replace(pathToRedirectTo ?? '/projects/spotify');
          } catch (e) {
            logoutOfSpotify();
          }
        } else if (!existingTokenInfo || existingTokenInfo.expiry < Date.now()) {
          if (!existingTokenInfo || !existingTokenInfo.token?.refresh_token) {
            deleteFromStorage('spotify_token');
            setSpotifyTokenInfo(null);
          } else {
            // let's refresh the token so we don't have to re-authorize the user
            await doSpotifyPkceRefresh(clientId, existingTokenInfo.token.refresh_token, setSpotifyTokenInfo);
          }
        } else
          setSpotifyTokenInfo(existingTokenInfo);
      }
    )();
    // eslint-disable-next-line
  }, [spotifyPkceCallbackCodeLocalStorage, codeVerifier, location.pathname]);


  return null;
}