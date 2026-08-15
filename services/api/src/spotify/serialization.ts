export function projectSpotifyResponse<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error('Spotify response could not be serialized.');
  }

  return JSON.parse(serialized) as T;
}
