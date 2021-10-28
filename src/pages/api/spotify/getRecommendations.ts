import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

import type { NextApiRequest, NextApiResponse } from 'next';

export type GetRecommendationsRequestBody = {
  options: any
}

const getRecommendations = async (req: NextApiRequest, res: NextApiResponse<SpotifyApi.RecommendationsFromSeedsResponse>) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    const { options } = req.body as GetRecommendationsRequestBody;
    const recommendationsResponse: SpotifyApi.RecommendationsFromSeedsResponse = (await spotifyApi.getRecommendations(options)).body;
    res.status(200).json(recommendationsResponse);
  } catch (e) {
    console.log(e);
    res.status(400);
  }
};

export default getRecommendations;
