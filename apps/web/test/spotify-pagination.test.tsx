import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaginatedSpotifyDisplay } from '../src/components/projects/spotify/views/PaginatedSpotifyDisplay';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Spotify pagination navigation', () => {
  it('replaces a failing page with the Spotify fallback', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const dataProducer = vi.fn().mockRejectedValue(new Error('request failed'));
    const { router } = renderWithRouter([
      { path: '/before', Component: () => <h1>Before pagination</h1> },
      {
        path: '/failing',
        Component: () => (
          <PaginatedSpotifyDisplay
            childDataMapper={() => null}
            dataProducer={dataProducer}
            filterNotNull={() => true}
            limitPerPage={10}
            pageOffset={0}
            setLimitPerPage={() => undefined}
            setPageOffset={() => undefined}
          />
        ),
      },
      {
        path: '/projects/spotify',
        Component: () => <h1>Spotify projects</h1>,
      },
    ], {
      initialEntries: ['/before', '/failing'],
      initialIndex: 1,
    });

    expect(await screen.findByRole('heading', {
      name: 'Spotify projects',
    })).toBeVisible();
    expect(router.state.historyAction).toBe('REPLACE');

    await act(async () => {
      await router.navigate(-1);
    });

    expect(await screen.findByRole('heading', {
      name: 'Before pagination',
    })).toBeVisible();
  });
});
