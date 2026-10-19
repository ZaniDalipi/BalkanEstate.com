import { test, expect } from '@playwright/test';

/**
 * Responsive Layout E2E Tests
 *
 * Every page must fit any phone, tablet or desktop in either orientation. The
 * case that slipped through before was a phone held sideways: wide enough
 * (≥768px) for the desktop layout but only ~360–460px tall, so the floating
 * header covered the page and the search column was all controls, no results.
 *
 * Guards: nothing scrolls sideways at any size, and on a short landscape
 * screen the floating header is compact (one short row, short labels).
 */

const VIEWPORTS = [
  { name: 'small phone portrait', width: 360, height: 740 },
  { name: 'phone portrait', width: 393, height: 852 },
  { name: 'small phone landscape', width: 667, height: 375 },
  { name: 'phone landscape', width: 852, height: 393 },
  { name: 'large phone landscape', width: 1024, height: 460 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'tablet landscape', width: 1180, height: 820 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = ['/en', '/en/search', '/en/rentals', '/en/agents', '/en/pricing'];

async function prepare(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('balkanestate_visited', 'true');
  });
}

/** networkidle never settles here — the map keeps fetching tiles. */
async function settle(page: import('@playwright/test').Page) {
  await page.waitForSelector('main#main-content', { timeout: 20000 });
  await page.waitForTimeout(1500);
}

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    test(`${path} does not scroll sideways on a ${vp.name} (${vp.width}×${vp.height})`, async ({ browser }) => {
      const touch = vp.width < 1280;
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: touch,
        isMobile: touch,
      });
      const page = await context.newPage();
      await prepare(page);
      await page.goto(path);
      await settle(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'page should not scroll sideways').toBeLessThanOrEqual(2);
      await context.close();
    });
  }
}

test('floating header is compact on a phone held sideways', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 460 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await prepare(page);
  await page.goto('/en');
  await settle(page);

  const header = page.locator('header.fixed').first();
  await expect(header).toBeVisible();
  const box = await header.boundingBox();
  expect(box, 'floating header should render').not.toBeNull();
  // One short row that leaves the page its height…
  expect(box!.height).toBeLessThanOrEqual(56);
  // …and no wider than about a third of the screen.
  expect(box!.width).toBeLessThanOrEqual(360);
  await context.close();
});
