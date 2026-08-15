import axios, { AxiosResponse } from 'axios';
import { useEffect, useRef } from 'react';
import {
  doSpotifyPkceRefresh,
  logoutOfSpotify,
  saveTokenAndGetRedirectPath,
  type SetSpotifyTokenInfo,
  SpotifyToken,
  SpotifyTokenInfo,
} from './SpotifyAuthUtils';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../components/utils/useLocalStorage';

type SpotifyCallbackIngestionTokenProducerComponentProps = {
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setSpotifyTokenInfo: SetSpotifyTokenInfo;
}

export function SpotifyCallbackIngestionTokenProducerComponent({
                                                                 clientId,
                                                                 redirectUri,
                                                                 codeVerifier,
                                                                 setSpotifyTokenInfo,
                                                               }: SpotifyCallbackIngestionTokenProducerComponentProps) {
  const [spotifyTokenInfoStringLocalStorage, , deleteSpotifyTokenInfoFromLocalStorage] = useLocalStorage<SpotifyTokenInfo | null>('spotify_token');
  const [spotifyPkceCallbackCodeLocalStorage, setSpotifyPkceCallbackCodeLocalStorage] = useLocalStorage<string | null>('spotify_pkce_callback_code');
  const requestStartedRef = useRef<boolean>(false);

  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
        if (!codeVerifier || requestStartedRef.current) {
          return;
        }

        const authCode = new URLSearchParams(window.location.search).get('code');
        const existingTokenInfo: SpotifyTokenInfo | null = spotifyTokenInfoStringLocalStorage ? spotifyTokenInfoStringLocalStorage : null;
        if (spotifyPkceCallbackCodeLocalStorage !== authCode && codeVerifier && authCode) {
          setSpotifyPkceCallbackCodeLocalStorage(authCode);

          const params = new URLSearchParams();
          params.append('grant_type', 'authorization_code');
          params.append('code', authCode);
          params.append('redirect_uri', redirectUri);
          params.append('client_id', clientId);
          params.append('code_verifier', codeVerifier);

          try {
            requestStartedRef.current = true;
            const pkceResponse = await axios.post<URLSearchParams, AxiosResponse<SpotifyToken>>('https://accounts.spotify.com/api/token', params);
            const pathToRedirectTo = saveTokenAndGetRedirectPath(pkceResponse.data, setSpotifyTokenInfo);
            requestStartedRef.current = false;
            void navigate(pathToRedirectTo ?? '/projects/spotify', { replace: true });
          } catch (e) {
            console.log(e);
            logoutOfSpotify();
          }
        } else if (!existingTokenInfo || existingTokenInfo.expiry < Date.now()) {
          if (!existingTokenInfo || !existingTokenInfo.token?.refresh_token) {
            deleteSpotifyTokenInfoFromLocalStorage();
            setSpotifyTokenInfo(null);
          } else {
            // let's refresh the token so we don't have to re-authorize the user
            await doSpotifyPkceRefresh(clientId, existingTokenInfo.token.refresh_token, setSpotifyTokenInfo);
          }
        } else setSpotifyTokenInfo(existingTokenInfo);
      }
    )();
  }, [spotifyPkceCallbackCodeLocalStorage, codeVerifier, pathname]);


  return null;
}