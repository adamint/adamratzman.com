import { ChakraProvider } from '@chakra-ui/react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
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
    expect(screen.getByText('Plain dashed text').tagName).toBe('SPAN');
    expect(screen.getByText('Plain dashed text').closest('button')).toBeNull();
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
      name: 'Show Ben the labradoodle',
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

  it('labels text input and announces character information', () => {
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
    const status = screen.getByRole('status');

    expect(input).toHaveAttribute('id', 'text-to-analyze');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');

    fireEvent.change(input, { target: { value: ' \t\n\u00a0' } });
    expect(status).toHaveTextContent('Words: 0');

    fireEvent.change(input, {
      target: { value: 'one\ttwo\nthree\u00a0four' },
    });
    expect(status).toHaveTextContent('Words: 4');
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
