import type { NextApiRequest, NextApiResponse } from 'next';

const backendOrigin = () => {
  const configuredOrigin = process.env.BACKEND_SITE_ORIGIN;
  if (!configuredOrigin) {
    throw new Error('BACKEND_SITE_ORIGIN is not configured.');
  }

  return configuredOrigin.startsWith('http://') || configuredOrigin.startsWith('https://')
    ? configuredOrigin
    : `https://${configuredOrigin}`;
};

const komootProxy = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const path = req.query.path;
  if (!Array.isArray(path) || path.length === 0) {
    res.status(400).json({ error: 'Missing backend path.' });
    return;
  }

  const url = new URL(path.map(encodeURIComponent).join('/'), `${backendOrigin()}/`);
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
    } else if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      accept: req.headers.accept ?? 'application/json',
    },
  });

  const contentType = response.headers.get('content-type');
  if (contentType) {
    res.setHeader('content-type', contentType);
  }

  res.status(response.status).send(await response.text());
};

export default komootProxy;
