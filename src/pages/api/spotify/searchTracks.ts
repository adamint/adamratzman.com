import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

import type { NextApiRequest, NextApiResponse } from 'next';

export type SearchTracksOrArtistsBody = {
  query: string;
  options?: any;
}

const searchTracks = async (req: NextApiRequest, res: NextApiResponse<SpotifyApi.PagingObject<SpotifyApi.TrackObjectFull>>) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    const { query, options } = req.body as SearchTracksOrArtistsBody;
    const tracks: SpotifyApi.PagingObject<SpotifyApi.TrackObjectFull> | undefined = (await spotifyApi.searchTracks(query, options)).body.tracks;
    if (tracks) res.status(200).json(tracks);
    else res.status(400);
  } catch (e) {
    console.log(e);
    res.status(400);
  }
};

export default searchTracks;
