import { useHistory } from 'react-router-dom';
import axios, { AxiosResponse } from 'axios';
import { useEffect } from 'react';
import { logoutOfSpotify, SpotifyToken } from './SpotifyAuthUtils';

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
  useEffect(() => {
    const existingTokenInfoString = localStorage.getItem('spotify_token');

    const existingTokenInfo = existingTokenInfoString ? JSON.parse(existingTokenInfoString) : null;
    if (!existingTokenInfo || existingTokenInfo.expiry < Date.now()) {
      localStorage.removeItem('spotify_token');
    } else setSpotifyTokenInfo(existingTokenInfo);
    // eslint-disable-next-line
  }, []);

  const history = useHistory();
  const authCode = new URLSearchParams(window.location.search).get('code');
  if (localStorage.getItem('spotify_pkce_callback_code') !== authCode && codeVerifier && authCode) {
    localStorage.setItem('spotify_pkce_callback_code', authCode);

    (async () => {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', authCode);
      params.append('redirect_uri', redirectUri);
      params.append('client_id', clientId);
      params.append('code_verifier', codeVerifier);

      try {
        const pkceResponse = await axios.post<URLSearchParams, AxiosResponse<SpotifyToken>>('https://accounts.spotify.com/api/token', params);
        const tokenInfo = {
          expiry: Date.now() + pkceResponse.data.expires_in * 1000,
          token: pkceResponse.data,
        };

        localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));
        setSpotifyTokenInfo(tokenInfo);

        localStorage.removeItem('spotify_pkce_callback_code');
        const pathToRedirectTo = localStorage.getItem('spotify_redirect_after_auth');
        localStorage.removeItem('spotify_redirect_after_auth');
        history.replace(pathToRedirectTo ?? '/projects/spotify');
      } catch (e) {
        logoutOfSpotify();
      }
    })();
  }

  return null;
}