import { getClientCredentialsSpotifyApiNode } from '../../../spotify-utils/SpotifyNodeApiUtils';

import type { NextApiRequest, NextApiResponse } from 'next';
import { SearchTracksOrArtistsBody } from './searchTracks';

export default async (req: NextApiRequest, res: NextApiResponse<SpotifyApi.PagingObject<SpotifyApi.ArtistObjectFull>>) => {
  const spotifyApi = await getClientCredentialsSpotifyApiNode();

  try {
    const { query, options } = req.body as SearchTracksOrArtistsBody;
    const artists: SpotifyApi.PagingObject<SpotifyApi.ArtistObjectFull> | undefined = (await spotifyApi.searchArtists(query, options)).body.artists;
    if (artists) res.status(200).json(artists);
    else res.status(400);
  } catch (e) {
    console.log(e)
    res.status(400);
  }
}
