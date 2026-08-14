import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

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

    app.post('/api/echo', async () => ({ status: 'ok' }));

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
});
