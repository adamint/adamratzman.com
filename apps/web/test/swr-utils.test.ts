import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetcher } from '../src/components/utils/SwrUtils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SWR fetcher', () => {
  it('rejects non-success responses before reading them as data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'No activity data.' }),
      {
        headers: { 'content-type': 'application/json' },
        status: 400,
      },
    )));

    await expect(fetcher('/api/komoot/activity-stats-by-week')).rejects.toThrow(
      'Request failed with status 400.',
    );
  });
});
