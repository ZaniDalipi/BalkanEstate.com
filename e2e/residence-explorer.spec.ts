import { test, expect, type Page } from '@playwright/test';

/**
 * Interactive residence explorer — public flow and owner tooling.
 *
 * Needs the backend (port 5001) and the demo residence:
 *   cd backend && npm run seed:developments
 * Owner tests also need E2E_DEV_EMAIL / E2E_DEV_PASSWORD for the seed owner
 * (a verified account). Tests skip themselves when these are missing.
 *
 * Seed images point at picsum.photos; they are served locally here so the
 * suite runs offline.
 */

const API = process.env.E2E_API_URL || 'http://localhost:5001/api';
const SLUG = 'east-gate-living-demo';
const REGIONS = 'Apartments and buildings';

const placeholder = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#e8e1d6"/></svg>`;

async function prepare(page: Page) {
  const seeded = await page.request.get(`${API}/developments/${SLUG}`).catch(() => null);
  test.skip(!seeded || !seeded.ok(), 'Demo residence not seeded (npm run seed:developments)');
  await page.addInitScript(() => {
    localStorage.setItem('balkanestate_visited', 'true');
    sessionStorage.setItem('balkanestate_cookie_dismissed', 'true');
  });
  await page.route(/googlesyndication|googletagmanager|clarity\.ms|facebook\.net/, (r) => r.abort());
  await page.route(/picsum\.photos/, (r) =>
    r.fulfill({ status: 200, contentType: 'image/svg+xml', body: placeholder(1200, 900) })
  );
}

test.describe('Residence explorer (public)', () => {
  test('residence → building → camera views → apartment drawer', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop pointer flow');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await prepare(page);
    await page.goto(`/en/developments/${SLUG}`);

    const regions = page.getByRole('group', { name: REGIONS }).first();
    await expect(regions).toBeVisible({ timeout: 30000 });
    await regions.getByRole('button', { name: /Seaside Tower 1/ }).first().click();

    const unit = page.getByRole('group', { name: REGIONS }).getByRole('button', { name: /Available/ }).first();
    await expect(unit).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Next view' }).click();
    await page.getByRole('button', { name: 'Previous view' }).click();

    await page.getByRole('group', { name: REGIONS }).getByRole('button', { name: /Available/ }).first().click();
    const drawer = page.getByRole('dialog', { name: 'Apartment details' });
    await expect(drawer).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('unit=');

    // Browser Back closes the drawer and drops ?unit=.
    await page.goBack();
    await expect(drawer).toBeHidden();
    expect(page.url()).not.toContain('unit=');

    // Legend toggles are URL-synced filters.
    await page.getByRole('button', { name: /^Available/ }).first().click();
    await expect.poll(() => page.url()).toMatch(/[?&]av=available/);
    expect(errors).toEqual([]);
  });

  test('unit without a listing accepts an inquiry', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Covered on desktop');
    await prepare(page);
    await page.goto(`/en/developments/${SLUG}`);
    const regions = page.getByRole('group', { name: REGIONS }).first();
    await expect(regions).toBeVisible({ timeout: 30000 });
    await regions.getByRole('button', { name: /Seaside Tower 1/ }).first().click();
    await page.getByRole('group', { name: REGIONS }).getByRole('button', { name: /Available/ }).first().click();

    const form = page.getByRole('form', { name: 'Ask about this apartment' });
    await expect(form).toBeVisible({ timeout: 10000 });
    await form.getByLabel('Name').fill('E2E Buyer');
    await form.getByLabel('Email').fill('buyer@example.test');
    await form.getByLabel('Message').fill('Is this apartment still available next spring?');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/inquiries') && r.request().method() === 'POST'),
      form.getByRole('button', { name: 'Send inquiry' }).click(),
    ]);
    expect(resp.status()).toBe(201);
    await expect(page.getByText(/your inquiry was sent/)).toBeVisible();
  });

  test('touch: first tap previews, second opens the bottom sheet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch flow');
    await prepare(page);
    await page.goto(`/en/developments/${SLUG}`);
    const regions = page.getByRole('group', { name: REGIONS }).first();
    await expect(regions).toBeVisible({ timeout: 30000 });
    await regions.getByRole('button', { name: /Seaside Tower 1/ }).first().tap();
    await page.getByRole('button', { name: /^Explore/ }).tap();

    const unit = page.getByRole('group', { name: REGIONS }).getByRole('button', { name: /Available/ }).first();
    await expect(unit).toBeVisible({ timeout: 15000 });
    await unit.tap();
    // The tooltip is portaled last, after the unit grid's own "View details" buttons.
    await page.getByRole('button', { name: /View details/ }).last().tap();
    const sheet = page.getByRole('dialog', { name: 'Apartment details' });
    await expect(sheet).toBeVisible({ timeout: 10000 });
    await expect(sheet).toContainText('Seaside Tower 1');
  });
});

