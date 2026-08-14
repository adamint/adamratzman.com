import Fastify from 'fastify';
import { ApiError, errorResponse } from './errors.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerProxyRoutes, type ProxyDependencies } from './routes/proxies.js';
import { registerSpotifyRoutes } from './routes/spotify.js';
import { createSpotifyClient, type SpotifyClientFactory } from './spotify/client.js';

const fastifyBadRequestErrorCodes = new Set([
  'FST_ERR_CTP_INVALID_JSON_BODY',
  'FST_ERR_VALIDATION',
]);

const genericClientErrorResponses: Partial<Record<number, { code: string; message: string }>> = {
  401: { code: 'unauthorized', message: 'Authentication is required.' },
  403: { code: 'forbidden', message: 'The request is not allowed.' },
  404: { code: 'not_found', message: 'The requested resource was not found.' },
  405: { code: 'method_not_allowed', message: 'The request method is not allowed.' },
  406: { code: 'not_acceptable', message: 'The request is not acceptable.' },
  408: { code: 'request_timeout', message: 'The request timed out.' },
  409: { code: 'conflict', message: 'The request could not be completed because of a conflict.' },
  410: { code: 'gone', message: 'The requested resource is no longer available.' },
  413: { code: 'payload_too_large', message: 'The request is too large.' },
  415: { code: 'unsupported_media_type', message: 'The request content type is not supported.' },
  422: { code: 'unprocessable_content', message: 'The request could not be processed.' },
  429: { code: 'too_many_requests', message: 'Too many requests.' },
};

function readClientStatusCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return error.statusCode;
  }

  return undefined;
}

function isFastifyBadRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    fastifyBadRequestErrorCodes.has(error.code)
  );
}

function errorResponseForClientStatusCode(statusCode: number) {
  const response = genericClientErrorResponses[statusCode];
  if (response !== undefined) {
    return errorResponse(response.code, response.message);
  }

  return errorResponse('client_error', 'The request could not be completed.');
}

export type AppDependencies = Partial<ProxyDependencies> & {
  spotifyFactory?: SpotifyClientFactory;
};

export function buildApp(dependencies: AppDependencies = {}) {
  const app = Fastify({ logger: true });
  const proxyDependencies: ProxyDependencies = {
    fetch: dependencies.fetch ?? fetch,
    backendOrigin: dependencies.backendOrigin ?? process.env.BACKEND_SITE_ORIGIN,
  };
  const spotifyFactory = dependencies.spotifyFactory ?? createSpotifyClient;

  app.setNotFoundHandler(async (_request, reply) => {
    await reply.code(404).send(errorResponse('not_found', 'Route not found.'));
  });

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof ApiError) {
      await reply.code(error.statusCode).send(errorResponse(error.code, error.message));
      return;
    }

    if (isFastifyBadRequestError(error)) {
      await reply.code(400).send(errorResponse('bad_request', 'The request is invalid.'));
      return;
    }

    const clientStatusCode = readClientStatusCode(error);
    if (clientStatusCode !== undefined) {
      await reply.code(clientStatusCode).send(errorResponseForClientStatusCode(clientStatusCode));
      return;
    }

    request.log.error({ err: error }, 'Unhandled API error');
    await reply.code(500).send(errorResponse('internal_error', 'The request could not be completed.'));
  });

  void app.register(registerHealthRoutes);
  void app.register(registerProxyRoutes, proxyDependencies);
  void app.register(registerSpotifyRoutes, { spotifyFactory });
  return app;
}
