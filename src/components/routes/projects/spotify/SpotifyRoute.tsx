import { useState } from 'react';
import { Redirect, Route, Switch, useLocation } from 'react-router-dom';
import { SpotifyGenreListRoute } from './SpotifyGenreListRoute';
import { NotFoundRoute } from '../../NotFoundRoute';
import { SpotifyLoginButton } from '../../../../spotify-auth/SpotifyLoginButton';
import { SpotifyCallbackIngestionTokenProducerComponent } from '../../../../spotify-auth/SpotifyCallbackIngestionTokenProducerComponent';
import SpotifyWebApi from 'spotify-web-api-js';
import { SpotifyCategoryViewRoute } from './SpotifyCategoryViewRoute';
import { SpotifyViewAllCategoriesRoute } from './SpotifyViewAllCategoriesRoute';
import { SpotifyViewMyTop } from './SpotifyViewMyTop';
import { SpotifyGenerateTokenRoute } from './SpotifyGenerateTokenRoute';
import { RequireSpotifyScopesOrElseShowLogin } from '../../../../spotify-auth/RequireSpotifyScopesOrElseShowLogin';
import { SpotifyCallbackRoute } from './SpotifyCallbackRoute';
import { SpotifyTrackViewRoute } from './SpotifyTrackViewRoute';
import { SpotifyArtistViewRoute } from './SpotifyArtistViewRoute';
import { SpotifyPlaylistGeneratorRoute } from './playlist_generator/SpotifyPlaylistGeneratorRoute';
import { SpotifyTokenInfo } from '../../../../spotify-auth/SpotifyAuthUtils';

export const spotifyClientId: string = process.env.REACT_APP_SPOTIFY_CLIENT_ID ?? '';
export const spotifyRedirectUri = process.env.REACT_APP_SPOTIFY_REDIRECT_URI ?? '';

export type SpotifyRouteProps = {
  spotifyApi: SpotifyWebApi.SpotifyWebApiJs;
  setSpotifyTokenInfo: Function
}

export function SpotifyRoute() {
  const [codeVerifier, setCodeVerifier] = useState<string>();

  const [spotifyTokenInfo, setSpotifyTokenInfo] = useState<SpotifyTokenInfo | null>(null);
  const [spotifyApi] = useState(new SpotifyWebApi());
  const location = useLocation();

  if (spotifyTokenInfo !== null) spotifyApi.setAccessToken(spotifyTokenInfo.token.access_token);

  function buildSpotifyScopes(baseScopes: string[]) {
    const scopes = [...baseScopes];
    switch (location.pathname) {
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
      <Switch>
        <Route exact path='/projects/spotify/genres/list'>
          <SpotifyGenreListRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
        </Route>
        <Route exact path='/projects/spotify/mytop'>
          <RequireSpotifyScopesOrElseShowLogin requiredScopes={['user-top-read']}
                                               clientId={spotifyClientId}
                                               redirectUri={spotifyRedirectUri}
                                               codeVerifier={codeVerifier}
                                               setCodeVerifier={setCodeVerifier}
                                               redirectPathAfter='/projects/spotify/mytop'
                                               spotifyToken={spotifyTokenInfo.token}>
            <SpotifyViewMyTop spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
          </RequireSpotifyScopesOrElseShowLogin>
        </Route>
        <Route exact path='/projects/spotify/categories'>
          <SpotifyViewAllCategoriesRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
        </Route>
        <Route exact path='/projects/spotify/recommend'>
          <RequireSpotifyScopesOrElseShowLogin
            requiredScopes={['playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative']}
            clientId={spotifyClientId}
            redirectUri={spotifyRedirectUri}
            codeVerifier={codeVerifier}
            setCodeVerifier={setCodeVerifier}
            redirectPathAfter='/projects/spotify/recommend'
            spotifyToken={spotifyTokenInfo.token}>
            <SpotifyPlaylistGeneratorRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
          </RequireSpotifyScopesOrElseShowLogin>
        </Route>
        <Route exact path='/projects/spotify/generate-token'>
          <SpotifyGenerateTokenRoute spotifyTokenInfo={spotifyTokenInfo}
                                     setSpotifyTokenInfo={setSpotifyTokenInfo}
                                     codeVerifier={codeVerifier}
                                     setCodeVerifier={setCodeVerifier} />
        </Route>
        <Route exact path='/projects/spotify/categories/:categoryId'>
          <SpotifyCategoryViewRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
        </Route>
        <Route exact path='/projects/spotify/tracks/:trackId'>
          <SpotifyTrackViewRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
        </Route>
        <Route exact path='/projects/spotify/artists/:artistId'>
          <SpotifyArtistViewRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
        </Route>
        <Route exact path='/projects/spotify/callback'>
          <SpotifyCallbackRoute />
        </Route>
        <Route exact path='/projects/spotify'>
          <Redirect to='/projects' />
        </Route>
        <Route>
          <NotFoundRoute goBackPathName='the projects homepage' goBackPath='/projects' />
        </Route>
      </Switch>
    </> : <>
      <SpotifyLoginButton
        scopes={buildSpotifyScopes(['user-library-read', 'user-top-read', 'user-read-recently-played', 'user-read-playback-position'])}
        clientId={spotifyClientId}
        redirectUri={spotifyRedirectUri}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={location.pathname}
        title='Log in with Spotify to view this page'
      />
    </>}

  </>;
}

