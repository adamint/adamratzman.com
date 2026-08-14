/// <reference types="spotify-api" />

import { z } from 'zod';

const pageSchema = z.object({
  limit: z.number().int().min(1).max(50),
  offset: z.number().int().min(0),
});

export const getPlaylistTracksRequestSchema = pageSchema.extend({
  playlistId: z.string().trim().min(1),
});

export const getUserPlaylistsRequestSchema = pageSchema.extend({
  userId: z.string().trim().min(1),
});

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const getRecommendationsRequestSchema = z.object({
  options: z.record(z.string(), z.unknown()),
});

export type GetPlaylistTracksRequest = z.infer<typeof getPlaylistTracksRequestSchema>;
export type GetUserPlaylistsRequest = z.infer<typeof getUserPlaylistsRequestSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type GetRecommendationsRequest = z.infer<typeof getRecommendationsRequestSchema>;

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export type SpotifyArtistDetails = {
  artist: SpotifyApi.SingleArtistResponse;
  artistTopTracks: SpotifyApi.ArtistsTopTracksResponse;
  artistAlbums: SpotifyApi.ArtistsAlbumsResponse;
  relatedArtists: SpotifyApi.ArtistObjectFull[];
};

export type SpotifyCategoryDetails = {
  category: SpotifyApi.SingleCategoryResponse;
  categoryPlaylists: SpotifyApi.PagingObject<SpotifyApi.PlaylistObjectSimplified>;
};

export type SpotifyUserDetails = {
  user: SpotifyApi.UserProfileResponse;
  totalPlaylists: number;
};
