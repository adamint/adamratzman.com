import { describe, expect, it } from 'vitest';
import {
  getPlaylistTracksRequestSchema,
  getRecommendationsRequestSchema,
  getUserPlaylistsRequestSchema,
  searchRequestSchema,
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

  it('accepts recommendation options as a JSON object', () => {
    expect(getRecommendationsRequestSchema.parse({
      options: { seed_genres: ['rock'], limit: 10 },
    })).toEqual({
      options: { seed_genres: ['rock'], limit: 10 },
    });
  });
});
