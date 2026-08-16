import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import {
  installSpotifyFixtures,
  spotifyFixtureIds,
  type FixtureColorMode,
  type SpotifyFixtureState,
} from './spotify-fixtures';

const desktopProject = 'desktop-chromium';
const mobileProject = 'mobile-chromium';
const wcagTags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
];

type RuntimeIssues = {
  consoleErrors: string[];
  expectedConsoleErrors: RegExp[];
  pageErrors: string[];
  unexpectedAppRequests: string[];
};

type PublicRoute = {
  expectedPath?: string;
  name: string;
  path: string;
  settle?: (
    page: Page,
    fixtures: SpotifyFixtureState,
  ) => Promise<void>;
};

const runtimeIssuesByPage = new WeakMap<Page, RuntimeIssues>();
const spotifyFixturesByPage = new WeakMap<Page, SpotifyFixtureState>();

const publicRoutes: PublicRoute[] = [
  {
    name: 'home',
    path: '/',
    settle: async page => {
      await expect(page.getByText('Activity by week', { exact: false })).toBeVisible();
      await expect(page.getByText('So far this month', { exact: false })).toBeVisible();
    },
  },
  { name: 'academics index', path: '/academics' },
  { name: 'academics bachelors', path: '/academics/bachelors' },
  { name: 'academics masters', path: '/academics/masters' },
  { name: 'academics mba', path: '/academics/mba' },
  { name: 'contact', path: '/contact' },
  { name: 'portfolio', path: '/portfolio' },
  { name: 'projects', path: '/projects' },
  { name: 'calculator', path: '/projects/calculator' },
  { name: 'character counter', path: '/projects/character-counter' },
  { name: 'base converter', path: '/projects/conversion/base-converter' },
  {
    expectedPath: '/projects',
    name: 'Spotify redirect',
    path: '/projects/spotify',
  },
  {
    name: 'Spotify callback',
    path: '/projects/spotify/callback',
    settle: async page => {
      await expect(page.getByText("If you're not redirected", {
        exact: false,
      })).toBeVisible();
    },
  },
  {
    name: 'Spotify categories',
    path: '/projects/spotify/categories',
  },
  {
    name: 'Spotify category',
    path: `/projects/spotify/categories/${spotifyFixtureIds.category}`,
  },
  {
    name: 'Spotify artist',
    path: `/projects/spotify/artists/${spotifyFixtureIds.artist}`,
  },
  {
    name: 'Spotify generate token',
    path: '/projects/spotify/generate-token',
    settle: async page => {
      await expect(page.locator(
        'a[href^="https://accounts.spotify.com/authorize"]',
      )).toBeVisible();
    },
  },
  {
    name: 'Spotify genres',
    path: '/projects/spotify/genres/list',
  },
  {
    name: 'Spotify my top',
    path: '/projects/spotify/mytop',
    settle: settleSpotifyResults,
  },
  {
    name: 'Spotify playlist',
    path: `/projects/spotify/playlists/${spotifyFixtureIds.playlist}`,
    settle: settleSpotifyResults,
  },
  {
    name: 'Spotify recommendations',
    path: '/projects/spotify/recommend',
    settle: async (_page, fixtures) => {
      await expect.poll(() => fixtures.api.seedGenres.calls).toBe(1);
    },
  },
  {
    name: 'Spotify create playlist',
    path: [
      '/projects/spotify/recommend/create-playlist',
      `?trackIds=${spotifyFixtureIds.trackIds[0]}`,
      `&trackIds=${spotifyFixtureIds.trackIds[1]}`,
    ].join(''),
    settle: async page => {
      await expect(page.getByRole('button', {
        exact: true,
        name: 'Create playlist',
      })).toBeVisible();
    },
  },
  {
    name: 'Spotify track',
    path: `/projects/spotify/tracks/${spotifyFixtureIds.track}`,
    settle: async page => {
      await expect(page.locator(
        'iframe[title="Spotify player preview iframe"]',
      )).toBeVisible();
    },
  },
  {
    name: 'Spotify user',
    path: `/projects/spotify/users/${spotifyFixtureIds.user}`,
    settle: settleSpotifyResults,
  },
  {
    name: 'missing page',
    path: '/accessibility-matrix-missing-page',
    settle: async page => {
      await expect(page.locator('iframe[title="Rick Astley"]')).toBeVisible();
    },
  },
];

