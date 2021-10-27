import create from 'zustand';
import { SpotifyTokenInfo } from '../../spotify-auth/SpotifyAuthUtils';

interface SpotifyStore {
  codeVerifier?: string;
  setCodeVerifier: (newVerifier: string | undefined) => void;
  spotifyTokenInfo: SpotifyTokenInfo | null;
  setSpotifyTokenInfo: (newSpotifyTokenInfo: SpotifyTokenInfo | null) => void;
  spotifyClientId: string;
  spotifyRedirectUri: string;
}

export const useSpotifyStore = create<SpotifyStore>(set => ({
  codeVerifier: undefined,
  setCodeVerifier: (newVerifier: string | undefined) => set(state => ({ ...state, codeVerifier: newVerifier })),
  spotifyTokenInfo: null,
  setSpotifyTokenInfo: (newSpotifyTokenInfo: SpotifyTokenInfo | null) => set(state => ({
    ...state,
    spotifyTokenInfo: newSpotifyTokenInfo,
  })),
  spotifyClientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? '',
  spotifyRedirectUri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? '',
}));