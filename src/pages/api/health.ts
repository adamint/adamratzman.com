import type { NextApiRequest, NextApiResponse } from 'next';

const health = async (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ status: 'ok' });
};

export default health;