test('explicit matrix covers every public route shape', () => {
  expect(
    publicRoutes.map(route => normalizeRouterPath(route.path)).sort(),
  ).toEqual(readPublicRouterPaths().sort());
});

test.beforeEach(({ page }) => {
  const runtimeIssues: RuntimeIssues = {
    consoleErrors: [],
    expectedConsoleErrors: [],
    pageErrors: [],
    unexpectedAppRequests: [],
  };
  runtimeIssuesByPage.set(page, runtimeIssues);

  page.on('console', message => {
    if (message.type() === 'error') {
      const text = message.text();
      const expectedIndex = runtimeIssues.expectedConsoleErrors.findIndex(
        pattern => pattern.test(text),
      );
      if (expectedIndex >= 0) {
        runtimeIssues.expectedConsoleErrors.splice(expectedIndex, 1);
      } else {
        runtimeIssues.consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', error => {
    runtimeIssues.pageErrors.push(error.stack ?? error.message);
  });
});

test.afterEach(({ page }) => {
  const runtimeIssues = runtimeIssuesByPage.get(page);
  expect(
    runtimeIssues?.pageErrors ?? [],
    'The page raised an uncaught error.',
  ).toEqual([]);
  expect(
    runtimeIssues?.consoleErrors ?? [],
    'The page logged an unexpected console error.',
  ).toEqual([]);
  expect(
    runtimeIssues?.expectedConsoleErrors.map(pattern => pattern.toString()) ?? [],
    'An explicitly expected console error did not occur.',
  ).toEqual([]);
  expect(
    runtimeIssues?.unexpectedAppRequests ?? [],
    'The app made an unexpected deterministic fixture request.',
  ).toEqual([]);

  const spotifyFixtures = spotifyFixturesByPage.get(page);
  expect(
    spotifyFixtures?.unexpectedRequests ?? [],
    'The app made a Spotify request that is not covered by the fixture contract.',
  ).toEqual([]);
});

test.describe('public route accessibility matrix', () => {
  for (const colorMode of ['light', 'dark'] as const) {
    for (const route of publicRoutes) {
      test(`${colorMode}: ${route.name}`, async ({ page }) => {
        const fixtures = await preparePage(page, colorMode);

        await visitRoute(page, route, fixtures);
        await assertRequestedColorMode(page, colorMode);

        const main = page.getByRole('main', { name: 'Main content' });
        await expect(main).toBeVisible();
        const headings = main.getByRole('heading', { level: 1 });
        await expect(headings).toHaveCount(1);
        const headingText = (await headings.textContent())?.trim() ?? '';
        expect(
          headingText.length,
          `Expected a useful h1 for ${route.path}, received "${headingText}".`,
        ).toBeGreaterThan(2);

        await assertNoSeriousAxeViolations(
          page,
          `${colorMode} ${route.path}`,
        );
      });
    }
  }
});

test.describe('keyboard and interaction proof', () => {
  test('skip navigation is first and moves focus to main', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'light');
    await visitRoute(page, publicRoutes[0], fixtures);

    const skipLink = page.getByRole('link', {
      name: 'Skip to main content',
    });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await skipLink.press('Enter');
    await expect(page.getByRole('main', { name: 'Main content' })).toBeFocused();
  });

  test('mobile navigation opens by keyboard and keeps exact active state', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, mobileProject);
    const fixtures = await preparePage(page, 'dark');
    await visitRoute(page, findPublicRoute('projects'), fixtures);

    const openMenu = page.getByRole('button', {
      name: 'Open navigation menu',
    });
    await openMenu.focus();
    await openMenu.press('Enter');

    const projectsLink = page.getByRole('menuitem', {
      name: 'Online Projects',
    });
    const portfolioLink = page.getByRole('menuitem', {
      name: 'Portfolio',
    });
    await expect(projectsLink).toHaveAttribute('aria-current', 'page');
    await expect(portfolioLink).not.toHaveAttribute('aria-current', 'page');

    await portfolioLink.focus();
    await portfolioLink.press('Enter');
    await expect(page).toHaveURL(/\/portfolio$/u);
    const reopenedMenuButton = page.getByRole('button', {
      name: 'Open navigation menu',
    });
    await expect(reopenedMenuButton).toBeVisible();
    await expect(page.getByRole('menu')).toBeHidden();

    await reopenedMenuButton.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', {
      name: 'Portfolio',
    })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('menuitem', {
      name: 'Online Projects',
    })).not.toHaveAttribute('aria-current', 'page');
  });

  test('tooltip and popover dismiss with Escape and return focus', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'light');
    await visitRoute(page, publicRoutes[0], fixtures);

    const tooltipTrigger = page.getByRole('button', { name: 'Adam Ratzman' });
    await tooltipTrigger.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await tooltipTrigger.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(tooltipTrigger).toBeFocused();

    const popoverTrigger = page.getByRole('button', { name: 'puppy' });
    await popoverTrigger.focus();
    await popoverTrigger.press('Enter');
    await expect(page.getByRole('dialog', {
      name: 'Ben the labradoodle',
    })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', {
      name: 'Ben the labradoodle',
    })).toBeHidden();
    await expect(popoverTrigger).toBeFocused();
  });

  test('Spotify paginator announces and owns focus without stealing it', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'light');
    await visitRoute(page, findPublicRoute('Spotify my top'), fixtures);

    const results = page.getByRole('region', { name: 'Spotify results' });
    const nextPage = page.getByRole('button', { name: 'Next page' });
    const previousPage = page.getByRole('button', { name: 'Previous page' });
    const pageSize = page.getByRole('combobox', { name: 'Results per page' });
    await expect(previousPage).toBeDisabled();
    await expect(nextPage).toBeEnabled();
    await expect(pageSize).toHaveValue('10');
    await expect(page.getByRole('status', {
      name: 'Page 1 of 3',
    })).toBeVisible();

    const secondPageGate = fixtures.spotify.topTracks.deferNext();
    await nextPage.click();
    await secondPageGate.started;
    await expect(page.locator('[role="status"]').filter({
      hasText: 'Loading Spotify results',
    })).toHaveText('Loading Spotify results');
    secondPageGate.release();
    await expect(page.getByRole('status', {
      name: 'Page 2 of 3',
    })).toBeVisible();
    await expect(results).toBeFocused();

    const thirdPageGate = fixtures.spotify.topTracks.deferNext();
    await page.getByRole('button', { name: 'Next page' }).click();
    await thirdPageGate.started;
    const timeRange = page.getByRole('combobox', { name: 'Time Range' });
    await timeRange.focus();
    thirdPageGate.release();
    await expect(page.getByRole('status', {
      name: 'Page 3 of 3',
    })).toBeVisible();
    await expect(timeRange).toBeFocused();
    expect(fixtures.spotify.topTracks.calls).toBe(3);
  });

  test('interactive console announces output and exit restores focus', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'dark');
    await visitRoute(page, findPublicRoute('projects'), fixtures);

    const openConsole = page.getByRole('button', {
      name: 'Open interactive site console',
    });
    await openConsole.focus();
    await openConsole.press('Enter');

    const consoleRegion = page.getByRole('region', {
      name: 'Interactive site console',
    });
    const command = page.getByRole('textbox', { name: 'Console command' });
    const output = page.getByRole('log', { name: 'Console output' });
    await expect(consoleRegion).toBeVisible();
    await expect(command).toBeFocused();
    await expect(output).toHaveAttribute('aria-live', 'polite');

    await command.fill('help');
    await page.getByRole('button', { name: 'Run command' }).click();
    await expect(output).toContainText('Available commands:');
    await expect(command).toHaveValue('');

    await command.fill('exit');
    await command.press('Enter');
    await expect(consoleRegion).toBeHidden();
    await expect(page.getByRole('button', {
      name: 'Open interactive site console',
    })).toBeFocused();
  });

  test('recommendation combobox supports selection, removal, Escape, and blur', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'light');
    await visitRoute(page, findPublicRoute('Spotify recommendations'), fixtures);

    const combobox = page.getByRole('combobox', {
      name: 'Spotify tracks, artists, or genres',
    });
    await combobox.fill('indie');
    const listbox = page.getByRole('listbox', {
      name: 'Spotify search suggestions',
    });
    const trackOption = page.getByRole('option', {
      name: 'Indie Track by Fixture Artist',
    });
    await expect(trackOption).toBeVisible();
    const listboxId = await listbox.getAttribute('id');
    expect(listboxId).not.toBeNull();
    await expect(combobox).toHaveAttribute('aria-controls', listboxId ?? '');
    await expect(combobox).toHaveAttribute('aria-owns', listboxId ?? '');
    await expect(combobox).toHaveAttribute('aria-expanded', 'true');

    await combobox.press('ArrowDown');
    await expect(combobox).toHaveAttribute(
      'aria-activedescendant',
      await trackOption.getAttribute('id') ?? '',
    );
    await combobox.press('Enter');

    const removeTrack = page.getByRole('button', {
      name: 'Remove Indie Track by Fixture Artist from seeds',
    });
    await expect(removeTrack).toBeVisible();
    await removeTrack.focus();
    await removeTrack.press('Enter');
    await expect(combobox).toBeFocused();

    await combobox.fill('indie');
    await expect(listbox).toBeVisible();
    await combobox.press('Escape');
    await expect(combobox).toHaveValue('');
    await expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await expect(listbox).toBeHidden();

    await combobox.fill('indie');
    await expect(listbox).toBeVisible();
    await page.getByRole('checkbox', { name: 'Acousticness' }).focus();
    await expect(listbox).toBeHidden();
  });

  test('track attributes are labelled and keyboard operable', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'dark');
    await visitRoute(page, findPublicRoute('Spotify recommendations'), fixtures);

    const acousticness = page.getByRole('checkbox', {
      name: 'Acousticness',
    });
    await acousticness.focus();
    await acousticness.press('Space');
    await expect(acousticness).toBeChecked();

    const mode = page.getByRole('combobox', {
      name: 'Acousticness tuning mode',
    });
    const slider = page.getByRole('slider', {
      name: 'Acousticness value',
    });
    await expect(mode).toHaveValue('target');
    await mode.focus();
    await mode.press('m');
    await expect(mode).toHaveValue('min');

    const initialValue = Number(await slider.getAttribute('aria-valuenow'));
    await slider.focus();
    await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute(
      'aria-valuenow',
      String(initialValue + 0.01),
    );
  });

  test('playlist creation remains authoritative after Escape closes it', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'light');
    await visitRoute(page, findPublicRoute('Spotify create playlist'), fixtures);

    const trigger = page.getByRole('button', {
      exact: true,
      name: 'Create playlist',
    });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByLabel('Playlist name').fill('Deferred accessibility playlist');

    const createGate = fixtures.spotify.createPlaylist.deferNext();
    await page.getByRole('button', {
      exact: true,
      name: 'Create Playlist',
    }).click();
    await createGate.started;

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    createGate.release();

    await expect(page.getByText('Successfully created playlist.')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      sessionStorage.getItem('spotify_pending_playlist')
    ))).toBeNull();
    expect(fixtures.spotify.createPlaylist.calls).toBe(1);
    expect(fixtures.spotify.replaceTracks.calls).toBe(1);
  });

  test('playlist overlay close preserves recoverable replacement retry', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    const fixtures = await preparePage(page, 'dark');
    await visitRoute(page, findPublicRoute('Spotify create playlist'), fixtures);

    const trigger = page.getByRole('button', {
      exact: true,
      name: 'Create playlist',
    });
    await trigger.click();
    await page.getByLabel('Playlist name').fill('Recoverable accessibility playlist');

    const replacementGate = fixtures.spotify.replaceTracks.deferNext();
    fixtures.spotify.replaceTracks.failNext();
    allowConsoleError(
      page,
      /^Failed to load resource: the server responded with a status of 500 \(Internal Server Error\)$/u,
    );
    await page.getByRole('button', {
      exact: true,
      name: 'Create Playlist',
    }).click();
    await replacementGate.started;

    await page.locator('.chakra-modal__content-container').click({
      position: { x: 5, y: 5 },
    });
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
    replacementGate.release();
    await expect.poll(() => page.evaluate(() => (
      sessionStorage.getItem('spotify_pending_playlist')
    ))).toContain(spotifyFixtureIds.createdPlaylist);

    await trigger.click();
    await expect(page.getByRole('alert').filter({
      hasText: 'Your playlist was created, but its tracks are not confirmed.',
    })).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry adding tracks' });
    await retry.focus();
    await retry.press('Enter');

    await expect(page.getByText('Successfully created playlist.')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (
      sessionStorage.getItem('spotify_pending_playlist')
    ))).toBeNull();
    expect(fixtures.spotify.createPlaylist.calls).toBe(1);
    expect(fixtures.spotify.replaceTracks.calls).toBe(2);
  });
});

