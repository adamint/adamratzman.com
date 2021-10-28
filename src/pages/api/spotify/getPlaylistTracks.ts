import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

import type { NextApiRequest, NextApiResponse } from 'next';

export type GetPlaylistTracksRequestBody = {
  limit: number;
  offset: number;
  playlistId: string;
}

export default async (req: NextApiRequest, res: NextApiResponse<SpotifyApi.PlaylistTrackResponse>) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    const { playlistId, offset, limit } = req.body as GetPlaylistTracksRequestBody;
    const playlistTracks = (await spotifyApi.getPlaylistTracks(playlistId, {
      limit: limit,
      offset: offset * limit,
    })).body;

    res.status(200).json(playlistTracks);
  } catch (e) {
    console.log(e)
    res.status(400);
  }
}
