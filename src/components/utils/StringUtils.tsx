import React from 'react';

export function trimStrimToCharacters(string: string, length: number) {
  return string.length > length ? string.substring(0, length) + '...' : string;
}

export function reduceComponentsToString(components: Array<React.ReactElement>, join: string | React.ReactElement): React.ReactElement | string | null {
  if (components.length === 0) return null;
  else return components.reduce((prev, curr) => {
    return <>{prev}{join}{curr}</>;
  });
}