test.describe('open widget axe proof', () => {
  for (const colorMode of ['light', 'dark'] as const) {
    test(`${colorMode}: transient widgets`, async ({ page }, testInfo) => {
      requireProject(testInfo, desktopProject);
      const fixtures = await preparePage(page, colorMode);
      await visitRoute(page, publicRoutes[0], fixtures);

      const tooltipTrigger = page.getByRole('button', { name: 'Adam Ratzman' });
      await tooltipTrigger.focus();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveCSS('opacity', '1');
      await assertNoSeriousAxeViolations(page, `${colorMode} open tooltip`);
      await tooltipTrigger.press('Escape');
      await expect(tooltip).toBeHidden();

      const puppy = page.getByRole('button', { name: 'puppy' });
      await puppy.press('Enter');
      const puppyDialog = page.getByRole('dialog', {
        name: 'Ben the labradoodle',
      });
      await expect(puppyDialog).toBeVisible();
      await expect(puppyDialog).toHaveCSS('opacity', '1');
      await assertNoSeriousAxeViolations(page, `${colorMode} open popover`);
      await page.keyboard.press('Escape');
      await expect(puppyDialog).toBeHidden();

      await page.getByRole('button', {
        name: 'Open interactive site console',
      }).click();
      await expect(page.getByRole('region', {
        name: 'Interactive site console',
      })).toBeVisible();
      await assertNoSeriousAxeViolations(page, `${colorMode} open console`);
      await page.getByRole('button', {
        name: 'Close interactive site console',
      }).click();

      await visitRoute(
        page,
        findPublicRoute('Spotify recommendations'),
        fixtures,
      );
      const combobox = page.getByRole('combobox', {
        name: 'Spotify tracks, artists, or genres',
      });
      await combobox.fill('indie');
      await expect(page.getByRole('listbox', {
        name: 'Spotify search suggestions',
      })).toBeVisible();
      const acousticness = page.getByRole('checkbox', { name: 'Acousticness' });
      await acousticness.focus();
      await acousticness.press('Space');
      await combobox.fill('indie');
      await assertNoSeriousAxeViolations(
        page,
        `${colorMode} open recommendations`,
      );

      await visitRoute(
        page,
        findPublicRoute('Spotify create playlist'),
        fixtures,
      );
      const spotifyLogout = page.getByRole('button', {
        name: 'Log out of Spotify',
      });
      await spotifyLogout.hover();
      await assertNoSeriousAxeViolations(
        page,
        `${colorMode} hovered Spotify logout`,
      );
      await page.mouse.move(0, 0);

      await page.getByRole('button', {
        exact: true,
        name: 'Create playlist',
      }).click();
      const playlistDialog = page.getByRole('dialog');
      await expect(playlistDialog).toBeVisible();
      await expect(playlistDialog).toHaveCSS('opacity', '1');
      await assertNoSeriousAxeViolations(page, `${colorMode} open modal`);
    });
  }

  test('dark: unauthenticated Spotify login hover', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    await preparePage(page, 'dark', false);
    await page.goto('/projects/spotify/mytop');

    const login = page.getByRole('button', { name: 'Log in with Spotify' });
    await expect(login).toBeVisible();
    await login.hover();
    await assertNoSeriousAxeViolations(
      page,
      'dark hovered unauthenticated Spotify login',
    );
  });
});

