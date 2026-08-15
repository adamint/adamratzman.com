import { Sha256 } from '@aws-crypto/sha256-browser';
import SpotifyWebApi from 'spotify-web-api-js';
import { z } from 'zod';

export interface PkceGuardedSpotifyWebApiJs {
  getApi: () => Promise<SpotifyWebApi.SpotifyWebApiJs>;
}

export type SetCodeVerifier = (newVerifier: string | null | undefined) => void;
export type SetSpotifyTokenInfo = (newSpotifyTokenInfo: SpotifyTokenInfo | null) => void;
export const spotifyStorageKey = 'spotify_token';
export const spotifyVerifierStorageKey = 'spotify_code_verifier';
export const spotifyStateStorageKey = 'spotify-state';

const spotifyRedirectAfterAuthStorageKey = 'spotify_redirect_after_auth';
const spotifyPkceCallbackCodeStorageKey = 'spotify_pkce_callback_code';
const minimumSpotifyStateLength = 32;

export type StoredSpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  [key: string]: unknown;
};

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().finite().nonnegative(),
  refresh_token: z.string().min(1),
  scope: z.string(),
}).catchall(z.unknown());

const refreshTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().finite().nonnegative(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
}).catchall(z.unknown());

const tokenInfoSchema = z.object({
  expiry: z.number().finite(),
  token: tokenSchema,
});

type PersistedSpotifyTokenInfo = z.infer<typeof tokenInfoSchema>;
type SpotifyRefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

export function buildSpotifyRedirectPath(location: {
  pathname: string;
  search: string;
  hash: string;
}) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function isLocalAbsolutePath(candidate: string | null): candidate is string {
  return candidate !== null && /^\/(?![/\\])/u.test(candidate);
}

const pkceCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function createPkceCodeVerifier(
  length: number = 128,
  cryptoApi: Pick<Crypto, 'getRandomValues'> | null = globalThis.crypto,
) {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier must be between 43..128 characters long');
  }

  if (!cryptoApi?.getRandomValues) {
    throw new Error('The Web Crypto API is unavailable.');
  }

  const randomValues = new Uint8Array(length);
  cryptoApi.getRandomValues(randomValues);

  return Array.from(randomValues, value => pkceCharacters[value % pkceCharacters.length]).join('');
}

function getSpotifyClientIdFromEnv() {
  const env = import.meta.env as {
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID?: string;
    VITE_SPOTIFY_CLIENT_ID?: string;
  };

  return env.VITE_SPOTIFY_CLIENT_ID
    ?? env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    ?? '';
}

function removeStoredTokenOnly() {
  localStorage.removeItem(spotifyStorageKey);
}

function getSpotifyTokenInfoFromToken(token: StoredSpotifyToken): PersistedSpotifyTokenInfo {
  return {
    expiry: Date.now() + token.expires_in * 1000,
    token,
  };
}

function getStoredTokenInfo(): PersistedSpotifyTokenInfo | null {
  const storedValue = localStorage.getItem(spotifyStorageKey);
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    const parsedTokenInfo = tokenInfoSchema.safeParse(parsedValue);
    if (parsedTokenInfo.success) {
      return parsedTokenInfo.data;
    }
  } catch {
    removeStoredTokenOnly();
    return null;
  }

  removeStoredTokenOnly();
  return null;
}

function buildAuthorizationUrl(
  scopes: readonly string[],
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
  state: string | null,
) {
  return getCodeChallengeForCodeVerifier(codeVerifier).then(codeChallenge => {
    const url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);

    if (state) {
      url.searchParams.set('state', state);
    }

    if (scopes.length > 0) {
      url.searchParams.set('scope', scopes.join(' '));
    }

    return url.toString();
  });
}

function getRefreshSeedToken(refreshToken: string): StoredSpotifyToken {
  const existingToken = getStoredTokenInfo()?.token;
  return {
    ...existingToken,
    access_token: existingToken?.access_token ?? 'refresh-seed-token',
    token_type: existingToken?.token_type ?? 'Bearer',
    expires_in: existingToken?.expires_in ?? 0,
    refresh_token: refreshToken,
    scope: existingToken?.scope ?? '',
  };
}

function mergeStoredToken(
  responseBody: unknown,
  currentToken: StoredSpotifyToken,
): StoredSpotifyToken | null {
  const parsedResponse = refreshTokenResponseSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    return null;
  }

  const responseToken: SpotifyRefreshTokenResponse = parsedResponse.data;
  const mergedToken = {
    ...currentToken,
    ...responseToken,
    refresh_token: responseToken.refresh_token ?? currentToken.refresh_token,
    scope: responseToken.scope ?? currentToken.scope,
  };

  const parsedToken = tokenSchema.safeParse(mergedToken);
  return parsedToken.success
    ? parsedToken.data as StoredSpotifyToken
    : null;
}

async function requestSpotifyTokenRefresh(
  currentToken: StoredSpotifyToken,
  clientId: string,
  redirectUri: string,
): Promise<StoredSpotifyToken | null> {
  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', currentToken.refresh_token);
  params.set('client_id', clientId);
  params.set('redirect_uri', redirectUri);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      SpotifyAuthUtils.clearToken();
      return null;
    }

    const responseBody: unknown = await response.json().catch(() => null);
    const mergedToken = mergeStoredToken(responseBody, currentToken);

    if (!mergedToken) {
      SpotifyAuthUtils.clearToken();
      return null;
    }

    SpotifyAuthUtils.storeToken(mergedToken);
    return mergedToken;
  } catch {
    SpotifyAuthUtils.clearToken();
    return null;
  }
}

