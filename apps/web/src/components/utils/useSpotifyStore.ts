import { create } from 'zustand';
import { type SetCodeVerifier, SpotifyTokenInfo } from '../../spotify-utils/auth/SpotifyAuthUtils';

interface SpotifyStore {
  codeVerifier?: string;
  setCodeVerifier: SetCodeVerifier;
  spotifyTokenInfo: SpotifyTokenInfo | null;
  setSpotifyTokenInfo: (newSpotifyTokenInfo: SpotifyTokenInfo | null) => void;
  spotifyClientId: string;
  spotifyRedirectUri: () => string;
}

type SpotifyClientEnvironment = {
  NEXT_PUBLIC_SPOTIFY_CLIENT_ID?: string;
  VITE_SPOTIFY_CLIENT_ID?: string;
};

export function getSpotifyClientId(env?: SpotifyClientEnvironment) {
  const viteEnv = env ?? (import.meta.env as SpotifyClientEnvironment);
  return viteEnv.VITE_SPOTIFY_CLIENT_ID
    ?? viteEnv.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    ?? '';
}

export const useSpotifyStore = create<SpotifyStore>(set => ({
  codeVerifier: undefined,
  setCodeVerifier: (newVerifier) => set(state => ({ ...state, codeVerifier: newVerifier ?? undefined })),
  spotifyTokenInfo: null,
  setSpotifyTokenInfo: (newSpotifyTokenInfo: SpotifyTokenInfo | null) => set(state => ({
    ...state,
    spotifyTokenInfo: newSpotifyTokenInfo,
  })),
  spotifyClientId: getSpotifyClientId(),
  spotifyRedirectUri: () => `${window.location.protocol}//${window.location.host}/projects/spotify/callback`,
}));