test.describe('320px reflow proof', () => {
  const reflowRoutes: Array<{
    colorMode: FixtureColorMode;
    focus: (page: Page) => Locator;
    routeName: string;
  }> = [
    {
      colorMode: 'light',
      focus: page => page.getByRole('button', { name: 'Adam Ratzman' }),
      routeName: 'home',
    },
    {
      colorMode: 'dark',
      focus: page => page.getByRole('link', { name: 'Academic record' }),
      routeName: 'projects',
    },
    {
      colorMode: 'light',
      focus: page => page.getByRole('textbox', { name: 'Text to analyze' }),
      routeName: 'character counter',
    },
    {
      colorMode: 'dark',
      focus: page => page.getByRole('textbox', { name: 'Number to convert' }),
      routeName: 'base converter',
    },
    {
      colorMode: 'light',
      focus: page => page.getByRole('link', { name: 'Indie' }).first(),
      routeName: 'Spotify categories',
    },
    {
      colorMode: 'dark',
      focus: page => page.getByRole('combobox', {
        name: 'Spotify tracks, artists, or genres',
      }),
      routeName: 'Spotify recommendations',
    },
  ];

  for (const reflowRoute of reflowRoutes) {
    test(reflowRoute.routeName, async ({ page }, testInfo) => {
      requireProject(testInfo, desktopProject);
      await page.setViewportSize({ height: 900, width: 320 });
      const fixtures = await preparePage(page, reflowRoute.colorMode);
      await visitRoute(
        page,
        findPublicRoute(reflowRoute.routeName),
        fixtures,
      );

      const control = reflowRoute.focus(page);
      await assertFocusedControlIsNotClipped(page, control);
      await assertNoHorizontalOverflow(page);
    });
  }

  test('Spotify create playlist modal and console layering', async ({
    page,
  }, testInfo) => {
    requireProject(testInfo, desktopProject);
    await page.setViewportSize({ height: 900, width: 320 });
    const fixtures = await preparePage(page, 'light');
    await visitRoute(page, findPublicRoute('Spotify create playlist'), fixtures);

    await expect.poll(() => page.evaluate(() => (
      window.matchMedia('(min-width: 48em)').matches
    ))).toBe(false);
    await expect(page.getByRole('button', {
      name: 'Open interactive site console',
    })).toHaveCount(0);
    await expect(page.getByRole('region', {
      name: 'Interactive site console',
    })).toHaveCount(0);

    await page.getByRole('button', {
      exact: true,
      name: 'Create playlist',
    }).click();
    const playlistName = page.getByLabel('Playlist name');
    await assertFocusedControlIsNotClipped(page, playlistName);
    await assertControlIsTopmost(page, playlistName);
    await assertNoHorizontalOverflow(page);
  });
});

