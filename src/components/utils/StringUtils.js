export function trimStrimToCharacters(string, length) {
  return string.length > length ? string.substring(0, length) + '...' : string;
}