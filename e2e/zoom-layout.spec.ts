import { test, expect } from '@playwright/test';

/**
 * Browser Zoom Layout E2E Tests
 *
 * Regression guard for the dead white band that appeared under the search page
 * at 125%+ browser zoom: the app was scaled with CSS `zoom`, which shrank its
 * 100dvh height along with everything else, so the shell painted only ~80% of
 * the window. The app must fill the viewport at every zoom level.
 *
 * Playwright cannot drive real browser zoom, so each level is reproduced the way
 * the browser does it — a viewport of (screen / zoom) CSS pixels — plus the
 * outerWidth the zoom detector reads.
 */

const SCREENS = [
  { name: 'MacBook Air 13"', width: 1440, height: 810 },
  { name: '1536px laptop', width: 1536, height: 774 },
  { name: '1080p desktop', width: 1920, height: 990 },
];

const ZOOM_LEVELS = [1, 1.25, 1.5, 2];

/** Sizes the page as the browser would at `zoom`, and makes the detector agree. */
async function applyZoom(
  page: import('@playwright/test').Page,
  screen: { width: number; height: number },
  zoom: number,
) {
  await page.addInitScript(([outerWidth, outerHeight]) => {
    localStorage.setItem('balkanestate_visited', 'true');
    Object.defineProperty(window, 'outerWidth', { get: () => outerWidth, configurable: true });
    Object.defineProperty(window, 'outerHeight', { get: () => outerHeight, configurable: true });
  }, [screen.width, screen.height]);

  await page.setViewportSize({
    width: Math.round(screen.width / zoom),
    height: Math.round(screen.height / zoom),
  });
}

/** Waits for the app shell to mount. networkidle never settles here — the map
 *  keeps fetching tiles and the socket keeps retrying. */
async function settle(page: import('@playwright/test').Page) {
  await page.waitForSelector('main#main-content', { timeout: 20000 });
  await page.waitForTimeout(1500);
}

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const root = document.getElementById('root');
    const rect = root?.getBoundingClientRect();
    return {
      // Distance between the bottom of the app and the bottom of the window.
      // Positive = dead band. Negative = the page simply scrolls, which is fine.
      deadBand: rect ? Math.round(de.clientHeight - rect.bottom) : 0,
      sideGap: rect ? Math.round(de.clientWidth - rect.right) : 0,
      horizontalOverflow: de.scrollWidth - de.clientWidth,
      rootFontSize: parseFloat(getComputedStyle(de).fontSize),
      pointerFine: window.matchMedia('(pointer: fine)').matches,
    };
  });
}

for (const screen of SCREENS) {
  for (const zoom of ZOOM_LEVELS) {
    test(`search page fills the window on a ${screen.name} at ${zoom * 100}% zoom`, async ({ page }) => {
      await applyZoom(page, screen, zoom);
      await page.goto('/search');
      await settle(page);

      const m = await measure(page);

      expect(m.deadBand, 'app should reach the bottom of the window').toBeLessThanOrEqual(2);
      expect(Math.abs(m.sideGap), 'app should reach the right edge of the window').toBeLessThanOrEqual(2);
      expect(m.horizontalOverflow, 'page should not scroll sideways').toBeLessThanOrEqual(2);
    });
  }
}

test('text shrinks a little as the user zooms in, and is restored on zoom out', async ({ page }) => {
  const screen = SCREENS[2];

  await applyZoom(page, screen, 1);
  await page.goto('/search');
  await settle(page);

  const unzoomed = await measure(page);
  test.skip(!unzoomed.pointerFine, 'compensation is desktop-pointer only');
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-zoom'))).toBe(false);

  // Zoom in: the root font-size drops, but stays readable.
  await page.evaluate(([outerWidth]) => {
    Object.defineProperty(window, 'outerWidth', { get: () => outerWidth, configurable: true });
  }, [screen.width]);
  await page.setViewportSize({ width: Math.round(screen.width / 1.5), height: Math.round(screen.height / 1.5) });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-zoom')))
    .toBe('150');

  const zoomed = await measure(page);
  expect(zoomed.rootFontSize).toBeLessThan(unzoomed.rootFontSize);
  expect(zoomed.rootFontSize).toBeGreaterThanOrEqual(unzoomed.rootFontSize * 0.85);
  expect(zoomed.deadBand).toBeLessThanOrEqual(2);

  // Zoom back out: compensation is removed entirely.
  await page.setViewportSize({ width: screen.width, height: screen.height });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.hasAttribute('data-zoom')))
    .toBe(false);
  expect((await measure(page)).rootFontSize).toBe(unzoomed.rootFontSize);
});
