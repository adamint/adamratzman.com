import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewActivityByWeek } from '../src/components/projects/fitness/ViewActivityByWeek';
import { ViewToursByMonthComponent } from '../src/components/projects/fitness/ViewToursByMonth';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';

const {
  useActivityStatsByWeekMock,
  useToursByMonthMock,
} = vi.hoisted(() => ({
  useActivityStatsByWeekMock: vi.fn(),
  useToursByMonthMock: vi.fn(),
}));

vi.mock('../src/components/utils/useKomootData', async (importOriginal) => {
  const original = await importOriginal<
    typeof import('../src/components/utils/useKomootData')
  >();

  return {
    ...original,
    useActivityStatsByWeek: useActivityStatsByWeekMock,
    useToursByMonth: useToursByMonthMock,
  };
});

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    disconnect() {}
    observe() {}
    unobserve() {}
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('weekly activity distances', () => {
  it('renders every sport as an accessible table in miles', async () => {
    useActivityStatsByWeekMock.mockReturnValue({
      data: {
        data: [{
          first: {
            weekStartDay: 2,
            weekStartMonth: 1,
            weekEndDay: 8,
            weekEndMonth: 1,
            year: 2026,
          },
          second: {
            Biking: 1609,
            EBiking: 3218,
            Running: 804.5,
            Hiking: 160.9,
            Other: 0,
          },
        }],
        next: null,
        previous: null,
        total: 1,
      },
      error: null,
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <ChakraProvider theme={theme}>
          <ViewActivityByWeek />
        </ChakraProvider>
      </MemoryRouter>,
    );

    const table = screen.getByRole('table', {
      name: 'Weekly activity distance in miles',
    });
    const row = within(table).getByRole('row', {
      name: /1\/2 - 1\/8, 2026/u,
    });

    expect(within(row).getByRole('cell', { name: '1.00' })).toBeVisible();
    expect(within(row).getByRole('cell', { name: '2.00' })).toBeVisible();
    expect(within(row).getByRole('cell', { name: '0.50' })).toBeVisible();
    expect(within(row).getByRole('cell', { name: '0.10' })).toBeVisible();
    expect(within(row).getByRole('cell', { name: '0.00' })).toBeVisible();
    expect(await expectNoAxeViolations(container)).toBeUndefined();
  });

  it('reports when weekly activity is unavailable', async () => {
    useActivityStatsByWeekMock.mockReturnValue({
      data: null,
      error: new Error('Activity request failed.'),
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <ChakraProvider theme={theme}>
          <ViewActivityByWeek />
        </ChakraProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Weekly activity is temporarily unavailable.',
    );
    expect(await expectNoAxeViolations(container)).toBeUndefined();
  });

  it('reports when monthly activity is unavailable', async () => {
    useToursByMonthMock.mockReturnValue({
      data: null,
      error: new Error('Activity request failed.'),
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <ChakraProvider theme={theme}>
          <ViewToursByMonthComponent />
        </ChakraProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Monthly activity is temporarily unavailable.',
    );
    expect(await expectNoAxeViolations(container)).toBeUndefined();
  });

  it('reports when the current month has no activity', async () => {
    useToursByMonthMock.mockReturnValue({
      data: {
        data: [],
        next: null,
        previous: null,
        total: 0,
      },
      error: null,
      isLoading: false,
    });

    const { container } = render(
      <MemoryRouter>
        <ChakraProvider theme={theme}>
          <ViewToursByMonthComponent />
        </ChakraProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'No activities recorded this month.',
    );
    expect(await expectNoAxeViolations(container)).toBeUndefined();
  });
});
