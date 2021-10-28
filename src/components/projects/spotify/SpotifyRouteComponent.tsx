import { SpotifyCallbackIngestionTokenProducerComponent } from '../../../spotify-utils/auth/SpotifyCallbackIngestionTokenProducerComponent';
import { SpotifyLoginButton } from '../../../spotify-utils/auth/SpotifyLoginButton';
import { useSpotifyStore } from '../../utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type SpotifyRouteComponentProps = {
  children: any;
  title?: string;
}

export function SpotifyRouteComponent({ title, children }: SpotifyRouteComponentProps) {
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyTokenInfo, state.setSpotifyTokenInfo], shallow);
  const spotifyClientId = useSpotifyStore(state => state.spotifyClientId);
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const [shouldRender, setShouldRender] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setShouldRender(true);
  }, []);

  function buildSpotifyScopes(baseScopes: string[]) {
    const scopes = [...baseScopes];
    switch (router.pathname) {
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
                                                    redirectUri={spotifyRedirectUri}
                                                    codeVerifier={codeVerifier} />

    {spotifyTokenInfo ? <>
      {children}
    </> : <>
      <SpotifyLoginButton
        scopes={buildSpotifyScopes(['user-library-read', 'user-top-read', 'user-read-recently-played', 'user-read-playback-position'])}
        clientId={spotifyClientId}
        redirectUri={spotifyRedirectUri}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={router.asPath}
        buttonText='Log in with Spotify to view this page'
        title={title}
      />
    </>}
  </>;
}

