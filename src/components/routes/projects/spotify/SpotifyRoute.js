import { useState } from 'react';
import Cookies from 'js-cookie';
import { SpotifyApiContext } from 'react-spotify-api';
import { Scopes, SpotifyAuth } from 'react-spotify-auth';
import { Route, Switch, useLocation } from 'react-router-dom';
import { SpotifyGenreListRoute } from './SpotifyGenreListRoute';
import { NotFoundRoute } from '../../NotFoundRoute';

export function SpotifyRoute() {
  const [spotifyToken, setSpotifyToken] = useState(Cookies.get('spotifyAuthToken'));
  const [redirectPath, setRedirectPath] = useState(null);
  const location = useLocation();

  //if (!spotifyToken)

  return <>
    {spotifyToken ? (
      <SpotifyApiContext.Provider value={spotifyToken}>
        <Switch>
          <Route exact path='/projects/spotify/genre-list'>
            <SpotifyGenreListRoute spotifyToken={spotifyToken} />
          </Route>
          <Route>
            <NotFoundRoute />
          </Route>
        </Switch>


        <p>You are authorized with token: {spotifyToken}</p>
      </SpotifyApiContext.Provider>
    ) : (
      // Display the login page
      <SpotifyAuth
        redirectUri={process.env.REACT_APP_SPOTIFY_REDIRECT_URI}
        clientID={process.env.REACT_APP_SPOTIFY_CLIENT_ID}
        scopes={[Scopes.userReadPrivate, 'user-read-email']}
        onAccessToken={token => setSpotifyToken(token)}
      />
    )}

  </>;
}