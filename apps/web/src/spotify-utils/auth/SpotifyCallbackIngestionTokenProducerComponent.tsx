import axios, { AxiosResponse } from 'axios';
import { Alert, AlertIcon } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import {
  doSpotifyPkceRefresh,
  isLocalAbsolutePath,
  saveTokenAndGetRedirectPath,
  type SetCodeVerifier,
  type SetSpotifyTokenInfo,
  spotifyAuthStorageKeys,
  SpotifyAuthUtils,
  SpotifyToken,
} from './SpotifyAuthUtils';
import { useLocation, useNavigate } from 'react-router-dom';

type SpotifyCallbackIngestionTokenProducerComponentProps = {
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  setCodeVerifier: SetCodeVerifier;
  setSpotifyTokenInfo: SetSpotifyTokenInfo;
}

export function SpotifyCallbackIngestionTokenProducerComponent({
                                                                 clientId,
                                                                 redirectUri,
                                                                 codeVerifier,
                                                                 setCodeVerifier,
                                                                 setSpotifyTokenInfo,
                                                               }: SpotifyCallbackIngestionTokenProducerComponentProps) {
  const [callbackFailed, setCallbackFailed] = useState(false);
  const ownedCallbackRef = useRef<string | null>(null);

  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
        const query = new URLSearchParams(search);
        const authCode = query.get('code');
        const callbackState = query.get('state');
        const providerError = query.get('error');
        const hasCallbackResponse = query.has('code')
          || query.has('state')
          || query.has('error');

        if (!hasCallbackResponse) {
          const existingTokenInfo = SpotifyAuthUtils.getTokenInfo();
          if (!existingTokenInfo) {
            setSpotifyTokenInfo(null);
          } else if (existingTokenInfo.expiry < Date.now()) {
            await doSpotifyPkceRefresh(
              clientId,
              existingTokenInfo.token,
              setSpotifyTokenInfo,
            );
          } else {
            setSpotifyTokenInfo(existingTokenInfo);
          }
          return;
        }

        if (ownedCallbackRef.current === search) {
          return;
        }
        ownedCallbackRef.current = search;
        setCallbackFailed(false);

        if (authCode && getConsumedCallbackCode() === authCode) {
          return;
        }
        if (authCode) {
          consumeCallbackCode(authCode);
        }

        const resolvedCodeVerifier = codeVerifier || SpotifyAuthUtils.getVerifier();
        const storedState = SpotifyAuthUtils.getState();
        if (
          providerError
          || !authCode
          || !callbackState
          || !storedState
          || callbackState !== storedState
          || !resolvedCodeVerifier
        ) {
          clearCallbackTransaction(setCodeVerifier);
          setCallbackFailed(true);
          return;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', authCode);
        params.append('redirect_uri', redirectUri);
        params.append('client_id', clientId);
        params.append('code_verifier', resolvedCodeVerifier);

        try {
          const pkceResponse = await axios.post<URLSearchParams, AxiosResponse<SpotifyToken>>('https://accounts.spotify.com/api/token', params);
          const pathToRedirectTo = saveTokenAndGetRedirectPath(pkceResponse.data, setSpotifyTokenInfo);
          clearCallbackTransaction(setCodeVerifier);
          const destination = isLocalAbsolutePath(pathToRedirectTo)
            ? pathToRedirectTo
            : '/projects/spotify';
          await navigate(destination, { replace: true });
        } catch {
          clearCallbackTransaction(setCodeVerifier);
          setCallbackFailed(true);
        }
      }
    )();
  }, [
    clientId,
    codeVerifier,
    navigate,
    pathname,
    redirectUri,
    search,
    setCodeVerifier,
    setSpotifyTokenInfo,
  ]);

  return callbackFailed
    ? <Alert status="error"><AlertIcon />Spotify sign-in could not be completed</Alert>
    : null;
}

function clearCallbackTransaction(setCodeVerifier: SetCodeVerifier) {
  localStorage.removeItem(spotifyAuthStorageKeys.verifier);
  localStorage.removeItem(spotifyAuthStorageKeys.state);
  localStorage.removeItem(spotifyAuthStorageKeys.redirectAfterAuth);
  setCodeVerifier(null);
}

function consumeCallbackCode(authCode: string) {
  localStorage.setItem(spotifyAuthStorageKeys.consumedCallbackCode, JSON.stringify(authCode));
}

function getConsumedCallbackCode() {
  const storedCode = localStorage.getItem(spotifyAuthStorageKeys.consumedCallbackCode);
  if (!storedCode) {
    return null;
  }

  try {
    const parsedCode: unknown = JSON.parse(storedCode);
    return typeof parsedCode === 'string' ? parsedCode : null;
  } catch {
    return storedCode;
  }
}