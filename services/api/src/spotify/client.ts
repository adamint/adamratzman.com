import SpotifyWebApiNode from 'spotify-web-api-node';
import { z } from 'zod';

type SpotifyResponse<Body> = Promise<{ body: Body }>;
type SpotifyPaginationOptions = { limit?: number; offset?: number };
type SpotifyMarketOptions = { market?: string };
type SpotifySearchOptions = SpotifyPaginationOptions & SpotifyMarketOptions;
type SpotifyLocaleOptions = { locale?: string };
type SpotifyPaginationLocaleOptions = SpotifyPaginationOptions & SpotifyLocaleOptions;
type SpotifyPaginationCountryOptions = SpotifyPaginationOptions & { country?: string };
type SpotifyPlaylistTracksOptions = SpotifyPaginationOptions & SpotifyMarketOptions & { fields?: string };
type SpotifyPlaylistOptions = SpotifyMarketOptions & { fields?: string };
type SpotifyArtistAlbumsOptions = SpotifyPaginationCountryOptions & {
  album_type?: string;
  include_groups?: string;
};
type SpotifyRecommendationsOptions = Record<string, unknown>;

export type SpotifyClient = {
  getAvailableGenreSeeds: () => SpotifyResponse<SpotifyApi.AvailableGenreSeedsResponse>;
  getPlaylistTracks: (
    playlistId: string,
    options?: SpotifyPlaylistTracksOptions,
  ) => SpotifyResponse<SpotifyApi.PlaylistTrackResponse>;
  getRecommendations: (
    options?: SpotifyRecommendationsOptions,
  ) => SpotifyResponse<SpotifyApi.RecommendationsFromSeedsResponse>;
  getUserPlaylists: (
    userId: string,
    options?: SpotifyPaginationOptions,
  ) => SpotifyResponse<SpotifyApi.ListOfUsersPlaylistsResponse>;
  searchArtists: (
    query: string,
    options?: SpotifySearchOptions,
  ) => SpotifyResponse<SpotifyApi.SearchResponse>;
  searchTracks: (
    query: string,
    options?: SpotifySearchOptions,
  ) => SpotifyResponse<SpotifyApi.SearchResponse>;
  getCategories: (
    options?: SpotifyPaginationLocaleOptions,
  ) => SpotifyResponse<SpotifyApi.MultipleCategoriesResponse>;
  getCategory: (
    categoryId: string,
    options?: SpotifyLocaleOptions,
  ) => SpotifyResponse<SpotifyApi.SingleCategoryResponse>;
  getPlaylistsForCategory: (
    categoryId: string,
    options?: SpotifyPaginationCountryOptions,
  ) => SpotifyResponse<SpotifyApi.CategoryPlaylistsReponse>;
  getTrack: (
    trackId: string,
    options?: SpotifyMarketOptions,
  ) => SpotifyResponse<SpotifyApi.SingleTrackResponse>;
  getArtist: (artistId: string) => SpotifyResponse<SpotifyApi.SingleArtistResponse>;
  getArtistTopTracks: (
    artistId: string,
    country: string,
  ) => SpotifyResponse<SpotifyApi.ArtistsTopTracksResponse>;
  getArtistAlbums: (
    artistId: string,
    options?: SpotifyArtistAlbumsOptions,
  ) => SpotifyResponse<SpotifyApi.ArtistsAlbumsResponse>;
  getArtistRelatedArtists: (
    artistId: string,
  ) => SpotifyResponse<SpotifyApi.ArtistsRelatedArtistsResponse>;
  getUser: (userId: string) => SpotifyResponse<SpotifyApi.UserProfileResponse>;
  getPlaylist: (
    playlistId: string,
    options?: SpotifyPlaylistOptions,
  ) => SpotifyResponse<SpotifyApi.SinglePlaylistResponse>;
};

export type SpotifyClientFactory = () => Promise<SpotifyClient>;

export class SpotifyConfigurationError extends Error {
  readonly code = 'spotify_not_configured';

  constructor() {
    super('Spotify client credentials are missing or invalid.');
    this.name = 'SpotifyConfigurationError';
  }
}

const credentialSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().trim().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().trim().min(1),
});

export async function createSpotifyClient(): Promise<SpotifyClient> {
  const credentials = credentialSchema.safeParse(process.env);
  if (!credentials.success) {
    throw new SpotifyConfigurationError();
  }

  const client = new SpotifyWebApiNode({
    clientId: credentials.data.SPOTIFY_CLIENT_ID,
    clientSecret: credentials.data.SPOTIFY_CLIENT_SECRET,
  });
  const token = await client.clientCredentialsGrant();
  client.setAccessToken(token.body.access_token);
  return client;
}
