export function trimStrimToCharacters(string, length) {
  return string.length > length ? string.substring(0, length) + '...' : string;
}

export function reduceComponentsToString(components, join) {
  return components.reduce((prev, curr) => [prev, join, curr]);
}