async function preparePage(
  page: Page,
  colorMode: FixtureColorMode,
  authenticated = true,
) {
  await page.emulateMedia({
    colorScheme: colorMode,
    reducedMotion: 'reduce',
  });
  const spotifyFixtures = await installSpotifyFixtures(page, {
    authenticated,
    colorMode,
    consoleOpen: false,
  });
  spotifyFixturesByPage.set(page, spotifyFixtures);

  await page.route('**/api/komoot/**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') {
      failUnexpectedAppRequest(page, route.request(), 'expected GET');
      await fulfillJson(route, { error: 'Unexpected method' }, 501);
      return;
    }

    if (url.pathname === '/api/komoot/activity-stats-by-week') {
      await fulfillJson(route, {
        data: Array.from({ length: 6 }, (_, index) => ({
          first: {
            weekEndDay: 7 + index,
            weekEndMonth: 8,
            weekStartDay: 1 + index,
            weekStartMonth: 8,
            year: 2026,
          },
          second: {
            Biking: 32_000 + index * 1_000,
            EBiking: 0,
            Hiking: 0,
            Other: 0,
            Running: 8_000 + index * 500,
          },
        })),
        next: { limit: 6, offset: 1 },
        previous: null,
        total: 12,
      });
      return;
    }

    if (url.pathname === '/api/komoot/latest-komoot-tours-by-month') {
      await fulfillJson(route, {
        data: [{
          distanceBySportType: {
            Biking: 160_000,
            EBiking: 0,
            Hiking: 0,
            Other: 0,
            Running: 42_000,
          },
          monthYearPair: {
            month: 'August',
            year: 2026,
          },
          tours: [],
        }],
        next: null,
        previous: null,
        total: 1,
      });
      return;
    }

    failUnexpectedAppRequest(
      page,
      route.request(),
      'unknown Komoot fixture endpoint',
    );
    await fulfillJson(route, { error: 'Unexpected endpoint' }, 501);
  });

  await page.route('https://fonts.googleapis.com/**', async route => {
    await route.fulfill({
      body: '',
      contentType: 'text/css',
      status: 200,
    });
  });
  await page.route('https://fonts.gstatic.com/**', async route => {
    await route.fulfill({ body: '', status: 204 });
  });
  await page.route('https://www.youtube.com/embed/**', async route => {
    await route.fulfill({
      body: '<!doctype html><html lang="en"><title>Video preview</title><body>Video preview</body></html>',
      contentType: 'text/html',
      status: 200,
    });
  });

  return spotifyFixtures;
}

