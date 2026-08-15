import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, describe, expect, it } from 'vitest';
import dynamic from '../src/compat/next/dynamic';
import Head from '../src/compat/next/head';
import Link from '../src/compat/next/link';
import { useRouter } from '../src/compat/next/router';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
});

describe('temporary Next compatibility shims', () => {
  it('applies head metadata through react-helmet-async', async () => {
    render(
      <HelmetProvider>
        <Head>
          <title>Compatibility title</title>
        </Head>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.title).toBe('Compatibility title');
    });
  });

  it('uses client navigation for internal links', async () => {
    const user = userEvent.setup();
    const { router } = renderWithRouter([
      {
        path: '/',
        Component: () => <Link href="/destination">Destination</Link>,
      },
      {
        path: '/destination',
        Component: () => <h1>Destination page</h1>,
      },
    ]);

    await user.click(screen.getByRole('link', { name: 'Destination' }));

    expect(router.state.location.pathname).toBe('/destination');
    expect(await screen.findByRole('heading', { name: 'Destination page' })).toBeVisible();
  });

  it('preserves repeated query values as arrays while route params win', async () => {
    function QueryProbe() {
      const router = useRouter();
      return <pre>{JSON.stringify(router.query)}</pre>;
    }

    renderWithRouter([
      {
        path: '/users/:userId',
        Component: QueryProbe,
      },
    ], {
      initialEntries: ['/users/path-user?a=1&a=2&userId=query-user'],
    });

    const queryOutput = await screen.findByText(/path-user/);
    expect(JSON.parse(queryOutput.textContent ?? '')).toEqual({
      a: ['1', '2'],
      userId: 'path-user',
    });
  });

  it('loads dynamic components in the browser runtime', async () => {
    const DynamicComponent = dynamic(() => Promise.resolve({
      default: () => <h1>Dynamic component</h1>,
    }), {
      ssr: false,
    });

    render(<DynamicComponent />);

    expect(await screen.findByRole('heading', { name: 'Dynamic component' })).toBeVisible();
  });
});
