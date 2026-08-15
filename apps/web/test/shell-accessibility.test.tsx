import { ChakraProvider, useColorMode } from '@chakra-ui/react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArizonaWildcatIcon } from '../src/components/icons/ArizonaWildcatIcon';
import { CSharpIcon } from '../src/components/icons/CSharpIcon';
import { IuTridentIcon } from '../src/components/icons/IuTridentIcon';
import { JavaIcon } from '../src/components/icons/JavaIcon';
import { KotlinIcon } from '../src/components/icons/KotlinIcon';
import { MicrosoftIcon } from '../src/components/icons/MicrosoftIcon';
import { ReactIcon } from '../src/components/icons/ReactIcon';
import { SpotifyArtist } from '../src/components/projects/spotify/views/SpotifyArtist';
import { SpotifyEpisode } from '../src/components/projects/spotify/views/SpotifyEpisode';
import { SpotifyPlaylist } from '../src/components/projects/spotify/views/SpotifyPlaylist';
import { SpotifyTrack } from '../src/components/projects/spotify/views/SpotifyTrack';
import SpotifyViewAllCategoriesRoute from '../src/routes/projects/spotify/categories';
import { routes } from '../src/router';
import { theme } from '../src/theme';
import { expectNoAxeViolations } from './a11y';
import { renderWithRouter } from './render';

type TestTheme = {
  colors: Record<string, string | Record<string, string>>;
  components: {
    Link: {
      variants?: unknown;
    };
  };
  config?: unknown;
  semanticTokens?: {
    colors?: Record<string, unknown>;
  };
  styles?: {
    global?: unknown;
  };
};

