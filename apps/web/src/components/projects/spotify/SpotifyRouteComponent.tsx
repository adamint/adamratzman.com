import { SpotifyCallbackIngestionTokenProducerComponent } from '../../../spotify-utils/auth/SpotifyCallbackIngestionTokenProducerComponent';
import { SpotifyLoginButton } from '../../../spotify-utils/auth/SpotifyLoginButton';
import { useSpotifyStore } from '../../utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

type SpotifyRouteComponentProps = {
  children: ReactNode;
  title?: string;
}

export function SpotifyRouteComponent({ title, children }: SpotifyRouteComponentProps) {
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyTokenInfo, state.setSpotifyTokenInfo], shallow);
  const spotifyClientId = useSpotifyStore(state => state.spotifyClientId);
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [shouldRender, setShouldRender] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setShouldRender(true);
  }, []);

  function buildSpotifyScopes(baseScopes: string[]) {
    const scopes = [...baseScopes];
    switch (location.pathname) {
      case '/projects/spotify/mytop':
        scopes.push('user-top-read');
        break;
      case '/projects/spotify/recommend/create-playlist':
        scopes.push('playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative', 'user-top-read');
        break;
      default:
        break;
    }

    return scopes;
  }

  if (!shouldRender) return null;

  return <>
    <SpotifyCallbackIngestionTokenProducerComponent setSpotifyTokenInfo={setSpotifyTokenInfo}
                                                    clientId={spotifyClientId}
                                                    redirectUri={spotifyRedirectUri()}
                                                    codeVerifier={codeVerifier} />

    {spotifyTokenInfo ? <>
      {children}
    </> : <>
      <SpotifyLoginButton
        scopes={buildSpotifyScopes(['user-library-read', 'user-top-read', 'user-read-recently-played', 'user-read-playback-position'])}
        clientId={spotifyClientId}
        redirectUri={spotifyRedirectUri()}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={`${location.pathname}${location.search}`}
        buttonText='Log in with Spotify to view this page'
        title={title}
      />
    </>}
  </>;
}
