import type { NextApiRequest, NextApiResponse } from 'next';
import { fetcher } from '../../../components/utils/NextUtils';

const getVehicleLocations = async (req: NextApiRequest, res: NextApiResponse<SpotifyApi.PlaylistTrackResponse>) => {
  res.status(200).json(await fetcher('https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions_enhanced.json'));
};

export default getVehicleLocations;
