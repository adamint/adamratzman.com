import { vi } from 'vitest';
import type { SpotifyClient } from '../src/spotify/client.js';

function createUnexpectedSpotifyMock<
  Method extends (...args: never[]) => Promise<{ body: unknown }>
>() {
  return vi.fn<Method>((async (...args: Parameters<Method>) => {
    void args;
    await Promise.resolve();
    throw new Error('Unexpected Spotify call');
  }) as unknown as Method);
}

export function createFakeSpotifyClient() {
  return {
    getAvailableGenreSeeds: createUnexpectedSpotifyMock<SpotifyClient['getAvailableGenreSeeds']>(),
    getPlaylistTracks: createUnexpectedSpotifyMock<SpotifyClient['getPlaylistTracks']>(),
    getRecommendations: createUnexpectedSpotifyMock<SpotifyClient['getRecommendations']>(),
    getUserPlaylists: createUnexpectedSpotifyMock<SpotifyClient['getUserPlaylists']>(),
    searchArtists: createUnexpectedSpotifyMock<SpotifyClient['searchArtists']>(),
    searchTracks: createUnexpectedSpotifyMock<SpotifyClient['searchTracks']>(),
    getCategories: createUnexpectedSpotifyMock<SpotifyClient['getCategories']>(),
    getCategory: createUnexpectedSpotifyMock<SpotifyClient['getCategory']>(),
    getPlaylistsForCategory: createUnexpectedSpotifyMock<SpotifyClient['getPlaylistsForCategory']>(),
    getTrack: createUnexpectedSpotifyMock<SpotifyClient['getTrack']>(),
    getArtist: createUnexpectedSpotifyMock<SpotifyClient['getArtist']>(),
    getArtistTopTracks: createUnexpectedSpotifyMock<SpotifyClient['getArtistTopTracks']>(),
    getArtistAlbums: createUnexpectedSpotifyMock<SpotifyClient['getArtistAlbums']>(),
    getArtistRelatedArtists: createUnexpectedSpotifyMock<SpotifyClient['getArtistRelatedArtists']>(),
    getUser: createUnexpectedSpotifyMock<SpotifyClient['getUser']>(),
    getPlaylist: createUnexpectedSpotifyMock<SpotifyClient['getPlaylist']>(),
  } satisfies SpotifyClient;
}

export type FakeSpotifyClient = ReturnType<typeof createFakeSpotifyClient>;
