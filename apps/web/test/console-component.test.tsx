import { ChakraProvider } from '@chakra-ui/react';
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONSOLE_CONTROL_COLORS,
  ConsoleComponent,
  executeConsoleCommand,
} from '../src/components/nav/ConsoleComponent';
import { skills } from '../src/components/home/TechnicalSkillsSection';
import {
  currentProjects,
  pastProjects,
  type Project,
} from '../src/routes/portfolio';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('console commands', () => {
  it('returns the preserved job, skills, education, and project output', () => {
    expect(executeConsoleCommand('job')).toEqual({
      output: 'I am a senior software engineer on the Aspire team in Microsoft\'s Developer Division. I am based in Seattle, along with my dog Ben.',
      shouldClose: false,
    });
    expect(executeConsoleCommand('skills')).toEqual({
      output: `Technologies that I can work with include:\n${Array.from(skills)
        .map(([category, entries]) => `${category}: ${entries.join(', ')}`)
        .join('\n')}`,
      shouldClose: false,
    });
    expect(executeConsoleCommand('education')).toEqual({
      output: 'I have a Bachelor of Science and Master of Science in Computer Science from Indiana University at Bloomington, obtained in December 2021.',
      shouldClose: false,
    });
    expect(executeConsoleCommand('projects past')).toEqual({
      output: formatProjects(pastProjects),
      shouldClose: false,
    });
    expect(executeConsoleCommand('projects present')).toEqual({
      output: formatProjects(currentProjects),
      shouldClose: false,
    });
  });

  it.each([
    'projects',
    'projects future',
    'projects present extra',
  ])('returns usage guidance for invalid project command "%s"', (commandLine) => {
    expect(executeConsoleCommand(commandLine)).toEqual({
      output: 'Incorrect usage. projects past or present',
      shouldClose: false,
    });
  });

  it('lists useful command help', () => {
    expect(executeConsoleCommand('help')).toEqual({
      output: [
        'Available commands:',
        'job - See what my current job is',
        'skills - See what I can do',
        'education - See what my educational background is',
        'projects <past|present> - See past and present projects',
        'exit - Hide the console from view',
        'help - List available commands',
      ].join('\n'),
      shouldClose: false,
    });
  });

  it('returns safe output for exit, unknown, and empty commands', () => {
    expect(executeConsoleCommand('exit')).toEqual({
      output: 'Closing..',
      shouldClose: true,
    });
    expect(executeConsoleCommand('not-a-command')).toEqual({
      output: 'Command not found. Please type help to see available commands',
      shouldClose: false,
    });
    expect(executeConsoleCommand('   ')).toBeNull();
  });
});

