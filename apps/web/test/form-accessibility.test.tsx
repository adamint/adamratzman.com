import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashedSpanWithTooltip } from '../src/components/utils/DashedSpanWithTooltip';
import CharacterCounterRoute, { countWords } from '../src/routes/projects/character-counter';
import BaseConverterRoute from '../src/routes/projects/conversion/base-converter';
import { routes } from '../src/router';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  document.title = '';
  vi.useRealTimers();
});

describe('keyboard-accessible triggers', () => {
  it('focuses the tooltip trigger and leaves unlabelled dashed text noninteractive', async () => {
    const user = userEvent.setup();
    render(
      <ChakraProvider theme={theme}>
        <DashedSpanWithTooltip tooltip="Keyboard tooltip">
          Tooltip trigger
        </DashedSpanWithTooltip>
        <DashedSpanWithTooltip>Plain dashed text</DashedSpanWithTooltip>
      </ChakraProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Tooltip trigger' });
    await user.tab();

    expect(trigger).toHaveFocus();
    expect(trigger.tagName).toBe('BUTTON');
    expect(getComputedStyle(trigger).borderBottomStyle).toBe('dashed');
    expect(getComputedStyle(trigger).minWidth).toBe('0px');
    expect(getComputedStyle(trigger).padding).toBe('0px');
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Keyboard tooltip',
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{Enter}');
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Keyboard tooltip',
    );

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Keyboard tooltip',
    );
    expect(screen.getByText('Plain dashed text').tagName).toBe('SPAN');
    expect(screen.getByText('Plain dashed text').closest('button')).toBeNull();
  });

  it('keeps the tooltip open while the pointer moves onto its overlay', async () => {
    render(
      <ChakraProvider theme={theme}>
        <DashedSpanWithTooltip tooltip="Hoverable tooltip">
          Hover trigger
        </DashedSpanWithTooltip>
      </ChakraProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Hover trigger' });
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    const tooltip = await screen.findByRole('tooltip');

    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });
    fireEvent.pointerEnter(tooltip, { pointerType: 'mouse' });
    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 350));
    });
    expect(screen.getByRole('tooltip')).toBeVisible();

    fireEvent.pointerLeave(tooltip, { pointerType: 'mouse' });
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('opens the puppy popover with %s', async (_keyName, key) => {
    const user = userEvent.setup();
    renderWithRouter(routes, { initialEntries: ['/'] });

    await screen.findByRole('heading', {
      level: 1,
      name: /Hi\. I'm Adam Ratzman, a software engineer at Microsoft\./i,
    });
    const trigger = screen.getByRole('button', {
      name: 'puppy',
    });
    trigger.focus();

    await user.keyboard(key);

    const dialog = await screen.findByRole('dialog', {
      name: 'Ben the labradoodle',
    });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveAttribute('aria-label', 'Ben the labradoodle');
  });
});

describe('character counter accessibility', () => {
  it('exports Unicode-aware word counting behavior', () => {
    expect(countWords(' \t\n\u00a0')).toBe(0);
    expect(countWords('one\ttwo\nthree\u00a0four')).toBe(4);
  });

  it('labels text input and updates visible character information immediately', () => {
    renderProjectRoute(<CharacterCounterRoute />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Character Counter',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'Text information',
    })).toBeVisible();
    const input = screen.getByRole('textbox', { name: 'Text to analyze' });
    const information = screen.getByRole('heading', {
      level: 2,
      name: 'Text information',
    }).parentElement as HTMLElement;
    const status = screen.getByRole('status');

    expect(input).toHaveAttribute('id', 'text-to-analyze');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveTextContent('0 characters, 0 words.');
    expect(within(status).queryByRole('heading')).not.toBeInTheDocument();

    fireEvent.change(input, {
      target: { value: 'one\ttwo\nthree\u00a0four' },
    });
    expect(within(information).getByText('Characters:').closest('p')).toHaveTextContent(
      'Characters: 18',
    );
    expect(within(information).getByText('Words:').closest('p')).toHaveTextContent(
      'Words: 4',
    );
    expect(status).toHaveTextContent('0 characters, 0 words.');
  });

  it('debounces a concise character-count announcement across rapid input', () => {
    vi.useFakeTimers();
    renderProjectRoute(<CharacterCounterRoute />);

    const input = screen.getByRole('textbox', { name: 'Text to analyze' });
    const status = screen.getByRole('status');

    fireEvent.change(input, { target: { value: 'o' } });
    act(() => {
      void vi.advanceTimersByTime(300);
    });
    fireEvent.change(input, { target: { value: 'one' } });
    act(() => {
      void vi.advanceTimersByTime(300);
    });
    fireEvent.change(input, { target: { value: 'one two' } });

    expect(status).toHaveTextContent('0 characters, 0 words.');
    act(() => {
      void vi.advanceTimersByTime(499);
    });
    expect(status).toHaveTextContent('0 characters, 0 words.');

    act(() => {
      void vi.advanceTimersByTime(1);
    });
    expect(status).toHaveTextContent('7 characters, 2 words.');
  });

  it('has no axe violations', async () => {
    const { container } = renderProjectRoute(<CharacterCounterRoute />);

    await expectNoAxeViolations(container);
  });
});

