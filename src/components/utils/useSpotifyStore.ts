import create from 'zustand';
import { SpotifyTokenInfo } from '../../spotify-utils/auth/SpotifyAuthUtils';

interface SpotifyStore {
  codeVerifier?: string;
  setCodeVerifier: (newVerifier: string | undefined) => void;
  spotifyTokenInfo: SpotifyTokenInfo | null;
  setSpotifyTokenInfo: (newSpotifyTokenInfo: SpotifyTokenInfo | null) => void;
  spotifyClientId: string;
  spotifyRedirectUri: () => string;
}

const spotifyRedirectProtocol: string = process.env.NEXT_PUBLIC_REDIRECT_PROTOCOL ?? "unknown";

export const useSpotifyStore = create<SpotifyStore>(set => ({
  codeVerifier: undefined,
  setCodeVerifier: (newVerifier: string | undefined) => set(state => ({ ...state, codeVerifier: newVerifier })),
  spotifyTokenInfo: null,
  setSpotifyTokenInfo: (newSpotifyTokenInfo: SpotifyTokenInfo | null) => set(state => ({
    ...state,
    spotifyTokenInfo: newSpotifyTokenInfo,
  })),
  spotifyClientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? '',
  spotifyRedirectUri: () => `${spotifyRedirectProtocol}://${window.location.host}/projects/spotify/callback`,
}));
