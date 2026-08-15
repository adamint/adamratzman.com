import type {
  SpotifyAutocompleteArtist,
  SpotifyAutocompleteTrack,
  SpotifyRecommendationTrack,
  SpotifyRecommendationsResponse,
  SpotifySearchPage,
} from '@adamratzman/contracts';

export type {
  SpotifyAutocompleteArtist,
  SpotifyAutocompleteTrack,
  SpotifyRecommendationTrack,
  SpotifyRecommendationsResponse,
  SpotifySearchPage,
} from '@adamratzman/contracts';

export function isSpotifyGenreList(value: unknown): value is string[] {
  return safely(() => (
    Array.isArray(value)
    && value.every(isNonEmptyString)
  ));
}

export function isSpotifyArtistSearchPage(
  value: unknown,
): value is SpotifySearchPage<SpotifyAutocompleteArtist> {
  return safely(() => isSearchPage(value, isAutocompleteArtist));
}

export function isSpotifyTrackSearchPage(
  value: unknown,
): value is SpotifySearchPage<SpotifyAutocompleteTrack> {
  return safely(() => isSearchPage(value, isAutocompleteTrack));
}

export function isSpotifyRecommendationsResponse(
  value: unknown,
): value is SpotifyRecommendationsResponse {
  return safely(() => (
    isRecord(value)
    && Array.isArray(value['seeds'])
    && value['seeds'].every(isRecommendationSeed)
    && Array.isArray(value['tracks'])
    && value['tracks'].every(isRecommendationTrack)
  ));
}

function isSearchPage<Item>(
  value: unknown,
  isItem: (item: unknown) => item is Item,
): value is SpotifySearchPage<Item> {
  return isRecord(value)
    && Array.isArray(value['items'])
    && value['items'].every(isItem);
}

function isAutocompleteArtist(value: unknown): value is SpotifyAutocompleteArtist {
  return isRecord(value)
    && isNonEmptyString(value['name'])
    && isNonEmptyString(value['uri']);
}

function isAutocompleteTrack(value: unknown): value is SpotifyAutocompleteTrack {
  return isRecord(value)
    && Array.isArray(value['artists'])
    && value['artists'].every(isAutocompleteTrackArtist)
    && isNonEmptyString(value['name'])
    && isNonEmptyString(value['uri']);
}

function isAutocompleteTrackArtist(
  value: unknown,
): value is SpotifyAutocompleteTrack['artists'][number] {
  return isRecord(value) && isNonEmptyString(value['name']);
}

function isRecommendationTrack(value: unknown): value is SpotifyRecommendationTrack {
  if (!isRecord(value)
    || !isRecommendationAlbum(value['album'])
    || !Array.isArray(value['artists'])
    || !value['artists'].every(isRecommendationArtist)
    || !isFiniteNumber(value['duration_ms'])
    || !isNonEmptyString(value['id'])
    || !isNonEmptyString(value['name'])
    || !isFiniteNumber(value['popularity'])
    || !isOptionalNullableNonEmptyString(value['preview_url'])
    || !isNonEmptyString(value['uri'])) {
    return false;
  }

  return true;
}

function isRecommendationAlbum(
  value: unknown,
): value is SpotifyRecommendationTrack['album'] {
  return isRecord(value)
    && Array.isArray(value['images'])
    && value['images'].length > 0
    && value['images'].every(isRecommendationImage);
}

function isRecommendationImage(
  value: unknown,
): value is SpotifyRecommendationTrack['album']['images'][number] {
  return isRecord(value) && isNonEmptyString(value['url']);
}

function isRecommendationArtist(
  value: unknown,
): value is SpotifyRecommendationTrack['artists'][number] {
  return isRecord(value)
    && isNonEmptyString(value['id'])
    && isNonEmptyString(value['name']);
}

function isRecommendationSeed(
  value: unknown,
): value is SpotifyRecommendationsResponse['seeds'][number] {
  return isRecord(value) && isNonEmptyString(value['id']);
}

function isOptionalNullableNonEmptyString(
  value: unknown,
): value is string | null | undefined {
  return value == null || isNonEmptyString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

function safely(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}
