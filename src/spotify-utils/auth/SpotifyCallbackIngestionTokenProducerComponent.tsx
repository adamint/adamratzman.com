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
import { useRouter } from 'next/router';

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
  const [spotifyTokenInfoStringLocalStorage, setSpotifyTokenInfoStringLocalStorage] = useLocalStorage<SpotifyTokenInfo | null>(
    'spotify_token',
    null,
  );

  const [spotifyPkceCallbackCodeLocalStorage, setSpotifyPkceCallbackCodeLocalStorage] = useLocalStorage<string | null>(
    'spotify_pkce_callback_code',
    null,
  );

  useEffect(() => {
    setSpotifyTokenInfoStringLocalStorage(localStorage.getItem('spotify_token') ? JSON.parse(localStorage.getItem('spotify_token') as string) : null);
    setSpotifyPkceCallbackCodeLocalStorage(localStorage.getItem('spotify_pkce_callback_code'));
  }, []);

  const router = useRouter();

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
            await router.replace(pathToRedirectTo ?? '/projects/spotify');
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
  }, [spotifyPkceCallbackCodeLocalStorage, codeVerifier, router.pathname]);


  return null;
}