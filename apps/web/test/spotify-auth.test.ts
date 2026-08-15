import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSpotifyClientId } from '../src/components/utils/useSpotifyStore';
import { prepareSpotifyLoginRedirect } from '../src/spotify-utils/auth/RedirectToSpotifyLogin';
import * as spotifyAuthModule from '../src/spotify-utils/auth/SpotifyAuthUtils';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const {
  createPkceCodeVerifier,
  doSpotifyPkceRefresh,
  getPkceAuthUrlFull,
  isLocalAbsolutePath,
  logoutOfSpotify,
  saveTokenAndGetRedirectPath,
} = spotifyAuthModule;

const deterministicCrypto = {
  getRandomValues<T extends ArrayBufferView>(values: T): T {
    const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    bytes.forEach((_, index) => {
      bytes[index] = index;
    });
    return values;
  },
};

type StoredSpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

type SpotifyAuthUtilsContract = {
  spotifyStorageKey: string;
  spotifyVerifierStorageKey: string;
  spotifyStateStorageKey: string;
  storeVerifier(verifier: string): void;
  getVerifier(): string;
  storeState(state: string): void;
  getState(): string;
  clearAuthorizationTransaction(): void;
  storeToken(token: StoredSpotifyToken): void;
  getToken(): StoredSpotifyToken | null;
  clearToken(): void;
  getRandomCode(length: number): string;
  getRedirectUri(): string;
  getAuthorizationUrl(
    scopes: readonly string[],
    clientId: string,
    redirectUri: string,
  ): Promise<string>;
  refreshToken(token: StoredSpotifyToken): Promise<StoredSpotifyToken | null>;
};

function getSpotifyAuthUtils(): SpotifyAuthUtilsContract {
  const authUtils: SpotifyAuthUtilsContract = spotifyAuthModule.SpotifyAuthUtils;
  expect(authUtils).toBeDefined();
  return authUtils;
}

function createStoredToken(overrides: Partial<StoredSpotifyToken> = {}): StoredSpotifyToken {
  return {
    access_token: 'access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'refresh-token',
    scope: 'playlist-read-private user-top-read',
    ...overrides,
  };
}

function installDeterministicCrypto() {
  let seed = 0;
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView>(values: T): T => {
    const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    bytes.forEach((_, index) => {
      bytes[index] = (seed + index) % 251;
    });
    seed += bytes.length;
    return values;
  });
}

