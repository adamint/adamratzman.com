import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpotifyRouteComponent } from '../src/components/projects/spotify/SpotifyRouteComponent';
import SpotifyViewMyTopRoute from '../src/routes/projects/spotify/mytop';
import { type SpotifyTokenInfo } from '../src/spotify-utils/auth/SpotifyAuthUtils';
import { renderWithRouter } from './render';

const spotifyStoreState = vi.hoisted(() => ({
  codeVerifier: undefined,
  setCodeVerifier: () => undefined,
  spotifyTokenInfo: null as SpotifyTokenInfo | null,
  setSpotifyTokenInfo: () => undefined,
  spotifyClientId: 'client-id',
  spotifyRedirectUri: () => 'https://example.com/projects/spotify/callback',
}));

vi.mock('../src/components/utils/useSpotifyStore', () => ({
  useSpotifyStore: (
    selector: (state: typeof spotifyStoreState) => unknown,
  ) => selector(spotifyStoreState),
}));

vi.mock('../src/spotify-utils/auth/SpotifyLoginButton', () => ({
  SpotifyLoginButton: ({
    redirectPathAfter,
    scopes,
  }: {
    redirectPathAfter: string;
    scopes: string[];
  }) => (
    <div
      data-redirect-path={redirectPathAfter}
      data-scopes={scopes.join(' ')}
      data-testid="spotify-login"
    />
  ),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  spotifyStoreState.spotifyTokenInfo = null;
  vi.restoreAllMocks();
});

describe('Spotify route authentication', () => {
  it('preserves the fragment in the post-auth redirect', async () => {
    renderSpotifyRoute('/projects/spotify/mytop?range=short#artists');

    expect(await screen.findByTestId('spotify-login')).toHaveAttribute(
      'data-redirect-path',
      '/projects/spotify/mytop?range=short#artists',
    );
  });

  it('preserves query and hash when mytop requires reauthorization', async () => {
    const tokenInfo: SpotifyTokenInfo = {
      expiry: Date.now() + 60_000,
      token: {
        access_token: 'access-token',
        expires_in: 3600,
        refresh_token: 'refresh-token',
        scope: 'user-library-read',
        token_type: 'Bearer',
      },
    };
    spotifyStoreState.spotifyTokenInfo = tokenInfo;
    localStorage.setItem('spotify_token', JSON.stringify(tokenInfo));

    renderWithRouter([
      {
        path: '/projects/spotify/mytop',
        Component: SpotifyViewMyTopRoute,
      },
    ], {
      initialEntries: ['/projects/spotify/mytop?tab=artists#top'],
    });

    expect(await screen.findByTestId('spotify-login')).toHaveAttribute(
      'data-redirect-path',
      '/projects/spotify/mytop?tab=artists#top',
    );
  });

  it.each([
    '/projects/spotify/recommend/create-playlist',
    '/projects/spotify/recommend/create-playlist/',
    '/PrOjEcTs/SpOtIfY/ReCoMmEnD/CrEaTe-PlAyLiSt',
  ])('requests playlist modification scopes for %s', async (pathname) => {
    renderSpotifyRoute(pathname);

    const scopes = (await screen.findByTestId('spotify-login'))
      .getAttribute('data-scopes')
      ?.split(' ');

    expect(scopes).toEqual(expect.arrayContaining([
      'playlist-modify-public',
      'playlist-modify-private',
      'playlist-read-collaborative',
    ]));
  });
});

function renderSpotifyRoute(initialEntry: string) {
  return renderWithRouter([
    {
      path: '*',
      Component: () => (
        <SpotifyRouteComponent>
          Authenticated content
        </SpotifyRouteComponent>
      ),
    },
  ], {
    initialEntries: [initialEntry],
  });
}
