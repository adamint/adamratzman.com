/*
Taken from https://github.com/JMPerez/spotify-web-api-js/issues/18#issuecomment-638771387
 */

import SpotifyWebApi from 'spotify-web-api-js';

export interface SpotifyPagination<T> {
  total: number;
  next?: string;
  items: T[];
}

export const getAllPages = async <Response extends SpotifyPagination<T>, T>(
  spotifyApi: SpotifyWebApi.SpotifyWebApiJs,
  request: Promise<any>,
  limit: number | null = null,
  converter: (response: any) => Response = response => response as Response,
): Promise<Response> => {
  const paginatedResponse = converter(await request);

  let currentResponse = paginatedResponse;

  let total = currentResponse.items.length;
  while (currentResponse.next && (limit == null || limit > total)) {
    currentResponse = converter(await spotifyApi.getGeneric(
      currentResponse.next,
    ));
    total += currentResponse.items.length;
    paginatedResponse.items = paginatedResponse.items.concat(currentResponse.items);
  }

  return paginatedResponse;
};