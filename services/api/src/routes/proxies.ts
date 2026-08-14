import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ApiError, errorResponse } from '../errors.js';

const allowedBackendPaths = new Set([
  'activity-stats-by-week',
  'latest-komoot-tours-by-month',
]);
const komootRoutePrefix = '/api/komoot';
const kingCountyVehicleLocationsUrl = 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions_enhanced.json';

type ProxyQuerystring = Record<string, string | string[] | undefined>;

export type ProxyDependencies = {
  fetch: typeof fetch;
  backendOrigin?: string;
};

function normalizeOrigin(origin: string) {
  const normalizedOrigin = origin.startsWith('http://') || origin.startsWith('https://')
    ? origin
    : `https://${origin}`;

  return normalizedOrigin.replace(/\/+$/u, '');
}

function normalizeBackendPath(rawPath: string) {
  return rawPath
    .split('/')
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function readKomootRawPath(request: FastifyRequest) {
  const pathname = (request.raw.url ?? '').split('?')[0] ?? '';
  if (pathname === komootRoutePrefix) {
    return undefined;
  }

  if (!pathname.startsWith(`${komootRoutePrefix}/`)) {
    return undefined;
  }

  return pathname.slice(komootRoutePrefix.length + 1);
}

async function sendUpstreamResponse(reply: FastifyReply, response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType) {
    reply.header('content-type', contentType);
  }

  return reply.code(response.status).send(await response.text());
}

function sendKomootMethodNotAllowed(reply: FastifyReply) {
  return reply
    .header('allow', 'GET')
    .code(405)
    .send(errorResponse('method_not_allowed', 'Method not allowed.'));
}

async function handleKomootRequest(
  request: FastifyRequest<{ Querystring: ProxyQuerystring }>,
  reply: FastifyReply,
  dependencies: ProxyDependencies,
) {
  if (request.method !== 'GET') {
    return sendKomootMethodNotAllowed(reply);
  }

  const rawPath = readKomootRawPath(request);
  if (!rawPath) {
    throw new ApiError(400, 'bad_request', 'Missing backend path.');
  }

  const backendPath = normalizeBackendPath(rawPath);
  if (!allowedBackendPaths.has(backendPath)) {
    throw new ApiError(404, 'unknown_backend_path', 'Unknown backend path.');
  }

  if (!dependencies.backendOrigin) {
    throw new ApiError(
      503,
      'backend_not_configured',
      'The activity backend is not configured.',
    );
  }

  const url = new URL(backendPath, `${normalizeOrigin(dependencies.backendOrigin)}/`);
  for (const [name, value] of Object.entries(request.query)) {
    if (value === undefined) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(name, item);
    }
  }

  const response = await dependencies.fetch(url, {
    headers: { accept: request.headers.accept ?? 'application/json' },
  });

  return sendUpstreamResponse(reply, response);
}

export function registerProxyRoutes(
  app: FastifyInstance,
  dependencies: ProxyDependencies,
) {
  void app.all<{ Querystring: ProxyQuerystring }>(komootRoutePrefix, async (request, reply) => (
    handleKomootRequest(request, reply, dependencies)
  ));
  void app.all<{ Querystring: ProxyQuerystring }>(`${komootRoutePrefix}/*`, async (request, reply) => (
    handleKomootRequest(request, reply, dependencies)
  ));

  void app.all('/api/king-county-transit/getVehicleLocations', async (_request, reply) => {
    const response = await dependencies.fetch(
      kingCountyVehicleLocationsUrl,
      { headers: { accept: 'application/json' } },
    );

    return sendUpstreamResponse(reply, response);
  });
}