describe('Spotify PKCE browser compatibility', () => {
  it('preserves pathname, search, and hash in the post-auth redirect', async () => {
    const authUtils = await import('../src/spotify-utils/auth/SpotifyAuthUtils') as typeof import('../src/spotify-utils/auth/SpotifyAuthUtils') & {
      buildSpotifyRedirectPath?: (location: {
        pathname: string;
        search: string;
        hash: string;
      }) => string;
    };

    expect(authUtils.buildSpotifyRedirectPath?.({
      pathname: '/projects/spotify/recommend/create-playlist',
      search: '?trackIds=one,two',
      hash: '#selected-tracks',
    })).toBe('/projects/spotify/recommend/create-playlist?trackIds=one,two#selected-tracks');
  });

  it.each([43, 128])('creates a verifier at the allowed %i character boundary', (length) => {
    const verifier = createPkceCodeVerifier(length, deterministicCrypto);

    expect(verifier).toHaveLength(length);
    expect(verifier).toMatch(/^[A-Za-z0-9._~-]+$/);
  });

  it.each([42, 129])('rejects verifier length %i outside the PKCE bounds', (length) => {
    expect(() => createPkceCodeVerifier(length, deterministicCrypto)).toThrow(
      'Code verifier must be between 43..128 characters long',
    );
  });

  it('fails safely when Web Crypto is unavailable', () => {
    expect(() => createPkceCodeVerifier(128, null)).toThrow(
      'The Web Crypto API is unavailable.',
    );
  });

  it('prefers the Vite-specific client id and retains the legacy public key', () => {
    expect(getSpotifyClientId({
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: 'legacy-public-id',
      VITE_SPOTIFY_CLIENT_ID: 'vite-public-id',
    })).toBe('vite-public-id');
    expect(getSpotifyClientId({
      NEXT_PUBLIC_SPOTIFY_CLIENT_ID: 'legacy-public-id',
    })).toBe('legacy-public-id');
    expect(getSpotifyClientId({})).toBe('');
  });

  it('does not log refresh failures that may contain token details', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('token=private-value'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const setSpotifyTokenInfo = vi.fn<spotifyAuthModule.SetSpotifyTokenInfo>();

    await expect(doSpotifyPkceRefresh(
      'public-client-id',
      createStoredToken({ refresh_token: 'private-refresh-token' }),
      setSpotifyTokenInfo,
    )).resolves.toBeNull();

    expect(logSpy).not.toHaveBeenCalled();
    expect(setSpotifyTokenInfo).toHaveBeenCalledWith(null);
  });

  it('merges refresh fields into the existing token without fabricated seed values', async () => {
    const existingToken = createStoredToken();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      access_token: 'new-access-token',
      token_type: 'Bearer',
      expires_in: 1800,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const setSpotifyTokenInfo = vi.fn<spotifyAuthModule.SetSpotifyTokenInfo>();

    await expect(doSpotifyPkceRefresh(
      'public-client-id',
      existingToken,
      setSpotifyTokenInfo,
    )).resolves.toEqual({
      ...existingToken,
      access_token: 'new-access-token',
      expires_in: 1800,
    });

    const savedTokenInfo = setSpotifyTokenInfo.mock.calls[0]?.[0];
    expect(savedTokenInfo?.expiry ?? 0).toBeGreaterThan(Date.now() - 1_000);
    expect(savedTokenInfo?.token).toEqual({
      ...existingToken,
      access_token: 'new-access-token',
      expires_in: 1800,
    });
  });

  it('rejects malformed initial authorization tokens before persistence', () => {
    const authUtils = getSpotifyAuthUtils();
    const setSpotifyTokenInfo = vi.fn<spotifyAuthModule.SetSpotifyTokenInfo>();

    localStorage.setItem('spotify_redirect_after_auth', '/projects/spotify');

    expect(() => saveTokenAndGetRedirectPath({
      access_token: 'new-access-token',
      token_type: 'Bearer',
      expires_in: 1800,
      scope: 'playlist-read-private user-top-read',
    }, setSpotifyTokenInfo)).toThrow();

    expect(setSpotifyTokenInfo).not.toHaveBeenCalled();
    expect(localStorage.getItem(authUtils.spotifyStorageKey)).toBeNull();
  });

  it('encodes authorization params structurally and stores the matching state transaction', async () => {
    installDeterministicCrypto();
    const authUtils = getSpotifyAuthUtils();
    const redirectUri = 'https://example.com/callback?return=/projects/spotify&label=hello world#pick-one';
    const scopes = ['playlist-read-private', 'user-read-email'];

    const url = await authUtils.getAuthorizationUrl(scopes, 'spotify-client-id', redirectUri);
    const parsed = new URL(url);
    const storedState = localStorage.getItem(authUtils.spotifyStateStorageKey);

    expect(parsed.origin).toBe('https://accounts.spotify.com');
    expect(parsed.pathname).toBe('/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('spotify-client-id');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('redirect_uri')).toBe(redirectUri);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('code_challenge')).toMatch(/^.+$/u);
    expect(parsed.searchParams.get('scope')).toBe(scopes.join(' '));
    expect(parsed.searchParams.get('state')).toBe(storedState);
    expect(storedState).toMatch(/^[A-Za-z0-9._~-]{32,}$/u);
  });

  it('persists a fresh random state for each authorization transaction', async () => {
    installDeterministicCrypto();
    const authUtils = getSpotifyAuthUtils();

    const firstUrl = await authUtils.getAuthorizationUrl(['user-read-email'], 'spotify-client-id', 'https://example.com/callback');
    const firstState = localStorage.getItem(authUtils.spotifyStateStorageKey);
    const secondUrl = await authUtils.getAuthorizationUrl(['user-read-email'], 'spotify-client-id', 'https://example.com/callback');
    const secondState = localStorage.getItem(authUtils.spotifyStateStorageKey);

    expect(firstState).not.toBeNull();
    expect(secondState).not.toBeNull();
    expect(firstState).not.toBe(secondState);
    expect(new URL(firstUrl).searchParams.get('state')).toBe(firstState);
    expect(new URL(secondUrl).searchParams.get('state')).toBe(secondState);
  });

  it('rejects an authorization URL without a non-empty state', async () => {
    await expect(getPkceAuthUrlFull(
      ['user-read-email'],
      'spotify-client-id',
      'https://example.com/callback',
      'a'.repeat(43),
      '',
    )).rejects.toThrow('OAuth state must not be empty');
  });

  it('clears invalid persisted token JSON instead of throwing', () => {
    const authUtils = getSpotifyAuthUtils();
    localStorage.setItem(authUtils.spotifyStorageKey, '{"badJson":');

    expect(authUtils.getToken()).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyStorageKey)).toBeNull();
  });

  it('clears malformed persisted token objects that fail required field validation', () => {
    const authUtils = getSpotifyAuthUtils();
    localStorage.setItem(authUtils.spotifyStorageKey, JSON.stringify({
      access_token: '',
      token_type: 'Bearer',
      expires_in: '3600',
      refresh_token: 'refresh-token',
      scope: 'user-read-email',
    }));

    expect(authUtils.getToken()).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyStorageKey)).toBeNull();
  });

  it('retains the previous refresh token when Spotify omits it during refresh', async () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'spotify-client-id');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      access_token: 'new-access-token',
      token_type: 'Bearer',
      expires_in: 1800,
      scope: 'playlist-read-private user-top-read',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const authUtils = getSpotifyAuthUtils();
    const existingToken = createStoredToken();

    authUtils.storeToken(existingToken);
    const refreshedToken = await authUtils.refreshToken(existingToken);

    expect(refreshedToken).toEqual({
      ...existingToken,
      access_token: 'new-access-token',
      expires_in: 1800,
    });
    expect(authUtils.getToken()).toEqual(refreshedToken);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://accounts.spotify.com/api/token');
    const requestInit = fetchSpy.mock.calls[0]?.[1];
    const requestBody = requestInit?.body as URLSearchParams;
    expect(requestInit?.method).toBe('POST');
    expect(requestBody.get('grant_type')).toBe('refresh_token');
    expect(requestBody.get('refresh_token')).toBe(existingToken.refresh_token);
    expect(requestBody.get('client_id')).toBe('spotify-client-id');
    expect(requestBody.get('redirect_uri')).toBe(authUtils.getRedirectUri());
  });

  it.each([
    {
      label: 'malformed JSON',
      response: new Response('{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
    {
      label: 'malformed token data',
      response: new Response(JSON.stringify({
        access_token: '',
        token_type: 'Bearer',
        expires_in: 'bad-data',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    },
  ])('clears stored auth data and returns null when refresh receives $label', async ({ response }) => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'spotify-client-id');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const authUtils = getSpotifyAuthUtils();
    const existingToken = createStoredToken();

    authUtils.storeToken(existingToken);
    authUtils.storeVerifier('spotify-verifier');
    authUtils.storeState('spotify-state-value');
    localStorage.setItem('spotify_redirect_after_auth', '/projects/spotify');
    localStorage.setItem('spotify_pkce_callback_code', JSON.stringify('callback-code'));

    await expect(authUtils.refreshToken(existingToken)).resolves.toBeNull();

    expect(localStorage.getItem(authUtils.spotifyStorageKey)).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyVerifierStorageKey)).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyStateStorageKey)).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBe(
      JSON.stringify('callback-code'),
    );
  });

  it('clears unusable auth data while preserving the callback replay marker when refresh fails', async () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'spotify-client-id');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 401 }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const authUtils = getSpotifyAuthUtils();
    const existingToken = createStoredToken();

    authUtils.storeToken(existingToken);
    authUtils.storeVerifier('spotify-verifier');
    authUtils.storeState('spotify-state-value');
    localStorage.setItem('spotify_redirect_after_auth', '/projects/spotify');
    localStorage.setItem('spotify_pkce_callback_code', JSON.stringify('callback-code'));

    await expect(authUtils.refreshToken(existingToken)).resolves.toBeNull();

    expect(logSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(authUtils.spotifyStorageKey)).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyVerifierStorageKey)).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyStateStorageKey)).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBe(
      JSON.stringify('callback-code'),
    );
  });

  it('clears token data plus verifier, state, and authorization transaction storage on logout', () => {
    const authUtils = getSpotifyAuthUtils();

    authUtils.storeToken(createStoredToken());
    authUtils.storeVerifier('spotify-verifier');
    authUtils.storeState('spotify-state-value');
    localStorage.setItem('spotify_redirect_after_auth', '/projects/spotify');
    localStorage.setItem('spotify_pkce_callback_code', 'callback-code');

    logoutOfSpotify();

    expect(localStorage.getItem(authUtils.spotifyStorageKey)).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyVerifierStorageKey)).toBeNull();
    expect(localStorage.getItem(authUtils.spotifyStateStorageKey)).toBeNull();
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBeNull();
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBeNull();
  });
});

