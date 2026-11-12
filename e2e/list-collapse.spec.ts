import { test, expect, type Page } from '@playwright/test';

/**
 * Hide the list, see the whole map (Search, Rentals, Villas — split view).
 *
 * On a desktop the list and the map sit side by side. The tab on the map's
 * left edge folds the list away and the map grows into its place; "Show list"
 * brings it back. The choice is remembered on the device. Phones and tablets
 * keep the List / Map switch and never show the tab.
 * Logic: src/features/search/splitView/ (see ARCHITECTURE.md).
 */

const PAGES = ['/en/search', '/en/rentals', '/en/villas'];

async function open(page: Page, path: string) {
  await page.addInitScript(() => {
    localStorage.setItem('balkanestate_visited', 'true');
  });
  await page.goto(path);
  // networkidle never settles here — the map keeps fetching tiles.
  await page.waitForSelector('#search-list-panel', { state: 'attached', timeout: 20000 });
}

const box = async (page: Page, selector: string) => {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`${selector} has no box`);
  return b;
};

const mapPanel = '#search-list-panel ~ div.overflow-hidden';

for (const path of PAGES) {
  test.describe(`${path} on a desktop`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    // A desktop with a mouse: the phone project's touch emulation is not this layout.
    test.skip(({ isMobile }) => isMobile, 'split view is a desktop layout');

    test('folds the list away so the map fills the page, and brings it back', async ({ page }) => {
      await open(page, path);
      const list = page.locator('#search-list-panel');
      const before = await box(page, mapPanel);

      await page.getByRole('button', { name: 'Hide list' }).click();
      const show = page.getByRole('button', { name: /^Show list/ });
      await expect(show).toHaveAttribute('aria-expanded', 'false');
      await expect(list).toBeHidden();
      await expect.poll(async () => (await box(page, mapPanel)).width).toBeGreaterThan(before.width + 300);
      await expect.poll(async () => (await box(page, mapPanel)).x).toBeLessThan(before.x);

      // Remembered on this device.
      await page.reload();
      await page.waitForSelector('#search-list-panel', { state: 'attached', timeout: 20000 });
      await expect(page.getByRole('button', { name: /^Show list/ })).toBeVisible();

      await page.getByRole('button', { name: /^Show list/ }).click();
      await expect(page.getByRole('button', { name: 'Hide list' })).toHaveAttribute('aria-expanded', 'true');
      await expect(list).toBeVisible();
      await expect.poll(async () => Math.round((await box(page, mapPanel)).x)).toBe(Math.round(before.x));
    });
  });

  test.describe(`${path} on a tablet`, () => {
    test.use({ viewport: { width: 820, height: 1180 } });

    test('shows no hide-list tab: the List / Map switch decides there', async ({ page }) => {
      await open(page, path);
      await expect(page.getByRole('button', { name: 'Hide list' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Show list/ })).toHaveCount(0);
    });
  });
}