const testTheme = theme as unknown as TestTheme;

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.title = '';
  window.history.replaceState({}, '', '/');
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

    const historyLength = window.history.length;
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
    });
    expect(window.history.length).toBe(historyLength);
    expect(window.location.hash).toBe('');
  });

  it.each([
    ['alt-click', { altKey: true, button: 0 }],
    ['control-click', { button: 0, ctrlKey: true }],
    ['command-click', { button: 0, metaKey: true }],
    ['shift-click', { button: 0, shiftKey: true }],
    ['non-primary click', { button: 1 }],
  ])('does not cancel or focus main for %s on the skip link', async (_name, clickInit) => {
    renderWithRouter(routes, { initialEntries: ['/contact'] });

    await screen.findByRole('heading', {
      level: 1,
      name: /you'd like to contact me/i,
    });
    const skipLink = screen.getByRole('link', {
      name: 'Skip to main content',
    });

    let defaultPreventedBySkipLink: boolean | undefined;
    document.addEventListener('click', (event) => {
      defaultPreventedBySkipLink = event.defaultPrevented;
      event.preventDefault();
    }, { once: true });

    fireEvent.click(skipLink, clickInit);

    expect(defaultPreventedBySkipLink).toBe(false);
    expect(screen.getByRole('main')).not.toHaveFocus();
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

  it.each([
    ['/projects/conversion/base-converter', 'Base Conversion Tool | Adam Ratzman'],
    ['/projects/spotify/callback', 'Completing Spotify sign-in | Adam Ratzman'],
  ])('sets accurate route metadata at %s', async (path, expectedTitle) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderWithRouter(routes, { initialEntries: [path] });

    await waitFor(() => {
      expect(document.title).toBe(expectedTitle);
    });
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

  it('does not add a link underline to the dashed puppy trigger', async () => {
    renderWithRouter(routes, { initialEntries: ['/'] });

    await screen.findByRole('heading', {
      level: 1,
      name: /Hi\. I'm Adam Ratzman, a software engineer at Microsoft\./i,
    });
    const puppyTrigger = screen.getByText('puppy');

    expect(getComputedStyle(puppyTrigger).textDecoration).toBe('none');
  });

  it('removes decoration from Spotify artwork links but not text links', () => {
    renderWithRouter([{
      path: '/',
      Component: () => (
        <ChakraProvider theme={theme}>
          <SpotifyTrack track={{
            album: {
              images: [{ url: 'https://example.com/track.jpg' }],
            },
            artists: [{
              id: 'artist',
              name: 'Track Artist',
            }],
            duration_ms: 120_000,
            id: 'track',
            name: 'Track Name',
            popularity: 50,
            preview_url: null,
          }} />
          <SpotifyPlaylist playlist={{
            description: null,
            id: 'playlist',
            images: [{ url: 'https://example.com/playlist.jpg' }],
            name: 'Playlist Name',
            owner: {
              display_name: 'Playlist Owner',
              id: 'owner',
            },
            tracks: {
              total: 10,
            },
          }} />
          <SpotifyArtist artist={{
            followers: {
              total: 1234,
            },
            genres: ['indie'],
            id: 'artist',
            images: [{ url: 'https://example.com/artist.jpg' }],
            name: 'Artist Name',
            popularity: 42,
          } as unknown as SpotifyApi.ArtistObjectFull} />
          <SpotifyEpisode episode={{
            description: 'Episode description',
            duration_ms: 120_000,
            external_urls: {
              spotify: 'https://open.spotify.com/episode/episode',
            },
            id: 'episode',
            images: [{ url: 'https://example.com/episode.jpg' }],
            name: 'Episode Name',
            release_date: '2026-08-15',
            show: {
              external_urls: {
                spotify: 'https://open.spotify.com/show/show',
              },
              name: 'Example Show',
            },
          } as unknown as SpotifyApi.EpisodeObjectFull} />
        </ChakraProvider>
      ),
    }]);

    for (const accessibleName of [
      'Spotify track preview image',
      'Spotify playlist preview image',
      'Spotify artist preview image',
      'Spotify episode preview image',
    ]) {
      const artworkLink = screen.getByRole('img', {
        name: accessibleName,
      }).closest('a');

      expect(artworkLink).not.toBeNull();
      expect(getComputedStyle(artworkLink as HTMLAnchorElement).textDecoration).toBe('none');
    }

    expect(getComputedStyle(screen.getByRole('link', {
      name: 'Track Name',
    })).textDecoration).toBe('underline');
  });

  it('removes decoration from Spotify category artwork links', async () => {
    renderWithRouter([{
      path: '/',
      loader: () => ({
        categories: [{
          icons: [{ url: 'https://example.com/category.jpg' }],
          id: 'category',
          name: 'Category Name',
        }],
      }),
      Component: () => (
        <ChakraProvider theme={theme}>
          <SpotifyViewAllCategoriesRoute />
        </ChakraProvider>
      ),
    }]);

    const artworkLink = (await screen.findByRole('img', {
      name: 'Spotify category preview image',
    })).closest('a');

    expect(artworkLink).not.toBeNull();
    expect(getComputedStyle(artworkLink as HTMLAnchorElement).textDecoration).toBe('none');
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

  it('keeps the focus ring above 3:1 contrast in light and dark modes', () => {
    const focusRing = testTheme.semanticTokens?.colors?.focusRing;
    const hasModeColors = isSemanticColorPair(focusRing);

    expect(hasModeColors).toBe(true);
    if (!hasModeColors) return;

    expect(contrastRatio(
      resolveThemeColor(focusRing.default),
      resolveThemeColor('white'),
    )).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(
      resolveThemeColor(focusRing._dark),
      resolveThemeColor('gray.800'),
    )).toBeGreaterThanOrEqual(3);
  });

  it('keeps inline link text above 4.5:1 contrast in light and dark modes', () => {
    const link = testTheme.semanticTokens?.colors?.link;
    const hasModeColors = isSemanticColorPair(link);

    expect(hasModeColors).toBe(true);
    if (!hasModeColors) return;

    expect(contrastRatio(
      resolveThemeColor(link.default),
      resolveThemeColor('white'),
    )).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(
      resolveThemeColor(link._dark),
      resolveThemeColor('gray.800'),
    )).toBeGreaterThanOrEqual(4.5);
  });

  it('defines focused navigation and media link variants without a global override', () => {
    const serializedGlobalStyles = JSON.stringify(testTheme.styles?.global ?? {});

    expect(serializedGlobalStyles).not.toContain('.chakra-link[href]');
    expect(serializedGlobalStyles).not.toContain('!important');
    expect(testTheme.components.Link.variants).toMatchObject({
      media: {
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
        },
      },
      navigation: {
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
        },
      },
    });
  });

  it('uses system color mode initially without following later system changes', () => {
    expect(testTheme.config).toMatchObject({
      initialColorMode: 'system',
      useSystemColorMode: false,
    });
  });

  it('keeps an explicit stored color mode override after the system mode changes', async () => {
    const colorScheme = createColorSchemeMediaQuery(true);
    vi.stubGlobal('matchMedia', () => colorScheme.mediaQueryList);
    localStorage.setItem('chakra-ui-color-mode', 'dark');

    render(
      <ChakraProvider theme={theme}>
        <ColorModeProbe />
      </ChakraProvider>,
    );

    expect(await screen.findByTestId('color-mode')).toHaveTextContent('dark');

    act(() => {
      colorScheme.setMatches(false);
    });

    expect(screen.getByTestId('color-mode')).toHaveTextContent('dark');
    expect(localStorage.getItem('chakra-ui-color-mode')).toBe('dark');
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
              outlineColor: 'focusRing',
            },
          },
        },
      },
    });
  });
});

type SemanticColorPair = {
  default: string;
  _dark: string;
};

function ColorModeProbe() {
  const { colorMode } = useColorMode();

  return <span data-testid="color-mode">{colorMode}</span>;
}

function createColorSchemeMediaQuery(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const legacyListeners = new Set<(event: MediaQueryListEvent) => void>();
  let matches = initialMatches;
  const media = '(prefers-color-scheme: dark)';
  const mediaQueryList = {
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      legacyListeners.add(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.forEach(listener => listener(event as MediaQueryListEvent));
      legacyListeners.forEach(listener => listener(event as MediaQueryListEvent));
      return true;
    },
    get matches() {
      return matches;
    },
    media,
    onchange: null,
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      legacyListeners.delete(listener);
    },
  } as MediaQueryList;

  return {
    mediaQueryList,
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      mediaQueryList.dispatchEvent({
        matches,
        media,
      } as MediaQueryListEvent);
    },
  };
}

function isSemanticColorPair(value: unknown): value is SemanticColorPair {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<SemanticColorPair>;
  return typeof candidate.default === 'string' && typeof candidate._dark === 'string';
}

function resolveThemeColor(token: string) {
  if (token.startsWith('#')) return token;

  const [palette, shade] = token.split('.');
  const paletteColor = testTheme.colors[palette ?? token];
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
    ?.map(channel => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received: ${hexColor}`);
  }

  const [red, green, blue] = channels.map(channel => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}
