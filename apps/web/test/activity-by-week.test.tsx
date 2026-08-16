import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewActivityByWeek } from '../src/components/projects/fitness/ViewActivityByWeek';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';

const { useActivityStatsByWeekMock } = vi.hoisted(() => ({
  useActivityStatsByWeekMock: vi.fn(),
}));

vi.mock('../src/components/utils/useKomootData', async (importOriginal) => {
  const original = await importOriginal<
    typeof import('../src/components/utils/useKomootData')
  >();

  return {
    ...original,
    useActivityStatsByWeek: useActivityStatsByWeekMock,
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
});