describe('base converter accessibility', () => {
  it('labels its fields and rejects an invalid full-string value', async () => {
    const user = userEvent.setup();
    renderProjectRoute(<BaseConverterRoute />);

    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Base converter',
    })).toBeVisible();
    await waitFor(() => {
      expect(document.title).toBe('Base converter | Adam Ratzman');
    });

    const numberInput = screen.getByRole('textbox', {
      name: 'Number to convert',
    });
    const fromBase = screen.getByRole('combobox', { name: 'From base' });
    const toBase = screen.getByRole('combobox', { name: 'To base' });
    expect(numberInput).toHaveAttribute('id', 'number-to-convert');
    expect(fromBase).toHaveAttribute('id', 'base-to-convert-from');
    expect(toBase).toHaveAttribute('id', 'base-to-convert-to');
    await user.selectOptions(
      fromBase,
      '10',
    );
    await user.selectOptions(
      toBase,
      '2',
    );
    fireEvent.change(numberInput, { target: { value: '12x' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You specified an invalid number for that base.',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces successful conversions', async () => {
    const user = userEvent.setup();
    renderProjectRoute(<BaseConverterRoute />);

    const numberInput = screen.getByRole('textbox', {
      name: 'Number to convert',
    });
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'From base' }),
      '16',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'To base' }),
      '10',
    );
    fireEvent.change(numberInput, { target: { value: 'ff' } });

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Result: 255');
  });

  it('remains idle for empty or whitespace-only input after both bases are selected', async () => {
    const user = userEvent.setup();
    renderProjectRoute(<BaseConverterRoute />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'From base' }),
      '10',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'To base' }),
      '2',
    );
    const numberInput = screen.getByRole('textbox', {
      name: 'Number to convert',
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.change(numberInput, { target: { value: ' \t\n' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['+ff', '16', '10', '255'],
    ['-ff', '16', '10', '-255'],
    ['vv', '32', '10', '1023'],
    ['9007199254740993', '10', '16', '20000000000001'],
  ])(
    'converts signed and arbitrary-precision value %s from base %s to base %s',
    async (value, from, to, expected) => {
      const user = userEvent.setup();
      renderProjectRoute(<BaseConverterRoute />);

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'From base' }),
        from,
      );
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'To base' }),
        to,
      );
      fireEvent.change(screen.getByRole('textbox', {
        name: 'Number to convert',
      }), { target: { value } });

      expect(screen.getByRole('status')).toHaveTextContent(
        `Result: ${expected}`,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('has no axe violations', async () => {
    const { container } = renderProjectRoute(<BaseConverterRoute />);

    await expectNoAxeViolations(container);
  });
});

function renderProjectRoute(element: ReactElement) {
  return renderWithRouter([{
    path: '/',
    Component: () => (
      <ChakraProvider theme={theme}>
        {element}
      </ChakraProvider>
    ),
  }]);
}