describe('accessible site console', () => {
  it('opens by default on desktop with labelled non-modal controls', async () => {
    renderConsole({ desktop: true });

    const consoleRegion = await screen.findByRole('region', {
      name: 'Interactive site console',
    });
    expect(within(consoleRegion).getByRole('heading', {
      name: 'Interactive site console',
    })).toBeVisible();
    expect(within(consoleRegion).getByRole('button', {
      name: 'Close interactive site console',
    })).toBeVisible();
    expect(within(consoleRegion).getByRole('textbox', {
      name: 'Console command',
    })).toBeVisible();
    expect(within(consoleRegion).getByRole('button', {
      name: 'Run command',
    })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Open interactive site console',
    })).not.toBeInTheDocument();
  });

  it('submits through the labelled form, clears input, and announces plain-text output', async () => {
    const user = userEvent.setup();
    const { container } = renderConsole({ desktop: true });
    const input = await screen.findByRole('textbox', {
      name: 'Console command',
    });

    await user.type(input, 'job');
    await user.click(screen.getByRole('button', { name: 'Run command' }));

    const output = screen.getByRole('log', { name: 'Console output' });
    expect(output).toHaveAttribute('aria-live', 'polite');
    expect(output).toHaveTextContent('> job');
    expect(output).toHaveTextContent('I am a senior software engineer on the Aspire team');
    expect(input).toHaveValue('');

    await user.type(input, '<img src=x alt=hacked>');
    await user.keyboard('{Enter}');

    expect(output).toHaveTextContent('> <img src=x alt=hacked>');
    expect(output).toHaveTextContent(
      'Command not found. Please type help to see available commands',
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('does nothing for an empty submission', async () => {
    const user = userEvent.setup();
    renderConsole({ desktop: true });
    const input = await screen.findByRole('textbox', {
      name: 'Console command',
    });

    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: 'Run command' }));

    expect(within(screen.getByRole('log', {
      name: 'Console output',
    })).queryByText(/^>/u)).not.toBeInTheDocument();
    expect(input).toHaveValue('   ');
  });

  it('starts closed when the stored preference is false', async () => {
    localStorage.setItem('show_console', 'false');
    renderConsole({ desktop: true });

    expect(await screen.findByRole('button', {
      name: 'Open interactive site console',
    })).toBeVisible();
    expect(screen.queryByRole('region', {
      name: 'Interactive site console',
    })).not.toBeInTheDocument();
  });

  it('persists reopening and closing', async () => {
    const user = userEvent.setup();
    localStorage.setItem('show_console', 'false');
    renderConsole({ desktop: true });

    await user.click(await screen.findByRole('button', {
      name: 'Open interactive site console',
    }));

    expect(await screen.findByRole('region', {
      name: 'Interactive site console',
    })).toBeVisible();
    expect(localStorage.getItem('show_console')).toBe('true');

    await user.click(screen.getByRole('button', {
      name: 'Close interactive site console',
    }));

    expect(await screen.findByRole('button', {
      name: 'Open interactive site console',
    })).toBeVisible();
    expect(localStorage.getItem('show_console')).toBe('false');
  });

  it('keeps the open panel and closed trigger below modal content', async () => {
    const user = userEvent.setup();
    const zIndices = (theme as {
      zIndices: { modal: number; overlay: number };
    }).zIndices;
    renderConsole({ desktop: true });

    expect(zIndices.overlay).toBeLessThan(zIndices.modal);
    const consoleRegion = await screen.findByRole('region', {
      name: 'Interactive site console',
    });
    expect(getComputedStyle(consoleRegion).zIndex).toBe(
      'var(--chakra-zIndices-overlay)',
    );

    await user.click(screen.getByRole('button', {
      name: 'Close interactive site console',
    }));

    const openButton = await screen.findByRole('button', {
      name: 'Open interactive site console',
    });
    expect(getComputedStyle(openButton).zIndex).toBe(
      'var(--chakra-zIndices-overlay)',
    );
  });

  it('moves focus from the removed launcher to the command input after opening', async () => {
    const user = userEvent.setup();
    const requestAnimationFrame = stubDeferredRequestAnimationFrame();
    localStorage.setItem('show_console', 'false');
    renderConsole({ desktop: true });

    const openButton = await screen.findByRole('button', {
      name: 'Open interactive site console',
    });
    requestAnimationFrame.mockClear();
    await user.click(openButton);

    const input = await screen.findByRole('textbox', {
      name: 'Console command',
    });
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(input).not.toHaveFocus();

    act(() => {
      requestAnimationFrame.mock.calls[0]?.[0](0);
    });

    expect(input).toHaveFocus();
  });

  it('does not steal focus when the user moves to another control while opening', async () => {
    const user = userEvent.setup();
    const requestAnimationFrame = stubDeferredRequestAnimationFrame();
    localStorage.setItem('show_console', 'false');
    stubMedia(true);

    render(
      <ChakraProvider theme={theme}>
        <button type='button'>Persistent control</button>
        <ConsoleComponent />
      </ChakraProvider>,
    );

    const openButton = await screen.findByRole('button', {
      name: 'Open interactive site console',
    });
    requestAnimationFrame.mockClear();
    await user.click(openButton);
    const persistentControl = screen.getByRole('button', {
      name: 'Persistent control',
    });
    await user.click(persistentControl);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    act(() => {
      requestAnimationFrame.mock.calls[0]?.[0](0);
    });

    expect(persistentControl).toHaveFocus();
  });

  it.each(Object.entries(CONSOLE_CONTROL_COLORS))(
    'uses bounded, AA-contrast console controls in %s mode',
    (_colorMode, colors) => {
      expect(colors.primary.border).toBeTruthy();
      expect(colors.accent.border).toBeTruthy();
      expect(colors.secondary.border).toBeTruthy();
      expectColorPairToMeetAa(
        colors.primary.foreground,
        colors.primary.background,
      );
      expectColorPairToMeetAa(
        colors.primary.foreground,
        colors.primary.hoverBackground,
      );
      expectColorPairToMeetAa(
        colors.accent.foreground,
        colors.accent.background,
      );
      expectColorPairToMeetAa(
        colors.accent.foreground,
        colors.accent.hoverBackground,
      );
      expectColorPairToMeetAa(
        colors.secondary.foreground,
        colors.secondary.background,
      );
      expectColorPairToMeetAa(
        colors.secondary.foreground,
        colors.secondary.hoverBackground,
      );
    },
  );

  it('returns focus to the persistent trigger after the close button is used', async () => {
    const user = userEvent.setup();
    const requestAnimationFrame = stubRequestAnimationFrame();
    renderConsole({ desktop: true });

    requestAnimationFrame.mockClear();
    await user.click(await screen.findByRole('button', {
      name: 'Close interactive site console',
    }));

    const openButton = await screen.findByRole('button', {
      name: 'Open interactive site console',
    });
    await waitFor(() => expect(openButton).toHaveFocus());
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('returns focus to the persistent trigger after the exit command', async () => {
    const user = userEvent.setup();
    const requestAnimationFrame = stubRequestAnimationFrame();
    renderConsole({ desktop: true });
    const input = await screen.findByRole('textbox', {
      name: 'Console command',
    });

    requestAnimationFrame.mockClear();
    await user.type(input, 'exit');
    await user.keyboard('{Enter}');

    const openButton = await screen.findByRole('button', {
      name: 'Open interactive site console',
    });
    await waitFor(() => expect(openButton).toHaveFocus());
    expect(localStorage.getItem('show_console')).toBe('false');
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('omits the trigger and panel on mobile without flashing console content', async () => {
    localStorage.setItem('show_console', 'true');
    const matchMedia = stubMedia(false);

    render(
      <ChakraProvider theme={theme}>
        <ConsoleComponent />
      </ChakraProvider>,
    );

    expect(screen.queryByRole('region', {
      name: 'Interactive site console',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Open interactive site console',
    })).not.toBeInTheDocument();
    await waitFor(() => expect(matchMedia).toHaveBeenCalled());
    expect(screen.queryByRole('region', {
      name: 'Interactive site console',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Open interactive site console',
    })).not.toBeInTheDocument();
  });

  it('has no representative axe violations', async () => {
    const { container } = renderConsole({ desktop: true });

    await screen.findByRole('region', {
      name: 'Interactive site console',
    });
    await expectNoAxeViolations(container);
  });
});

function renderConsole({ desktop }: { desktop: boolean }) {
  stubMedia(desktop);
  if (!window.requestAnimationFrame) {
    stubRequestAnimationFrame();
  }

  return render(
    <ChakraProvider theme={theme}>
      <ConsoleComponent />
    </ChakraProvider>,
  );
}

function stubMedia(desktop: boolean) {
  const matchMedia = vi.fn((query: string): MediaQueryList => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: desktop && query.includes('min-width'),
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return matchMedia;
}

function stubRequestAnimationFrame() {
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    window.setTimeout(() => callback(0), 0);
    return 1;
  });
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  return requestAnimationFrame;
}

function stubDeferredRequestAnimationFrame() {
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    void callback;
    return 1;
  });
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  return requestAnimationFrame;
}

function expectColorPairToMeetAa(foreground: string, background: string) {
  expect(contrastRatio(
    resolveThemeColor(foreground),
    resolveThemeColor(background),
  )).toBeGreaterThanOrEqual(4.5);
}

function resolveThemeColor(token: string) {
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

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hexColor: string) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/gu)
    ?.map(channel => Number.parseInt(channel, 16) / 255)
    .map(channel => (
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received: ${hexColor}`);
  }

  return (0.2126 * channels[0])
    + (0.7152 * channels[1])
    + (0.0722 * channels[2]);
}

function formatProjects(projects: Project[]) {
  return projects
    .map(project => `${project.title}: ${project.url}\n${project.description}`)
    .join('\n========\n');
}
