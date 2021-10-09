/*
Taken from https://github.com/JMPerez/spotify-web-api-js/issues/18#issuecomment-638771387
 */

import SpotifyWebApi from 'spotify-web-api-js';

interface Pagination {
  next?: string;
  items: object[];
}

export const getAllPages = async <Response extends Pagination>(
  spotifyApi: SpotifyWebApi.SpotifyWebApiJs,
  request: Promise<Response>,
  limit: number | null = null
): Promise<Response> => {
  const paginatedResponse = await request;

  let currentResponse = paginatedResponse;
  let total = currentResponse.items.length
  while (currentResponse.next && (limit == null || limit > total)) {
    currentResponse = await spotifyApi.getGeneric(
      currentResponse.next,
    ) as Response;
    total += currentResponse.items.length
    paginatedResponse.items = paginatedResponse.items.concat(currentResponse.items);
  }

  return paginatedResponse;
};