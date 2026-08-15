/*
Taken from https://github.com/JMPerez/spotify-web-api-js/issues/18#issuecomment-638771387
 */

import SpotifyWebApi from 'spotify-web-api-js';
import SpotifyWebApiNode from 'spotify-web-api-node';

export interface SpotifyPagination<T> {
  total: number;
  next?: string;
  items: T[];
}

export const getAllPagesNode = async <Response extends SpotifyPagination<T>, T>(
  spotifyApi: SpotifyWebApiNode,
  request: (limit: number, offset: number) => Promise<Response>,
  limit: number | null = null,
  converter: (response: any) => Response = response => response as Response,
): Promise<Response> => {
  const paginatedResponse = converter(await request(limit ?? 50, 0));
  let currentResponse = paginatedResponse;

  let total = currentResponse.items.length;
  while (currentResponse.next && (limit == null || limit > total)) {
    currentResponse = converter(await request(limit ?? 50, total));
    total += currentResponse.items.length;
    paginatedResponse.items = paginatedResponse.items.concat(currentResponse.items);
  }

  return paginatedResponse;
};

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