test.describe('Residence explorer (owner)', () => {
  const email = process.env.E2E_DEV_EMAIL;
  const password = process.env.E2E_DEV_PASSWORD;

  async function openManage(page: Page) {
    test.skip(!email || !password, 'Set E2E_DEV_EMAIL / E2E_DEV_PASSWORD for the seed owner');
    await prepare(page);
    await page.addInitScript(() => localStorage.setItem('balkan_estate_has_session', String(Date.now())));
    const login = await page.request.post(`${API}/auth/login`, { data: { email, password } });
    expect(login.status()).toBe(200);
    // A hard load of a dashboard URL can race the session restore; enter via the app.
    await page.goto('/en/developments');
    await expect(page.getByRole('button', { name: /My Account/ }).first()).toBeVisible({ timeout: 30000 });
    await page.evaluate(() => {
      window.history.pushState({}, '', '/en/dashboard/developments');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.getByText('East Gate Living (Demo)').first().click({ timeout: 30000 });
    await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible({ timeout: 20000 });
  }

  test('inventory edit: price on request hides the price publicly', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop table');
    await openManage(page);
    await page.getByRole('tab', { name: 'Inventory' }).click();
    await page.getByLabel('Search units').fill('S1102');
    await page.getByRole('button', { name: /Edit unit S1102/ }).first().click();
    const dialog = page.getByRole('dialog').first();
    const select = dialog.getByLabel('Price shown to buyers');
    const before = await select.inputValue();
    const next = before === 'on_request' ? 'public' : 'on_request';
    await select.selectOption(next);
    const [patch] = await Promise.all([
      page.waitForResponse((r) => /\/units\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH'),
      dialog.getByRole('button', { name: 'Save changes' }).click(),
    ]);
    expect(patch.status()).toBe(200);
    const pub = await page.request.get(`${API}/developments/${SLUG}/units`);
    const unit = (await pub.json()).units.find((u: { unitNumber: string }) => u.unitNumber === 'S1102');
    expect(unit.priceOnRequest).toBe(next === 'on_request');
    expect(unit.price === undefined).toBe(next === 'on_request');
  });

  test('editor: a drawn polygon is saved where it was drawn', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer drawing');
    await openManage(page);
    await page.getByRole('tab', { name: 'Interactive explorer' }).click();
    await page.getByRole('button', { name: /^Polygon/ }).first().click();
    const box = await page.getByLabel('Region editor canvas').boundingBox();
    if (!box) throw new Error('editor canvas not rendered');
    const pts: Array<[number, number]> = [[0.3, 0.05], [0.5, 0.05], [0.5, 0.2], [0.3, 0.2]];
    for (const [x, y] of pts) await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    await page.keyboard.press('Enter');

    await page.getByLabel('Target').first().fill('Seaside Tower 2');
    await page.getByRole('option', { name: /Seaside Tower 2/ }).first().click();
    const [save] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/draft') && r.request().method() === 'PATCH'),
      page.getByRole('button', { name: 'Save draft' }).click(),
    ]);
    expect(save.status()).toBe(200);
    const body = save.request().postDataJSON() as { baseVersion?: number; hotspots: Array<{ points: number[][] }> };
    expect(typeof body.baseVersion).toBe('number');
    const drawn = body.hotspots[body.hotspots.length - 1].points;
    drawn.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(pts[i][0], 2);
      expect(y).toBeCloseTo(pts[i][1], 2);
    });
  });
});
