import type { FastifyInstance, HTTPMethods } from 'fastify';
import { ApiError, errorResponse } from '../errors.js';

const allowedBackendPaths = new Set([
  'activity-stats-by-week',
  'latest-komoot-tours-by-month',
]);

export type ProxyDependencies = {
  fetch: typeof fetch;
  backendOrigin?: string;
};

const nonGetMethods: HTTPMethods[] = ['DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'];

function normalizeOrigin(origin: string) {
  const normalizedOrigin = origin.startsWith('http://') || origin.startsWith('https://')
    ? origin
    : `https://${origin}`;

  return normalizedOrigin.replace(/\/+$/u, '');
}

function registerMethodNotAllowedRoute(app: FastifyInstance, url: string) {
  app.route({
    method: nonGetMethods,
    url,
    async handler(_request, reply) {
      return reply
        .header('allow', 'GET')
        .code(405)
        .send(errorResponse('method_not_allowed', 'The request method is not allowed.'));
    },
  });
}

export function registerProxyRoutes(
  app: FastifyInstance,
  dependencies: ProxyDependencies,
) {
  app.route<{ Params: { path: string }; Querystring: Record<string, string | string[] | undefined> }>({
    method: 'GET',
    url: '/api/komoot/:path',
    exposeHeadRoute: false,
    async handler(request, reply) {
      if (!allowedBackendPaths.has(request.params.path)) {
        throw new ApiError(404, 'unknown_backend_path', 'Unknown backend path.');
      }

      if (!dependencies.backendOrigin) {
        throw new ApiError(
          503,
          'backend_not_configured',
          'The activity backend is not configured.',
        );
      }

      const url = new URL(request.params.path, `${normalizeOrigin(dependencies.backendOrigin)}/`);
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
      const contentType = response.headers.get('content-type');
      if (contentType) {
        reply.header('content-type', contentType);
      }

      return reply.code(response.status).send(await response.text());
    },
  });
  registerMethodNotAllowedRoute(app, '/api/komoot/:path');

  app.route({
    method: 'GET',
    url: '/api/king-county-transit/getVehicleLocations',
    exposeHeadRoute: false,
    async handler(_request, reply) {
      const response = await dependencies.fetch(
        'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions_enhanced.json',
        { headers: { accept: 'application/json' } },
      );
      const contentType = response.headers.get('content-type');
      if (contentType) {
        reply.header('content-type', contentType);
      }
      return reply.code(response.status).send(await response.text());
    },
  });
  registerMethodNotAllowedRoute(app, '/api/king-county-transit/getVehicleLocations');
}
