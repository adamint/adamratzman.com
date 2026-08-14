import Fastify from 'fastify';
import { ApiError, errorResponse } from './errors.js';
import { registerHealthRoutes } from './routes/health.js';

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

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setNotFoundHandler(async (_request, reply) => {
    await reply.code(404).send(errorResponse('not_found', 'Route not found.'));
  });

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof ApiError) {
      await reply.code(error.statusCode).send(errorResponse(error.code, error.message));
      return;
    }

    const clientStatusCode = readClientStatusCode(error);
    if (clientStatusCode !== undefined) {
      await reply.code(clientStatusCode).send(errorResponse('bad_request', 'The request is invalid.'));
      return;
    }

    request.log.error({ err: error }, 'Unhandled API error');
    await reply.code(500).send(errorResponse('internal_error', 'The request could not be completed.'));
  });

  void app.register(registerHealthRoutes);
  return app;
}
