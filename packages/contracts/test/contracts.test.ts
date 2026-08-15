import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  getPlaylistTracksRequestSchema,
  getRecommendationsRequestSchema,
  getUserPlaylistsRequestSchema,
  searchRequestSchema,
  spotifyRecommendationAttributeIds,
  type GetRecommendationsRequest,
  type SearchRequest,
  type SpotifyRecommendationOptions,
  type SpotifyRecommendationTuningKey,
} from '../src/index.js';

describe('shared request contracts', () => {
  it('rejects a playlist page larger than Spotify supports', () => {
    expect(() => getPlaylistTracksRequestSchema.parse({
      playlistId: 'playlist',
      limit: 51,
      offset: 0,
    })).toThrow();
  });

  it('rejects negative user-playlist offsets', () => {
    expect(() => getUserPlaylistsRequestSchema.parse({
      userId: 'user',
      limit: 10,
      offset: -1,
    })).toThrow();
  });

  it('requires a non-empty search query', () => {
    expect(() => searchRequestSchema.parse({ query: '   ' })).toThrow();
  });

  it.each([1, 50])('accepts search limit boundary %s', (limit) => {
    expect(searchRequestSchema.parse({
      query: 'garden',
      options: { limit },
    })).toEqual({
      query: 'garden',
      options: { limit },
    });
  });

  it.each([0, 51, 1.5])('rejects unsupported search limit %s', (limit) => {
    expect(() => searchRequestSchema.parse({
      query: 'garden',
      options: { limit },
    })).toThrow();
  });

  it('rejects unknown search options', () => {
    expect(() => searchRequestSchema.parse({
      query: 'garden',
      options: { offset: 10 },
    })).toThrow();
  });

  it('accepts one recommendation seed', () => {
    expect(getRecommendationsRequestSchema.parse({
      options: { seed_genres: ['rock'] },
    })).toEqual({
      options: { seed_genres: ['rock'] },
    });
  });

  it.each([1, 100])('accepts recommendation limit boundary %s', (limit) => {
    expect(getRecommendationsRequestSchema.parse({
      options: {
        limit,
        seed_genres: ['rock'],
      },
    })).toEqual({
      options: {
        limit,
        seed_genres: ['rock'],
      },
    });
  });

  it.each([0, 101, 1.5])('rejects unsupported recommendation limit %s', (limit) => {
    expect(() => getRecommendationsRequestSchema.parse({
      options: {
        limit,
        seed_genres: ['rock'],
      },
    })).toThrow();
  });

  it('rejects recommendations without seeds', () => {
    expect(() => getRecommendationsRequestSchema.parse({
      options: { limit: 10 },
    })).toThrow();
  });

  it('rejects more than five total recommendation seeds', () => {
    expect(() => getRecommendationsRequestSchema.parse({
      options: {
        seed_artists: ['artist-1', 'artist-2'],
        seed_genres: ['rock', 'indie'],
        seed_tracks: ['track-1', 'track-2'],
      },
    })).toThrow();
  });

  it('rejects unknown recommendation options', () => {
    expect(() => getRecommendationsRequestSchema.parse({
      options: {
        seed_tracks: ['track-1'],
        market: 'US',
      },
    })).toThrow();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite recommendation tuning value %s',
    (targetEnergy) => {
      expect(() => getRecommendationsRequestSchema.parse({
        options: {
          seed_tracks: ['track-1'],
          target_energy: targetEnergy,
        },
      })).toThrow();
    },
  );

  it('rejects whitespace-only recommendation seeds', () => {
    expect(() => getRecommendationsRequestSchema.parse({
      options: {
        seed_artists: ['artist-1'],
        seed_tracks: ['   '],
      },
    })).toThrow();
  });

  it('trims every recommendation seed', () => {
    expect(getRecommendationsRequestSchema.parse({
      options: {
        seed_artists: [' artist-1 '],
        seed_genres: [' indie '],
        seed_tracks: [' track-1 '],
      },
    })).toEqual({
      options: {
        seed_artists: ['artist-1'],
        seed_genres: ['indie'],
        seed_tracks: ['track-1'],
      },
    });
  });

  it('exports the exact recommendation attribute and option types', () => {
    expect(spotifyRecommendationAttributeIds).toEqual([
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
    ]);
    expectTypeOf<SearchRequest>().toEqualTypeOf<{
      query: string;
      options?: { limit?: number };
    }>();
    expectTypeOf<GetRecommendationsRequest['options']>()
      .toEqualTypeOf<SpotifyRecommendationOptions>();
    expectTypeOf<SpotifyRecommendationTuningKey>()
      .toEqualTypeOf<
        `${'min' | 'max' | 'target'}_${typeof spotifyRecommendationAttributeIds[number]}`
      >();
  });
});
