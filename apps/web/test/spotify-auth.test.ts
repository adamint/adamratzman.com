import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSpotifyClientId } from '../src/components/utils/useSpotifyStore';
import {
  createPkceCodeVerifier,
  doSpotifyPkceRefresh,
} from '../src/spotify-utils/auth/SpotifyAuthUtils';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const deterministicCrypto = {
  getRandomValues<T extends ArrayBufferView>(values: T): T {
    const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    bytes.forEach((_, index) => {
      bytes[index] = index;
    });
    return values;
  },
};

describe('Spotify PKCE browser compatibility', () => {
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
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('token=private-value'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const setSpotifyTokenInfo = vi.fn();

    await expect(doSpotifyPkceRefresh(
      'public-client-id',
      'private-refresh-token',
      setSpotifyTokenInfo,
    )).resolves.toBeNull();

    expect(logSpy).not.toHaveBeenCalled();
    expect(setSpotifyTokenInfo).toHaveBeenCalledWith(null);
  });
});