describe('Spotify redirect validation', () => {
  it('prepares a fresh login transaction with matching state and PKCE challenge', async () => {
    const codeVerifier = 'a'.repeat(43);
    const setCodeVerifier = vi.fn();
    localStorage.setItem('spotify_pkce_callback_code', JSON.stringify('old-code'));

    const authorizationUrl = await prepareSpotifyLoginRedirect(
      codeVerifier,
      '/projects/spotify/mytop?tab=artists#top',
      setCodeVerifier,
      ['user-top-read'],
      'spotify-client-id',
      'https://example.com/projects/spotify/callback',
      'deterministic-state',
    );

    const parsedUrl = new URL(authorizationUrl);
    expect(localStorage.getItem('spotify_code_verifier')).toBe(codeVerifier);
    expect(localStorage.getItem('spotify-state')).toBe('deterministic-state');
    expect(localStorage.getItem('spotify_redirect_after_auth')).toBe(
      '/projects/spotify/mytop?tab=artists#top',
    );
    expect(localStorage.getItem('spotify_pkce_callback_code')).toBeNull();
    expect(setCodeVerifier).toHaveBeenCalledWith(codeVerifier);
    expect(parsedUrl.searchParams.get('state')).toBe('deterministic-state');
    expect(parsedUrl.searchParams.get('code_challenge')).toBe(
      await spotifyAuthModule.getCodeChallengeForCodeVerifier(codeVerifier),
    );
  });

  it.each([
    '//evil.example/steal',
    'https://evil.example/steal',
    'projects/spotify',
  ])('falls back from unsafe login redirect %s', async (redirectPathAfter) => {
    await prepareSpotifyLoginRedirect(
      'b'.repeat(43),
      redirectPathAfter,
      vi.fn(),
      [],
      'spotify-client-id',
      'https://example.com/projects/spotify/callback',
      'deterministic-state',
    );

    expect(localStorage.getItem('spotify_redirect_after_auth')).toBe(
      '/projects/spotify',
    );
  });

  it.each([
    { path: '/', accepted: true },
    { path: '/projects/spotify/mytop?tab=artists#top', accepted: true },
    { path: '//evil.example', accepted: false },
    { path: String.raw`/\evil.example`, accepted: false },
    { path: String.raw`/\/evil.example`, accepted: false },
    { path: 'https://evil.example', accepted: false },
    { path: 'projects/spotify', accepted: false },
    { path: '', accepted: false },
    { path: null, accepted: false },
  ])('returns $accepted for $path', ({ path, accepted }) => {
    expect(isLocalAbsolutePath(path)).toBe(accepted);
  });
});