async function visitRoute(
  page: Page,
  route: PublicRoute,
  fixtures: SpotifyFixtureState,
) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => new URL(page.url()).pathname).toBe(
    route.expectedPath ?? route.path.split('?')[0],
  );
  await route.settle?.(page, fixtures);
  await expect(page.locator('main h1')).toHaveCount(1);
}

async function settleSpotifyResults(page: Page) {
  await expect(page.getByRole('region', {
    name: 'Spotify results',
  })).toBeVisible();
  await expect(page.getByRole('status', {
    name: /Page 1 of \d+/u,
  })).toBeVisible();
}

async function assertRequestedColorMode(
  page: Page,
  colorMode: FixtureColorMode,
) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.dataset['theme']
  ))).toBe(colorMode);
}

async function assertNoSeriousAxeViolations(page: Page, label: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const results = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .analyze();
  const violations = results.violations.filter(violation => (
    violation.impact === 'critical' || violation.impact === 'serious'
  ));

  expect(
    violations,
    `${label} has critical or serious axe violations:\n${JSON.stringify(
      violations,
      null,
      2,
    )}`,
  ).toEqual([]);
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    dimensions.scrollWidth,
    `The page overflowed horizontally at 320px: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function assertFocusedControlIsNotClipped(
  page: Page,
  control: Locator,
) {
  await control.focus();
  await expect(control).toBeFocused();
  const geometry = await control.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      opacity: style.opacity,
      right: rect.right,
      top: rect.top,
      visibility: style.visibility,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      width: rect.width,
    };
  });

  expect(geometry.visibility).toBe('visible');
  expect(Number(geometry.opacity)).toBeGreaterThan(0);
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.height).toBeGreaterThan(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
}

async function assertControlIsTopmost(page: Page, control: Locator) {
  const isTopmost = await control.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const topmost = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return topmost === element
      || (topmost !== null && element.contains(topmost));
  });
  expect(isTopmost).toBe(true);
}

function findPublicRoute(name: string) {
  const route = publicRoutes.find(candidate => candidate.name === name);
  if (!route) throw new Error(`Unknown public route fixture: ${name}`);
  return route;
}

function normalizeRouterPath(path: string) {
  const pathname = new URL(path, 'http://accessibility.test').pathname;
  if (pathname === '/accessibility-matrix-missing-page') return '*';

  return pathname
    .replace(spotifyFixtureIds.artist, ':artistId')
    .replace(spotifyFixtureIds.category, ':categoryId')
    .replace(spotifyFixtureIds.playlist, ':playlistId')
    .replace(spotifyFixtureIds.track, ':trackId')
    .replace(spotifyFixtureIds.user, ':userId');
}

function readPublicRouterPaths() {
  const sourceFile = ts.createSourceFile(
    'router.tsx',
    readFileSync(resolve('apps/web/src/router.tsx'), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const paths: string[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'publicPath'
    ) {
      if (!ts.isStringLiteral(node.initializer)) {
        throw new Error(
          'Router publicPath values must remain literals for accessibility coverage.',
        );
      }
      paths.push(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return paths;
}

function requireProject(testInfo: TestInfo, projectName: string) {
  test.skip(
    testInfo.project.name !== projectName,
    `This proof targets ${projectName}.`,
  );
}

function allowConsoleError(page: Page, pattern: RegExp) {
  const runtimeIssues = runtimeIssuesByPage.get(page);
  if (!runtimeIssues) {
    throw new Error('Runtime monitoring must be installed before allowing errors.');
  }
  runtimeIssues.expectedConsoleErrors.push(pattern);
}

function failUnexpectedAppRequest(
  page: Page,
  request: {
    method: () => string;
    url: () => string;
  },
  reason: string,
) {
  runtimeIssuesByPage.get(page)?.unexpectedAppRequests.push(
    `${request.method()} ${request.url()} (${reason})`,
  );
}

async function fulfillJson(
  route: {
    fulfill: (options: {
      body: string;
      contentType: string;
      status: number;
    }) => Promise<void>;
  },
  value: unknown,
  status = 200,
) {
  await route.fulfill({
    body: JSON.stringify(value),
    contentType: 'application/json',
    status,
  });
}
