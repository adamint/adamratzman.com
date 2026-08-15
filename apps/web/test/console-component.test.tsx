import { ChakraProvider } from '@chakra-ui/react';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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
      output: 'I am a software engineer on the C# Project System team in Microsoft\'s Developer Division. I am based in Seattle, along with my dog Ben.',
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
    expect(output).toHaveTextContent('I am a software engineer on the C# Project System team');
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

function formatProjects(projects: Project[]) {
  return projects
    .map(project => `${project.title}: ${project.url}\n${project.description}`)
    .join('\n========\n');
}
