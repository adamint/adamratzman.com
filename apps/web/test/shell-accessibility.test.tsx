import { ChakraProvider } from '@chakra-ui/react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArizonaWildcatIcon } from '../src/components/icons/ArizonaWildcatIcon';
import { CSharpIcon } from '../src/components/icons/CSharpIcon';
import { IuTridentIcon } from '../src/components/icons/IuTridentIcon';
import { JavaIcon } from '../src/components/icons/JavaIcon';
import { KotlinIcon } from '../src/components/icons/KotlinIcon';
import { MicrosoftIcon } from '../src/components/icons/MicrosoftIcon';
import { ReactIcon } from '../src/components/icons/ReactIcon';
import { routes } from '../src/router';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';
import { renderWithRouter } from './render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('site shell accessibility', () => {
  it('exposes named shell landmarks', async () => {
    renderWithRouter(routes, { initialEntries: ['/contact'] });

    expect(await screen.findByRole('heading', {
      level: 1,
      name: /you'd like to contact me/i,
    })).toBeVisible();
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('navigation', {
      name: 'Primary navigation',
    })).toBeVisible();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('contentinfo')).toBeVisible();
  });

  it('puts a working skip link first in the tab order', async () => {
    const user = userEvent.setup();
    renderWithRouter(routes, { initialEntries: ['/contact'] });

    await screen.findByRole('heading', {
      level: 1,
      name: /you'd like to contact me/i,
    });
    await user.tab();

    const skipLink = screen.getByRole('link', {
      name: 'Skip to main content',
    });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
  });

  it.each([
    ['/', /Hi\. I'm Adam Ratzman, a software engineer at Microsoft\./i],
    ['/contact', /you'd like to contact me/i],
    ['/portfolio', /Here are just some of the things I've done\./i],
    ['/projects', 'Projects'],
    ['/academics', 'Academics'],
    ['/projects/calculator', 'Arbitrary Precision Calculator'],
    ['/does-not-exist', /that page wasn't found/i],
  ])('renders one useful h1 at %s', async (path, name) => {
    renderWithRouter(routes, { initialEntries: [path] });

    expect(await screen.findByRole('heading', {
      level: 1,
      name,
    })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('keeps navigation labels and the logo out of the heading outline', async () => {
    renderWithRouter(routes, { initialEntries: ['/contact'] });

    await screen.findByRole('heading', {
      level: 1,
      name: /you'd like to contact me/i,
    });

    expect(screen.queryByRole('heading', {
      name: 'Adam Ratzman',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', {
      name: 'Online Projects',
    })).not.toBeInTheDocument();
  });

  it('uses the required project and section heading levels', async () => {
    renderWithRouter(routes, { initialEntries: ['/projects'] });

    expect(await screen.findByRole('heading', {
      level: 1,
      name: 'Projects',
    })).toBeVisible();
    expect(screen.queryByRole('heading', {
      name: /incomplete list of online projects/i,
    })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'school',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'spotify',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 2,
      name: 'utilities',
    })).toBeVisible();
  });

  it('uses nested portfolio and technical skills headings', async () => {
    renderWithRouter(routes, { initialEntries: ['/portfolio'] });

    expect(await screen.findByRole('heading', {
      level: 2,
      name: 'Selected Projects',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 3,
      name: 'current projects',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 3,
      name: 'past projects',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 4,
      name: 'Spotify Kotlin Wrapper',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 3,
      name: 'Languages and Markup:',
    })).toBeVisible();
  });

  it('uses nested academics headings', async () => {
    renderWithRouter(routes, { initialEntries: ['/academics'] });

    expect(await screen.findByRole('heading', {
      level: 2,
      name: 'My degrees',
    })).toBeVisible();
    expect(screen.getByRole('heading', {
      level: 3,
      name: 'Bachelor of Science in Computer Science',
    })).toBeVisible();
  });

  it.each([
    ['/projects/character-counter', 'Enter your text...'],
    ['/projects/conversion/base-converter', 'I want to convert...'],
  ])('keeps project content beneath the ProjectPage h1 at %s', async (path, headingName) => {
    renderWithRouter(routes, { initialEntries: [path] });

    expect(await screen.findByRole('heading', {
      level: 2,
      name: headingName,
    })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('names the Spotify callback loading h1', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderWithRouter(routes, {
      initialEntries: ['/projects/spotify/callback'],
    });

    expect(await screen.findByRole('heading', {
      level: 1,
      name: 'Completing Spotify sign-in',
    })).toBeVisible();
  });

  it('names footer links and hides their decorative icons', async () => {
    renderWithRouter(routes, { initialEntries: ['/contact'] });

    await screen.findByRole('heading', {
      level: 1,
      name: /you'd like to contact me/i,
    });

    expect(screen.getByRole('link', {
      name: 'Adam Ratzman on LinkedIn',
    })).toHaveAttribute('href', 'https://linkedin.com/in/aratzman');
    expect(screen.getByRole('link', {
      name: 'Adam Ratzman on GitHub',
    })).toHaveAttribute('href', 'https://github.com/adamint');
    expect(screen.getByRole('link', {
      name: 'Email Adam Ratzman',
    })).toHaveAttribute('href', 'mailto:adam@adamratzman.com');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('has no axe violations in the representative shell', async () => {
    const { container } = renderWithRouter(routes, {
      initialEntries: ['/contact'],
    });

    await screen.findByRole('heading', {
      level: 1,
      name: /you'd like to contact me/i,
    });

    await expectNoAxeViolations(container);
  });

  it('hides custom decorative icons from assistive technology', () => {
    const { container } = render(
      <ChakraProvider theme={theme}>
        <ArizonaWildcatIcon />
        <CSharpIcon />
        <IuTridentIcon />
        <JavaIcon />
        <KotlinIcon />
        <MicrosoftIcon />
        <ReactIcon />
      </ChakraProvider>,
    );

    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(7);
  });

  it('defines accessible semantic link styles', () => {
    expect(theme).toMatchObject({
      semanticTokens: {
        colors: {
          link: {
            default: 'blue.700',
            _dark: 'blue.200',
          },
        },
      },
      components: {
        Link: {
          baseStyle: {
            color: 'link',
            textDecoration: 'underline',
            _focusVisible: {
              outline: '2px solid',
            },
          },
        },
      },
    });
  });
});
