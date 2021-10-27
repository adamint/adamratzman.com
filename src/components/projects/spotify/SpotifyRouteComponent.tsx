import { SpotifyCallbackIngestionTokenProducerComponent } from '../../../spotify-auth/SpotifyCallbackIngestionTokenProducerComponent';
import { SpotifyLoginButton } from '../../../spotify-auth/SpotifyLoginButton';
import { useSpotifyStore } from '../../utils/useSpotifyStore';
import shallow from 'zustand/shallow';
import { useRouter } from 'next/router';

type SpotifyRouteComponentProps = {
  children: any;
}

export function SpotifyRouteComponent({ children }: SpotifyRouteComponentProps) {
  const [codeVerifier, setCodeVerifier] = useSpotifyStore(state => [state.codeVerifier, state.setCodeVerifier], shallow);
  const [spotifyTokenInfo, setSpotifyTokenInfo] = useSpotifyStore(state => [state.spotifyTokenInfo, state.setSpotifyTokenInfo], shallow);
  const spotifyClientId = useSpotifyStore(state => state.spotifyClientId);
  const spotifyRedirectUri = useSpotifyStore(state => state.spotifyRedirectUri);
  const router = useRouter();

  function buildSpotifyScopes(baseScopes: string[]) {
    const scopes = [...baseScopes];
    switch (router.pathname) {
      case '/projects/spotify/mytop':
        scopes.push('user-top-read');
        break;
      case '/projects/spotify/recommend':
        scopes.push('playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative');
        break;
      default:
        break;
    }

    return scopes;
  }

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
        redirectPathAfter={router.pathname}
        title='Log in with Spotify to view this page'
      />
    </>}

  </>;
}

