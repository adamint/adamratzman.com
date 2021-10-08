import { useState } from 'react';
import { Route, Switch, useLocation } from 'react-router-dom';
import { SpotifyGenreListRoute } from './SpotifyGenreListRoute';
import { NotFoundRoute } from '../../NotFoundRoute';
import { SpotifyLoginButton } from '../../../../spotify-auth/SpotifyLoginButton';
import { SpotifyCallbackIngestionTokenProducerComponent } from '../../../../spotify-auth/SpotifyCallbackIngestionTokenProducerComponent';
import SpotifyWebApi from 'spotify-web-api-js';

export function SpotifyRoute() {
  const [codeVerifier, setCodeVerifier] = useState();
  const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_SPOTIFY_REDIRECT_URI;

  const [spotifyTokenInfo, setSpotifyTokenInfo] = useState(null);
  const [spotifyApi] = useState(new SpotifyWebApi());
  const location = useLocation();

  if (spotifyTokenInfo !== null) spotifyApi.setAccessToken(spotifyTokenInfo.token.access_token);

  return <>
    <SpotifyCallbackIngestionTokenProducerComponent setSpotifyTokenInfo={setSpotifyTokenInfo}
                                                    clientId={clientId}
                                                    redirectUri={redirectUri}
                                                    codeVerifier={codeVerifier} />

    {spotifyTokenInfo ? <>
      <Switch>
        <Route exact path='/projects/spotify/genres/list'>
          <SpotifyGenreListRoute spotifyApi={spotifyApi} setSpotifyTokenInfo={setSpotifyTokenInfo} />
        </Route>
        <Route>
          <NotFoundRoute goBackPathName='the projects homepage' goBackPath='/projects' />
        </Route>
      </Switch>


      {/*        <p>You are authorized with token: {spotifyToken}</p>*/}
    </> : <>
      <SpotifyLoginButton
        scopes={['user-library-read', 'user-top-read', 'user-read-recently-played', 'user-read-playback-position']}
        clientId={clientId}
        redirectUri={redirectUri}
        codeVerifier={codeVerifier}
        setCodeVerifier={setCodeVerifier}
        redirectPathAfter={location.pathname}
        title='Log in with Spotify to view this page'
      />
    </>}

  </>;
}