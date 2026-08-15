import type {
  SpotifyAutocompleteArtist,
  SpotifyAutocompleteTrack,
  SpotifyRecommendationAttribute,
  SpotifyRecommendationTrack,
  SpotifyRecommendationsResponse,
  SpotifySearchPage,
} from '@adamratzman/contracts';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { TrackAttribute } from '../src/components/projects/spotify/TrackAttribute';
import {
  isSpotifyArtistSearchPage,
  isSpotifyGenreList,
  isSpotifyRecommendationsResponse,
  isSpotifyTrackSearchPage,
} from '../src/api/spotifyBrowserValidation';

const artist = {
  name: 'Phoebe Bridgers',
  uri: 'spotify:artist:artist-1',
} satisfies SpotifyAutocompleteArtist;

const autocompleteTrack = {
  artists: [{ name: 'Phoebe Bridgers' }],
  name: 'Garden Song',
  uri: 'spotify:track:track-1',
} satisfies SpotifyAutocompleteTrack;

const recommendationTrack = {
  album: {
    images: [
      { url: 'https://images.example/track-1.png' },
      { url: 'https://images.example/track-2.png' },
    ],
  },
  artists: [{ id: 'artist-1', name: 'Phoebe Bridgers' }],
  duration_ms: 207_000,
  id: 'track1',
  name: 'Garden Song',
  popularity: 84,
  preview_url: null,
  uri: 'spotify:track:track1',
} satisfies SpotifyRecommendationTrack;

const recommendations = {
  seeds: [{ id: 'seed-1', type: 'TRACK' }],
  tracks: [recommendationTrack],
} satisfies SpotifyRecommendationsResponse;

const arbitraryMalformedValues: unknown[] = [
  null,
  undefined,
  true,
  42,
  'spotify',
  [],
  {},
  { items: null },
];

describe('Spotify browser response guards', () => {
  it.each([
    ['genre list', isSpotifyGenreList],
    ['artist search page', isSpotifyArtistSearchPage],
    ['track search page', isSpotifyTrackSearchPage],
    ['recommendations response', isSpotifyRecommendationsResponse],
  ])('does not throw for arbitrary malformed %s inputs', (_label, guard) => {
    for (const value of arbitraryMalformedValues) {
      expect(() => guard(value)).not.toThrow();
    }
  });

  it('validates every genre string', () => {
    expect(isSpotifyGenreList(['rock', 'indie'])).toBe(true);
    expect(isSpotifyGenreList(['rock', ''])).toBe(false);
    expect(isSpotifyGenreList(['rock', 42])).toBe(false);
  });

  it('validates artist search page fields and every item', () => {
    expect(isSpotifyArtistSearchPage({ items: [artist] })).toBe(true);
    expect(isSpotifyArtistSearchPage({ items: [artist, null] })).toBe(false);
    expect(isSpotifyArtistSearchPage({
      items: [{ ...artist, name: '' }],
    })).toBe(false);
    expect(isSpotifyArtistSearchPage({
      items: [{ ...artist, uri: 42 }],
    })).toBe(false);
  });

  it('validates track search page fields and nested artists', () => {
    expect(isSpotifyTrackSearchPage({ items: [autocompleteTrack] })).toBe(true);
    expect(isSpotifyTrackSearchPage({
      items: [{ ...autocompleteTrack, artists: [{ name: '' }] }],
    })).toBe(false);
    expect(isSpotifyTrackSearchPage({
      items: [{ ...autocompleteTrack, artists: [null] }],
    })).toBe(false);
    expect(isSpotifyTrackSearchPage({
      items: [{ ...autocompleteTrack, uri: '' }],
    })).toBe(false);
  });

  it('validates every recommendation image and artist entry', () => {
    expect(isSpotifyRecommendationsResponse(recommendations)).toBe(true);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{
        ...recommendationTrack,
        album: {
          images: [
            { url: 'https://images.example/track-1.png' },
            { url: 42 },
          ],
        },
      }],
    })).toBe(false);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{
        ...recommendationTrack,
        artists: [{ id: 'artist-1', name: '' }],
      }],
    })).toBe(false);
  });

  it('allows recommendation tracks without album artwork', () => {
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{
        ...recommendationTrack,
        album: { images: [] },
      }],
    })).toBe(true);
  });

  it.each(['track-id', 'track/id', 'track id', 'track.id'])(
    'rejects recommendation track ID %s',
    (id) => {
      expect(isSpotifyRecommendationsResponse({
        ...recommendations,
        tracks: [{ ...recommendationTrack, id }],
      })).toBe(false);
    },
  );

  it.each([
    ['duration', { duration_ms: Number.NaN }],
    ['popularity', { popularity: Number.POSITIVE_INFINITY }],
  ])('rejects non-finite recommendation %s', (_label, override) => {
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{ ...recommendationTrack, ...override }],
    })).toBe(false);
  });

  it('allows absent, null, or non-empty recommendation preview URLs', () => {
    const withoutPreviewUrl: SpotifyRecommendationTrack = { ...recommendationTrack };
    delete withoutPreviewUrl.preview_url;
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [withoutPreviewUrl],
    })).toBe(true);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{ ...recommendationTrack, preview_url: null }],
    })).toBe(true);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{
        ...recommendationTrack,
        preview_url: 'https://audio.example/track.mp3',
      }],
    })).toBe(true);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{ ...recommendationTrack, preview_url: '' }],
    })).toBe(false);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{ ...recommendationTrack, preview_url: 42 }],
    })).toBe(false);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])('rejects recommendation tracks with a %s URI', (_label, uri) => {
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      tracks: [{ ...recommendationTrack, uri }],
    })).toBe(false);
  });

  it('validates recommendation seed identifiers', () => {
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      seeds: [{ id: '' }],
    })).toBe(false);
    expect(isSpotifyRecommendationsResponse({
      ...recommendations,
      seeds: [{ type: 'TRACK' }],
    })).toBe(false);
  });

  it('narrows to the shared browser DTOs', () => {
    expectTypeOf(isSpotifyArtistSearchPage)
      .guards.toEqualTypeOf<SpotifySearchPage<SpotifyAutocompleteArtist>>();
    expectTypeOf(isSpotifyTrackSearchPage)
      .guards.toEqualTypeOf<SpotifySearchPage<SpotifyAutocompleteTrack>>();
    expectTypeOf(isSpotifyRecommendationsResponse)
      .guards.toEqualTypeOf<SpotifyRecommendationsResponse>();
    expectTypeOf<TrackAttribute['id']>()
      .toEqualTypeOf<SpotifyRecommendationAttribute>();
  });
});
