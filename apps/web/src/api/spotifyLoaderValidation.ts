import type {
  SpotifyArtistDetailsData,
  SpotifyCategoryDetailsData,
  SpotifyCategoryListItem,
  SpotifyExternalUrl,
  SpotifyImage,
  SpotifyNamedEntity,
  SpotifyPlaylistCard,
  SpotifyPlaylistDetails,
  SpotifyTrackCard,
  SpotifyTrackDetails,
  SpotifyUserDetailsData,
} from './spotifyLoaderTypes';

export function isSpotifyCategoriesResponse(
  value: unknown,
): value is SpotifyCategoryListItem[] {
  return Array.isArray(value) && value.every(isCategoryListItem);
}

export function isSpotifyGenresResponse(value: unknown): value is string[] {
  return isStringArray(value);
}

export function isSpotifyCategoryDetails(
  value: unknown,
): value is SpotifyCategoryDetailsData {
  if (!isRecord(value)) {
    return false;
  }

  const category = value['category'];
  const categoryPlaylists = value['categoryPlaylists'];
  if (!isCategoryDetail(category) || !isRecord(categoryPlaylists)) {
    return false;
  }

  const items = categoryPlaylists['items'];
  return Array.isArray(items) && items.every(isPlaylistSummary);
}

export function isSpotifyArtistDetails(
  value: unknown,
): value is SpotifyArtistDetailsData {
  if (!isRecord(value)) {
    return false;
  }

  const artistAlbums = value['artistAlbums'];
  const artistTopTracks = value['artistTopTracks'];
  const relatedArtists = value['relatedArtists'];
  if (!isArtistDetail(value['artist'])
    || !isRecord(artistAlbums)
    || !isNonnegativeFiniteNumber(artistAlbums['total'])
    || !isRecord(artistTopTracks)
    || !Array.isArray(artistTopTracks['tracks'])
    || !artistTopTracks['tracks'].every(isTrackCard)
    || !Array.isArray(relatedArtists)) {
    return false;
  }

  return relatedArtists.every(isNamedId);
}

export function isSpotifyTrackResponse(
  value: unknown,
): value is SpotifyTrackDetails {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value['id'])
    && isString(value['name'])
    && isExternalSpotifyUrl(value['external_urls'])
    && isArtistList(value['artists'])
    && isAlbumWithImage(value['album']);
}

export function isSpotifyPlaylistResponse(
  value: unknown,
): value is SpotifyPlaylistDetails {
  if (!isRecord(value)
    || !isString(value['id'])
    || !isString(value['name'])
    || !isExternalSpotifyUrl(value['external_urls'])
    || !isOptionalImageArray(value['images'])) {
    return false;
  }

  const owner = value['owner'];
  const followers = value['followers'];
  const tracks = value['tracks'];
  if (!isRecord(owner)
    || !isString(owner['id'])
    || !isOptionalNullableString(owner['display_name'])
    || !isOptionalFollowers(owner['followers'])
    || !isFollowers(followers)
    || !isRecord(tracks)
    || !isNonnegativeFiniteNumber(tracks['total'])) {
    return false;
  }

  return isBooleanOrNull(value['public'])
    && typeof value['collaborative'] === 'boolean'
    && isOptionalNullableString(value['description']);
}

export function isSpotifyUserDetails(
  value: unknown,
): value is SpotifyUserDetailsData {
  if (!isRecord(value)
    || !isNonnegativeFiniteNumber(value['totalPlaylists'])) {
    return false;
  }

  const user = value['user'];
  if (!isRecord(user)
    || !isString(user['id'])
    || !isExternalSpotifyUrl(user['external_urls'])
    || !isOptionalNullableString(user['display_name'])
    || !isOptionalNullableImageArray(user['images'])
    || !isOptionalFollowers(user['followers'])) {
    return false;
  }

  return true;
}

function isCategoryListItem(value: unknown): value is SpotifyCategoryListItem {
  return isRecord(value)
    && isString(value['id'])
    && isString(value['name'])
    && isRequiredImageArray(value['icons']);
}

function isCategoryDetail(
  value: unknown,
): value is SpotifyCategoryDetailsData['category'] {
  return isRecord(value)
    && isString(value['name'])
    && isRequiredImageArray(value['icons']);
}

function isArtistDetail(
  value: unknown,
): value is SpotifyArtistDetailsData['artist'] {
  if (!isRecord(value)
    || !isString(value['id'])
    || !isString(value['name'])
    || !isExternalSpotifyUrl(value['external_urls'])
    || !isRequiredImageArray(value['images'])
    || !isFiniteNumber(value['popularity'])
    || !isFollowers(value['followers'])) {
    return false;
  }

  return isStringArray(value['genres']);
}

function isTrackCard(value: unknown): value is SpotifyTrackCard {
  if (!isRecord(value)
    || !isString(value['id'])
    || !isString(value['name'])
    || !isArtistList(value['artists'])
    || !isAlbumWithImage(value['album'])
    || !isFiniteNumber(value['popularity'])
    || !isNonnegativeFiniteNumber(value['duration_ms'])) {
    return false;
  }

  return isOptionalNullableString(value['preview_url']);
}

function isPlaylistSummary(value: unknown): value is SpotifyPlaylistCard {
  if (!isRecord(value)
    || !isString(value['id'])
    || !isString(value['name'])
    || !isRequiredImageArray(value['images'])) {
    return false;
  }

  const owner = value['owner'];
  const tracks = value['tracks'];
  return isRecord(owner)
    && isString(owner['id'])
    && isOptionalNullableString(owner['display_name'])
    && isRecord(tracks)
    && isNonnegativeFiniteNumber(tracks['total'])
    && isOptionalNullableString(value['description']);
}

function isArtistList(value: unknown): value is SpotifyNamedEntity[] {
  return Array.isArray(value) && value.every(isNamedId);
}

function isNamedId(value: unknown): value is SpotifyNamedEntity {
  return isRecord(value)
    && isString(value['id'])
    && isString(value['name']);
}

function isAlbumWithImage(value: unknown) {
  return isRecord(value) && isRequiredImageArray(value['images']);
}

function isFollowers(value: unknown) {
  return isRecord(value) && isNonnegativeFiniteNumber(value['total']);
}

function isOptionalFollowers(value: unknown) {
  return value == null || isFollowers(value);
}

function isExternalSpotifyUrl(value: unknown): value is SpotifyExternalUrl {
  if (!isRecord(value) || !isString(value['spotify'])) {
    return false;
  }

  try {
    const url = new URL(value['spotify']);
    return url.protocol === 'https:'
      && url.origin === 'https://open.spotify.com'
      && url.username === ''
      && url.password === '';
  } catch {
    return false;
  }
}

function isRequiredImageArray(value: unknown): value is SpotifyImage[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(isImage);
}

function isOptionalImageArray(value: unknown): value is SpotifyImage[] {
  return Array.isArray(value)
    && value.every(isImage);
}

function isOptionalNullableImageArray(
  value: unknown,
): value is SpotifyImage[] | null | undefined {
  return value == null || isOptionalImageArray(value);
}

function isImage(value: unknown): value is SpotifyImage {
  return isRecord(value) && isString(value['url']);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isOptionalNullableString(
  value: unknown,
): value is string | null | undefined {
  return value == null || isString(value);
}

function isBooleanOrNull(value: unknown): value is boolean | null {
  return value === null || typeof value === 'boolean';
}

function isNonnegativeFiniteNumber(value: unknown) {
  return isFiniteNumber(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}
