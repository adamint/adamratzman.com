import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse<string[]>) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    const genreSeeds: string[] = (await spotifyApi.getAvailableGenreSeeds()).body.genres;

    res.status(200).json(genreSeeds);
  } catch (e) {
    console.log(e)
    res.status(400);
  }
}
