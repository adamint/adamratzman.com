import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { ApiError } from '../src/errors.js';

describe('API foundation', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  it('returns a stable health response', async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('keeps HEAD support for the health route', async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({ method: 'HEAD', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('');
  });

  it('serializes unknown route errors without leaking internals', async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/not-real' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'not_found', message: 'Route not found.' },
    });
  });

  it('preserves client error boundaries for malformed JSON', async () => {
    const app = buildApp();
    apps.push(app);

    app.post('/api/echo', () => ({ status: 'ok' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'bad_request', message: 'The request is invalid.' },
    });
  });

  it('preserves non-Spotify empty JSON client errors', async () => {
    const app = buildApp();
    apps.push(app);

    app.post('/api/echo', () => ({ status: 'ok' }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/echo',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'client_error', message: 'The request could not be completed.' },
    });
  });

  it('preserves client error boundaries for validation failures', async () => {
    const app = buildApp();
    apps.push(app);

    app.post(
      '/api/validated-echo',
      {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
      () => ({ status: 'ok' }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/validated-echo',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'bad_request', message: 'The request is invalid.' },
    });
  });

  it('passes through ApiError responses unchanged', async () => {
    const app = buildApp();
    apps.push(app);

    app.get('/api/api-error', () => {
      throw new ApiError(418, 'playlist_teapot', 'No playlists can be brewed.');
    });

    const response = await app.inject({ method: 'GET', url: '/api/api-error' });

    expect(response.statusCode).toBe(418);
    expect(response.json()).toEqual({
      error: { code: 'playlist_teapot', message: 'No playlists can be brewed.' },
    });
  });

  it('returns safe internal error responses for unknown failures', async () => {
    const app = buildApp();
    apps.push(app);

    app.get('/api/boom', () => {
      throw new Error('kaboom');
    });

    const response = await app.inject({ method: 'GET', url: '/api/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'internal_error', message: 'The request could not be completed.' },
    });
  });

  it('preserves 429 client errors without mislabeling them as bad requests', async () => {
    const app = buildApp();
    apps.push(app);

    app.get('/api/too-many-requests', () => {
      throw Object.assign(new Error('slow down'), { statusCode: 429 });
    });

    const response = await app.inject({ method: 'GET', url: '/api/too-many-requests' });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({
      error: { code: 'too_many_requests', message: 'Too many requests.' },
    });
  });
});