export const SpotifyAuthUtils = {
  spotifyStorageKey,
  spotifyVerifierStorageKey,
  spotifyStateStorageKey,

  storeVerifier(verifier: string) {
    localStorage.setItem(spotifyVerifierStorageKey, verifier);
  },
  getVerifier() {
    return localStorage.getItem(spotifyVerifierStorageKey) ?? '';
  },
  storeState(state: string) {
    localStorage.setItem(spotifyStateStorageKey, state);
  },
  getState() {
    return localStorage.getItem(spotifyStateStorageKey) ?? '';
  },
  clearAuthorizationTransaction() {
    localStorage.removeItem(spotifyVerifierStorageKey);
    localStorage.removeItem(spotifyStateStorageKey);
    localStorage.removeItem(spotifyRedirectAfterAuthStorageKey);
    localStorage.removeItem(spotifyPkceCallbackCodeStorageKey);
  },
  storeToken(token: StoredSpotifyToken) {
    localStorage.setItem(spotifyStorageKey, JSON.stringify(getSpotifyTokenInfoFromToken(token)));
  },
  getToken() {
    return getStoredTokenInfo()?.token ?? null;
  },
  getTokenInfo() {
    const token = SpotifyAuthUtils.getToken();
    if (!token) {
      return null;
    }

    const tokenInfo = getStoredTokenInfo();
    return tokenInfo
      ? {
        expiry: tokenInfo.expiry,
        token,
      }
      : null;
  },
  clearToken() {
    removeStoredTokenOnly();
    SpotifyAuthUtils.clearAuthorizationTransaction();
  },
  getRandomCode(length: number) {
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error('The Web Crypto API is unavailable.');
    }

    const randomValues = new Uint8Array(length);
    globalThis.crypto.getRandomValues(randomValues);
    return Array.from(randomValues, value => pkceCharacters[value % pkceCharacters.length]).join('');
  },
  getRedirectUri() {
    return `${window.location.protocol}//${window.location.host}/projects/spotify/callback`;
  },
  async getAuthorizationUrl(scopes: readonly string[], clientId: string, redirectUri: string) {
    const verifier = createPkceCodeVerifier();
    const state = SpotifyAuthUtils.getRandomCode(minimumSpotifyStateLength);
    SpotifyAuthUtils.storeVerifier(verifier);
    SpotifyAuthUtils.storeState(state);
    return buildAuthorizationUrl(scopes, clientId, redirectUri, verifier, state);
  },
  async refreshToken(token: StoredSpotifyToken) {
    return requestSpotifyTokenRefresh(token, getSpotifyClientIdFromEnv(), SpotifyAuthUtils.getRedirectUri());
  },
};

export function useSpotifyWebApiGuardValidPkceToken(
  clientId: string,
  spotifyTokenInfo: SpotifyTokenInfo | null,
  setSpotifyTokenInfo: SetSpotifyTokenInfo,
): PkceGuardedSpotifyWebApiJs {
  const spotifyApi = new SpotifyWebApi();

  return {
    async getApi(): Promise<SpotifyWebApi.SpotifyWebApiJs> {
      if (spotifyTokenInfo !== null) {
        if (spotifyTokenInfo.expiry < Date.now()) {
          if (spotifyTokenInfo.token.refresh_token) {
            const token = await doSpotifyPkceRefresh(clientId, spotifyTokenInfo.token.refresh_token, setSpotifyTokenInfo);
            if (token) spotifyApi.setAccessToken(token.access_token);
            else spotifyApi.setAccessToken(null);
          } else {
            setSpotifyTokenInfo(null);
            spotifyApi.setAccessToken(null);
          }
        } else spotifyApi.setAccessToken(spotifyTokenInfo.token.access_token);
      }

      return spotifyApi;
    },
  };
}


export async function getPkceAuthUrlFull(scopes: string[], clientId: string, redirectUri: string, codeVerifier: string, state: string | null): Promise<string> {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) throw new Error('Code verifier must be between 43..128 characters long');
  return buildAuthorizationUrl(scopes, clientId, redirectUri, codeVerifier, state);
}

export async function getCodeChallengeForCodeVerifier(codeVerifier: string): Promise<string> {
  const hash = new Sha256();
  hash.update(codeVerifier);
  const result = await hash.digest();
  return btoa(String.fromCharCode(...result))
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');
}

export function logoutOfSpotify() {
  SpotifyAuthUtils.clearToken();
}

export async function doSpotifyPkceRefresh(
  clientId: string,
  refreshToken: string,
  setSpotifyTokenInfo: SetSpotifyTokenInfo,
): Promise<SpotifyToken | null> {
  const refreshedToken = await requestSpotifyTokenRefresh(getRefreshSeedToken(refreshToken), clientId, SpotifyAuthUtils.getRedirectUri());

  if (!refreshedToken) {
    setSpotifyTokenInfo(null);
    return null;
  }

  setSpotifyTokenInfo(getSpotifyTokenInfoFromToken(refreshedToken));
  return refreshedToken;
}

export function saveTokenAndGetRedirectPath(
  token: SpotifyToken,
  setSpotifyTokenInfo: SetSpotifyTokenInfo,
) {
  const tokenInfo: SpotifyTokenInfo = {
    expiry: Date.now() + token.expires_in * 1000,
    token,
  };

  localStorage.setItem(spotifyStorageKey, JSON.stringify(tokenInfo));
  setSpotifyTokenInfo(tokenInfo);

  const pathToRedirectTo = localStorage.getItem(spotifyRedirectAfterAuthStorageKey);
  localStorage.removeItem(spotifyRedirectAfterAuthStorageKey);
  return pathToRedirectTo;
}

export type SpotifyTokenInfo = {
  expiry: number;
  token: SpotifyToken
}

export type SpotifyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string | null;
  scope?: string | null;
  [key: string]: unknown;
}