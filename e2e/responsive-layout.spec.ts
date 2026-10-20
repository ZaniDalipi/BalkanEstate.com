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

test('filter sheet stays on top of the sidebar and header after rotating to landscape', async ({ browser }) => {
  // Open filters on a phone in portrait, then turn it sideways: at ≥768px wide
  // the sidebar rail and the floating header appear, and the still-open sheet
  // used to slide under both, hiding its title, close button and left edge.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await prepare(page);
  await page.goto('/en/search');
  await settle(page);

  await page.getByRole('button', { name: /open filters/i }).click();
  const close = page.getByRole('button', { name: /close filters/i });
  await expect(close).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);

  const hits = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => /close filters/i.test(b.getAttribute('aria-label') || ''),
    );
    const title = document.getElementById('filters-title');
    if (!btn || !title) return { closeHit: false, titleHit: false };
    const at = (el: Element) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && (hit === el || el.contains(hit));
    };
    const r = title.getBoundingClientRect();
    const leftHit = document.elementFromPoint(r.left + 2, r.top + r.height / 2);
    return { closeHit: at(btn), titleHit: !!leftHit && (leftHit === title || title.contains(leftHit)) };
  });
  expect(hits.closeHit, 'close button must not be covered').toBe(true);
  expect(hits.titleHit, 'sheet title must not be covered by the sidebar').toBe(true);
  await context.close();
});
