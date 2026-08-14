import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';

describe('proxy routes', () => {
  const apps: Array<ReturnType<typeof buildApp>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  it('rejects Komoot paths outside the allow-list', async () => {
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: vi.fn(),
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/private-admin',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'unknown_backend_path', message: 'Unknown backend path.' },
    });
  });

  it('returns a safe 503 when the activity backend is not configured', async () => {
    const originalBackendOrigin = process.env.BACKEND_SITE_ORIGIN;
    delete process.env.BACKEND_SITE_ORIGIN;

    try {
      const fetchMock = vi.fn();
      const app = buildApp({
        fetch: fetchMock,
      });
      apps.push(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/komoot/activity-stats-by-week',
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        error: {
          code: 'backend_not_configured',
          message: 'The activity backend is not configured.',
        },
      });
    } finally {
      if (originalBackendOrigin === undefined) {
        delete process.env.BACKEND_SITE_ORIGIN;
      } else {
        process.env.BACKEND_SITE_ORIGIN = originalBackendOrigin;
      }
    }
  });

  it('normalizes a bare backend host to https', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"items":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      backendOrigin: 'backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/activity-stats-by-week',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://backend.example/activity-stats-by-week'),
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(response.statusCode).toBe(200);
  });

  it('trims trailing slashes from the backend origin', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"items":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      backendOrigin: 'https://backend.example/',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/activity-stats-by-week',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://backend.example/activity-stats-by-week'),
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(response.statusCode).toBe(200);
  });

  it('forwards query parameters and upstream status', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"items":[]}', {
      status: 206,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/activity-stats-by-week?limit=10&offset=2',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://backend.example/activity-stats-by-week?limit=10&offset=2'),
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(response.statusCode).toBe(206);
    expect(response.body).toBe('{"items":[]}');
  });

  it('keeps repeated query values repeated', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"items":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/activity-stats-by-week?tag=one&tag=two&tag=three',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://backend.example/activity-stats-by-week?tag=one&tag=two&tag=three'),
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(response.statusCode).toBe(200);
  });

  it('preserves upstream content type and non-2xx status codes', async () => {
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: vi.fn(() => Promise.resolve(new Response('upstream sad', {
        status: 502,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }))),
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/latest-komoot-tours-by-month',
    });

    expect(response.statusCode).toBe(502);
    expect(response.headers['content-type']).toContain('text/plain; charset=utf-8');
    expect(response.body).toBe('upstream sad');
  });

  it('returns King County vehicle data', async () => {
    const app = buildApp({
      fetch: vi.fn(() => Promise.resolve(new Response('{"entity":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))),
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/king-county-transit/getVehicleLocations',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ entity: [] });
  });

  it('returns 405 for non-GET komoot requests without touching upstream', async () => {
    const fetchMock = vi.fn();
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/komoot/activity-stats-by-week',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(405);
    expect(response.headers.allow).toBe('GET');
    expect(response.json()).toEqual({
      error: {
        code: 'method_not_allowed',
        message: 'The request method is not allowed.',
      },
    });
  });

  it('returns 405 for HEAD requests without proxying upstream', async () => {
    const fetchMock = vi.fn();
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'HEAD',
      url: '/api/komoot/activity-stats-by-week',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(405);
    expect(response.headers.allow).toBe('GET');
  });

  it('turns upstream fetch rejections into the safe 500 boundary', async () => {
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: vi.fn(() => Promise.reject(new Error('secret upstream failure'))),
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/activity-stats-by-week',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'internal_error', message: 'The request could not be completed.' },
    });
    expect(response.body).not.toContain('secret upstream failure');
  });
});
