import { vi } from 'vitest';

type SpotifyResponse<Body = unknown> = Promise<{ body: Body }>;
type SearchOptions = Record<string, unknown>;
type PaginationOptions = { limit?: number; offset?: number };

type FakeSpotifyClientMethods = {
  getAvailableGenreSeeds: () => SpotifyResponse<{ genres: string[] }>;
  getPlaylistTracks: (playlistId: string, options?: PaginationOptions) => SpotifyResponse;
  getRecommendations: (options?: Record<string, unknown>) => SpotifyResponse;
  getUserPlaylists: (userId: string, options?: PaginationOptions) => SpotifyResponse;
  searchArtists: (query: string, options?: SearchOptions) => SpotifyResponse<{ artists: unknown }>;
  searchTracks: (query: string, options?: SearchOptions) => SpotifyResponse<{ tracks: unknown }>;
  getCategories: (options?: PaginationOptions) => SpotifyResponse<{
    categories: {
      items: unknown[];
      next?: string | null;
      total?: number;
    };
  }>;
  getCategory: (categoryId: string) => SpotifyResponse;
  getPlaylistsForCategory: (categoryId: string) => SpotifyResponse<{ playlists: unknown }>;
  getTrack: (trackId: string) => SpotifyResponse;
  getArtist: (artistId: string) => SpotifyResponse;
  getArtistTopTracks: (artistId: string, country: string) => SpotifyResponse;
  getArtistAlbums: (artistId: string, options?: { limit?: number }) => SpotifyResponse;
  getArtistRelatedArtists: (artistId: string) => SpotifyResponse<{ artists: unknown }>;
  getUser: (userId: string) => SpotifyResponse;
  getPlaylist: (playlistId: string) => SpotifyResponse;
};

const rejectUnexpectedSpotifyCall = async () => {
  await Promise.resolve();
  throw new Error('Unexpected Spotify call');
};

function createUnexpectedSpotifyMock<Method extends keyof FakeSpotifyClientMethods>() {
  return vi.fn<FakeSpotifyClientMethods[Method]>(rejectUnexpectedSpotifyCall as FakeSpotifyClientMethods[Method]);
}

export function createFakeSpotifyClient() {
  return {
    getAvailableGenreSeeds: createUnexpectedSpotifyMock<'getAvailableGenreSeeds'>(),
    getPlaylistTracks: createUnexpectedSpotifyMock<'getPlaylistTracks'>(),
    getRecommendations: createUnexpectedSpotifyMock<'getRecommendations'>(),
    getUserPlaylists: createUnexpectedSpotifyMock<'getUserPlaylists'>(),
    searchArtists: createUnexpectedSpotifyMock<'searchArtists'>(),
    searchTracks: createUnexpectedSpotifyMock<'searchTracks'>(),
    getCategories: createUnexpectedSpotifyMock<'getCategories'>(),
    getCategory: createUnexpectedSpotifyMock<'getCategory'>(),
    getPlaylistsForCategory: createUnexpectedSpotifyMock<'getPlaylistsForCategory'>(),
    getTrack: createUnexpectedSpotifyMock<'getTrack'>(),
    getArtist: createUnexpectedSpotifyMock<'getArtist'>(),
    getArtistTopTracks: createUnexpectedSpotifyMock<'getArtistTopTracks'>(),
    getArtistAlbums: createUnexpectedSpotifyMock<'getArtistAlbums'>(),
    getArtistRelatedArtists: createUnexpectedSpotifyMock<'getArtistRelatedArtists'>(),
    getUser: createUnexpectedSpotifyMock<'getUser'>(),
    getPlaylist: createUnexpectedSpotifyMock<'getPlaylist'>(),
  };
}

export type FakeSpotifyClient = ReturnType<typeof createFakeSpotifyClient>;
