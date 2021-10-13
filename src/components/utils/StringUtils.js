export function trimStrimToCharacters(string, length) {
  return string.length > length ? string.substring(0, length) + '...' : string;
}

export function reduceComponentsToString(components, join) {
  if (components.length === 0) return []
  else return components.reduce((prev, curr) => [prev, join, curr]);
}