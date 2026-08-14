import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InjectOptions } from 'light-my-request';
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

  it('returns a safe 400 when the Komoot backend path is missing', async () => {
    const fetchMock = vi.fn();
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'bad_request',
        message: 'Missing backend path.',
      },
    });
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

  it('preserves explicit http backend origins', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"items":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      backendOrigin: 'http://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/activity-stats-by-week',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://backend.example/activity-stats-by-week'),
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

  it('forwards custom Accept headers to the Komoot backend', async () => {
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
      url: '/api/komoot/activity-stats-by-week',
      headers: { accept: 'text/csv; q=1, application/json; q=0.8' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://backend.example/activity-stats-by-week'),
      expect.objectContaining({
        headers: { accept: 'text/csv; q=1, application/json; q=0.8' },
      }),
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

  it('rejects multi-segment Komoot paths at the allow-list boundary', async () => {
    const fetchMock = vi.fn();
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/komoot/a/b',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'unknown_backend_path', message: 'Unknown backend path.' },
    });
  });

  it('returns King County vehicle data from the exact S3 URL', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"entity":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/king-county-transit/getVehicleLocations',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions_enhanced.json',
      { headers: { accept: 'application/json' } },
    );
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toBe('{"entity":[]}');
    expect(response.json()).toEqual({ entity: [] });
  });

  it('forwards King County non-2xx responses for non-GET requests', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('route down', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })));
    const app = buildApp({
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/king-county-transit/getVehicleLocations',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions_enhanced.json',
      { headers: { accept: 'application/json' } },
    );
    expect(response.statusCode).toBe(503);
    expect(response.headers['content-type']).toContain('text/plain; charset=utf-8');
    expect(response.body).toBe('route down');
  });

  it('accepts HEAD requests for the King County proxy route', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{"entity":[]}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const app = buildApp({
      fetch: fetchMock,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'HEAD',
      url: '/api/king-county-transit/getVehicleLocations',
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions_enhanced.json',
      { headers: { accept: 'application/json' } },
    );
    expect(response.statusCode).not.toBe(404);
    expect(response.statusCode).not.toBe(405);
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
    expect(response.body).toBe(JSON.stringify({
      error: {
        code: 'method_not_allowed',
        message: 'Method not allowed.',
      },
    }));
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

  it('returns 405 for TRACE requests on Komoot catch-all paths without touching upstream', async () => {
    const fetchMock = vi.fn();
    const app = buildApp({
      backendOrigin: 'https://backend.example',
      fetch: fetchMock,
    });
    apps.push(app);

    const traceRequest = {
      method: 'TRACE',
      url: '/api/komoot/a/b',
    } as unknown as InjectOptions;
    const response = await app.inject(traceRequest);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(405);
    expect(response.headers.allow).toBe('GET');
    expect(response.body).toBe(JSON.stringify({
      error: {
        code: 'method_not_allowed',
        message: 'Method not allowed.',
      },
    }));
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
