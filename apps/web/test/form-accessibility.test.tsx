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
import BaseConverterRoute, {
  BASE_CONVERTER_BUTTON_COLORS,
} from '../src/routes/projects/conversion/base-converter';
import { Pagination } from '../src/components/projects/fitness/FitnessUtils';
import { routes } from '../src/router';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';
import { renderWithRouter } from './render';

const EXPECTED_BASE_CONVERTER_BUTTON_COLORS = {
  light: {
    activeBackground: 'orange.900',
    background: 'orange.700',
    border: 'orange.900',
    foreground: 'white',
    hoverBackground: 'orange.800',
  },
  dark: {
    activeBackground: 'orange.100',
    background: 'orange.300',
    border: 'orange.50',
    foreground: 'gray.900',
    hoverBackground: 'orange.200',
  },
} as const;

afterEach(() => {
  cleanup();
  document.title = '';
  localStorage.clear();
  vi.restoreAllMocks();
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

  it('dismisses a pointer-opened tooltip with document Escape while body has focus', async () => {
    render(
      <ChakraProvider theme={theme}>
        <DashedSpanWithTooltip tooltip="Hover Escape tooltip">
          Hover Escape trigger
        </DashedSpanWithTooltip>
      </ChakraProvider>,
    );

    const trigger = screen.getByRole('button', {
      name: 'Hover Escape trigger',
    });
    expect(document.body).toHaveFocus();
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeVisible();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('clears overlay hover ownership after Escape so focus and blur can close again', async () => {
    render(
      <ChakraProvider theme={theme}>
        <DashedSpanWithTooltip tooltip="Lifecycle tooltip">
          Lifecycle trigger
        </DashedSpanWithTooltip>
      </ChakraProvider>,
    );

    const trigger = screen.getByRole('button', {
      name: 'Lifecycle trigger',
    });
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeVisible();
    });
    const tooltip = screen.getByRole('tooltip');
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });
    fireEvent.pointerEnter(tooltip, { pointerType: 'mouse' });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    trigger.focus();
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeVisible();
    });
    trigger.blur();

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('removes the document Escape listener and pending close timer on cleanup', async () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const setTimeout = vi.spyOn(window, 'setTimeout');
    const clearTimeout = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(
      <ChakraProvider theme={theme}>
        <DashedSpanWithTooltip tooltip="Cleanup tooltip">
          Cleanup trigger
        </DashedSpanWithTooltip>
      </ChakraProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Cleanup trigger' });
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    await screen.findByRole('tooltip');
    const keydownListener = addEventListener.mock.calls
      .filter(([type]) => type === 'keydown')
      .at(-1)?.[1];
    expect(keydownListener).toBeTypeOf('function');

    const timeoutCallCount = setTimeout.mock.calls.length;
    fireEvent.blur(trigger);
    const closeTimerCallIndex = setTimeout.mock.calls.findIndex(
      ([, delay], index) => index >= timeoutCallCount && delay === 100,
    );
    const closeTimerHandle = setTimeout.mock.results[closeTimerCallIndex]
      ?.value as number | undefined;
    expect(closeTimerCallIndex).toBeGreaterThanOrEqual(timeoutCallCount);
    expect(closeTimerHandle).toBeDefined();

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'keydown',
      keydownListener,
    );
    expect(clearTimeout).toHaveBeenCalledWith(closeTimerHandle);
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

describe('fitness pagination accessibility', () => {
  it('uses AA-contrast colors for the enabled primary action', () => {
    render(
      <ChakraProvider theme={theme}>
        <Pagination
          next={{ limit: 6, offset: 1 }}
          nextText='Back in time'
          previous={null}
          previousText='Further in time'
          setLimit={() => undefined}
          setOffset={() => undefined}
          switchPreviousAndNext
        >
          Activity results
        </Pagination>
      </ChakraProvider>,
    );

    const button = screen.getByRole('button', { name: 'Back in time' });
    const generatedClass = button.className.split(' ').at(-1);
    const rules = Array.from(document.styleSheets)
      .flatMap(sheet => Array.from(sheet.cssRules)) as CSSStyleRule[];
    const baseRule = rules.find(rule => rule.selectorText === `.${generatedClass}`);
    const hoverRule = rules.find(rule => (
      rule.selectorText?.includes(`.${generatedClass}:hover`)
    ));
    const activeRule = rules.find(rule => (
      rule.selectorText?.includes(`.${generatedClass}:active`)
    ));
    const disabledHoverRule = rules.find(rule => (
      rule.selectorText?.includes(`.${generatedClass}:hover`)
      && (
        rule.selectorText.includes(':disabled')
        || rule.selectorText.includes('[data-disabled]')
      )
    ));
    const disabledActiveRule = rules.find(rule => (
      rule.selectorText?.includes(`.${generatedClass}:active`)
      && (
        rule.selectorText.includes(':disabled')
        || rule.selectorText.includes('[data-disabled]')
      )
    ));

    expect(baseRule?.style.background).toBe(toColorVariable('blue.700'));
    expect(baseRule?.style.color).toBe(toColorVariable('white'));
    expect(hoverRule?.style.background).toBe(toColorVariable('blue.800'));
    expect(activeRule?.style.background).toBe(toColorVariable('blue.900'));
    expect(disabledHoverRule?.style.background).toBe(
      toColorVariable('blue.700'),
    );
    expect(disabledActiveRule?.style.background).toBe(
      toColorVariable('blue.700'),
    );
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

  it('defines AA-contrast inverse button colors with explicit borders', () => {
    expect(BASE_CONVERTER_BUTTON_COLORS)
      .toEqual(EXPECTED_BASE_CONVERTER_BUTTON_COLORS);

    for (const colors of Object.values(BASE_CONVERTER_BUTTON_COLORS)) {
      expect(colors.border).toBeTruthy();
      expect(contrastRatio(
        resolveThemeColor(colors.foreground),
        resolveThemeColor(colors.background),
      )).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(
        resolveThemeColor(colors.foreground),
        resolveThemeColor(colors.hoverBackground),
      )).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(
        resolveThemeColor(colors.foreground),
        resolveThemeColor(colors.activeBackground),
      )).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(Object.entries(EXPECTED_BASE_CONVERTER_BUTTON_COLORS))(
    'emits bounded inverse button styles in %s mode',
    (colorMode, colors) => {
      localStorage.setItem('chakra-ui-color-mode', colorMode);
      renderProjectRoute(<BaseConverterRoute />);

      const button = screen.getByRole('button', {
        name: 'Inverse to/from',
      });
      const style = getComputedStyle(button);
      const generatedClass = button.className.split(' ').at(-1);
      const rules = Array.from(document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules)) as CSSStyleRule[];
      const baseRule = rules.find(rule => rule.selectorText === `.${generatedClass}`);
      const hoverRule = rules.find(rule => (
        rule.selectorText?.includes(`.${generatedClass}:hover`)
      ));
      const activeRule = rules.find(rule => (
        rule.selectorText?.includes(`.${generatedClass}:active`)
      ));
      const focusVisibleRule = rules.find(rule => (
        rule.selectorText?.includes(`.${generatedClass}:focus-visible`)
      ));

      expect(baseRule?.style.background).toBe(toColorVariable(colors.background));
      expect(baseRule?.style.color).toBe(toColorVariable(colors.foreground));
      expect(baseRule?.style.borderColor).toBe(toColorVariable(colors.border));
      expect(hoverRule?.style.background).toBe(
        toColorVariable(colors.hoverBackground),
      );
      expect(activeRule?.style.background).toBe(
        toColorVariable(colors.activeBackground),
      );
      expect(focusVisibleRule?.style.boxShadow).toBe(
        'var(--chakra-shadows-none)',
      );
      expect(focusVisibleRule?.style.outline).toBe('3px solid');
      expect(focusVisibleRule?.style.outlineColor).toBe(
        toColorVariable('focusRing'),
      );
      expect(focusVisibleRule?.style.outlineOffset).toBe('3px');
      expect(style.borderStyle).toBe('solid');
      expect(style.borderWidth).toBe('1px');
    },
  );

  it.each(Object.entries(EXPECTED_BASE_CONVERTER_BUTTON_COLORS))(
    'computes the inverse button active state in %s mode',
    (colorMode, colors) => {
      localStorage.setItem('chakra-ui-color-mode', colorMode);
      renderProjectRoute(<BaseConverterRoute />);

      const button = screen.getByRole('button', {
        name: 'Inverse to/from',
      });
      button.setAttribute('data-hover', '');
      button.setAttribute('data-active', '');

      const style = getComputedStyle(button);
      expect(style.background).toBe(toColorVariable(colors.activeBackground));
      expect(style.color).toBe(toColorVariable(colors.foreground));
    },
  );

  it.each(['light', 'dark'])(
    'shows the semantic focus indicator after keyboard focus in %s mode',
    async (colorMode) => {
      localStorage.setItem('chakra-ui-color-mode', colorMode);
      const user = userEvent.setup();
      renderProjectRoute(<BaseConverterRoute />);

      const button = screen.getByRole('button', {
        name: 'Inverse to/from',
      });
      for (let index = 0; index < 8 && document.activeElement !== button; index++) {
        await user.tab();
      }
      expect(button).toHaveFocus();
      expect(button).toHaveFocus();
      const generatedClass = button.className.split(' ').at(-1);
      const focusVisibleRule = Array.from(document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules))
        .find(rule => (
          (rule as CSSStyleRule).selectorText
            ?.includes(`.${generatedClass}:focus-visible`)
        )) as CSSStyleRule | undefined;
      const focusVisibleAttributeSelector = focusVisibleRule?.selectorText
        .split(',')
        .find(selector => selector.includes('[data-focus-visible]'));

      expect(focusVisibleAttributeSelector).toBeTruthy();
      expect(focusVisibleRule?.style.boxShadow).toBe(
        'var(--chakra-shadows-none)',
      );
      expect(focusVisibleRule?.style.outline).toBe('3px solid');
      expect(focusVisibleRule?.style.outlineColor).toBe(
        toColorVariable('focusRing'),
      );
      expect(focusVisibleRule?.style.outlineOffset).toBe('3px');
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

function resolveThemeColor(token: string) {
  if (token.startsWith('#')) return token;

  const colors = theme.colors as Record<string, string | Record<string, string>>;
  const [palette, shade] = token.split('.');
  const paletteColor = colors[palette ?? token];
  const color = shade && paletteColor && typeof paletteColor !== 'string'
    ? paletteColor[shade]
    : paletteColor;

  if (typeof color !== 'string') {
    throw new Error(`Unknown theme color: ${token}`);
  }

  return color;
}

function toColorVariable(token: string) {
  return `var(--chakra-colors-${token.replace('.', '-')})`;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string) {
  const channels = color.startsWith('#')
    ? color
      .slice(1)
      .match(/.{2}/gu)
      ?.map(channel => Number.parseInt(channel, 16))
    : color.match(/[\d.]+/gu)?.slice(0, 3).map(Number);

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a color with three channels, received: ${color}`);
  }

  const [red, green, blue] = channels.map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}
