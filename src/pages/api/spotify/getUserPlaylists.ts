import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

import type { NextApiRequest, NextApiResponse } from 'next';

export type GetUserPlaylistsRequestBody = {
  limit: number;
  offset: number;
  userId: string;
}

export default async (req: NextApiRequest, res: NextApiResponse<SpotifyApi.ListOfUsersPlaylistsResponse>) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    const { userId, offset, limit } = req.body as GetUserPlaylistsRequestBody;
    const userPlaylists = (await spotifyApi.getUserPlaylists(userId, {
      limit: limit,
      offset: offset * limit,
    })).body;

    res.status(200).json(userPlaylists);
  } catch (e) {
    console.log(e)
    res.status(400);
  }
}
