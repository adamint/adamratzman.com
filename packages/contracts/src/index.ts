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

const searchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
}).strict();

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1),
  options: searchOptionsSchema.optional(),
});

export const spotifyRecommendationAttributeIds = [
  'acousticness',
  'danceability',
  'duration_ms',
  'energy',
  'instrumentalness',
  'key',
  'liveness',
  'loudness',
  'mode',
  'popularity',
  'speechiness',
  'tempo',
  'time_signature',
  'valence',
] as const;

export type SpotifyRecommendationAttribute =
  typeof spotifyRecommendationAttributeIds[number];
export type SpotifyRecommendationTuningKey =
  `${'min' | 'max' | 'target'}_${SpotifyRecommendationAttribute}`;
export type SpotifyRecommendationOptions = {
  limit?: number;
  seed_artists?: string[];
  seed_genres?: string[];
  seed_tracks?: string[];
} & Partial<Record<SpotifyRecommendationTuningKey, number>>;

const recommendationSeedSchema = z.string().trim().min(
  1,
  'Recommendation seeds must be non-empty.',
);
const recommendationSeedArraySchema = z.array(recommendationSeedSchema);
const recommendationTuningSchema = z.number().finite();

const spotifyRecommendationOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  seed_artists: recommendationSeedArraySchema.optional(),
  seed_genres: recommendationSeedArraySchema.optional(),
  seed_tracks: recommendationSeedArraySchema.optional(),
  min_acousticness: recommendationTuningSchema.optional(),
  max_acousticness: recommendationTuningSchema.optional(),
  target_acousticness: recommendationTuningSchema.optional(),
  min_danceability: recommendationTuningSchema.optional(),
  max_danceability: recommendationTuningSchema.optional(),
  target_danceability: recommendationTuningSchema.optional(),
  min_duration_ms: recommendationTuningSchema.optional(),
  max_duration_ms: recommendationTuningSchema.optional(),
  target_duration_ms: recommendationTuningSchema.optional(),
  min_energy: recommendationTuningSchema.optional(),
  max_energy: recommendationTuningSchema.optional(),
  target_energy: recommendationTuningSchema.optional(),
  min_instrumentalness: recommendationTuningSchema.optional(),
  max_instrumentalness: recommendationTuningSchema.optional(),
  target_instrumentalness: recommendationTuningSchema.optional(),
  min_key: recommendationTuningSchema.optional(),
  max_key: recommendationTuningSchema.optional(),
  target_key: recommendationTuningSchema.optional(),
  min_liveness: recommendationTuningSchema.optional(),
  max_liveness: recommendationTuningSchema.optional(),
  target_liveness: recommendationTuningSchema.optional(),
  min_loudness: recommendationTuningSchema.optional(),
  max_loudness: recommendationTuningSchema.optional(),
  target_loudness: recommendationTuningSchema.optional(),
  min_mode: recommendationTuningSchema.optional(),
  max_mode: recommendationTuningSchema.optional(),
  target_mode: recommendationTuningSchema.optional(),
  min_popularity: recommendationTuningSchema.optional(),
  max_popularity: recommendationTuningSchema.optional(),
  target_popularity: recommendationTuningSchema.optional(),
  min_speechiness: recommendationTuningSchema.optional(),
  max_speechiness: recommendationTuningSchema.optional(),
  target_speechiness: recommendationTuningSchema.optional(),
  min_tempo: recommendationTuningSchema.optional(),
  max_tempo: recommendationTuningSchema.optional(),
  target_tempo: recommendationTuningSchema.optional(),
  min_time_signature: recommendationTuningSchema.optional(),
  max_time_signature: recommendationTuningSchema.optional(),
  target_time_signature: recommendationTuningSchema.optional(),
  min_valence: recommendationTuningSchema.optional(),
  max_valence: recommendationTuningSchema.optional(),
  target_valence: recommendationTuningSchema.optional(),
}).strict().superRefine((options, context) => {
  const seedCount = (options.seed_artists?.length ?? 0)
    + (options.seed_genres?.length ?? 0)
    + (options.seed_tracks?.length ?? 0);
  if (seedCount < 1 || seedCount > 5) {
    context.addIssue({
      code: 'custom',
      message: 'Recommendation requests must include between one and five seeds.',
    });
  }
});

export const getRecommendationsRequestSchema = z.object({
  options: spotifyRecommendationOptionsSchema,
});

export type GetPlaylistTracksRequest = z.infer<typeof getPlaylistTracksRequestSchema>;
export type GetUserPlaylistsRequest = z.infer<typeof getUserPlaylistsRequestSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type GetRecommendationsRequest = z.infer<typeof getRecommendationsRequestSchema>;

export type SpotifyAutocompleteArtist = {
  name: string;
  uri: string;
};

export type SpotifyAutocompleteTrack = {
  artists: Array<{ name: string }>;
  name: string;
  uri: string;
};

export type SpotifySearchPage<T> = {
  items: T[];
};

export type SpotifyRecommendationTrack = {
  album: {
    images: Array<{ url: string }>;
  };
  artists: Array<{ id: string; name: string }>;
  duration_ms: number;
  id: string;
  name: string;
  popularity: number;
  preview_url?: string | null;
  uri: string;
};

export type SpotifyRecommendationsResponse = {
  seeds: Array<{ id: string } & Record<string, unknown>>;
  tracks: SpotifyRecommendationTrack[];
};

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
