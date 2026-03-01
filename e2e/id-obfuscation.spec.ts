import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * ID Obfuscation E2E Tests
 *
 * Verifies that raw MongoDB ObjectIds (24-char hex strings) are never
 * exposed to the client — not in API responses, URLs, or browser state.
 *
 * Prerequisites:
 *   - Backend API running on port 5001 (with MongoDB)
 *   - Frontend dev server running on port 3000
 *
 * Run: CHROME_PATH=/path/to/chrome npm run test:e2e -- e2e/id-obfuscation.spec.ts
 */

const MONGO_ID_REGEX = /[a-fA-F0-9]{24}/;
const API_BASE = process.env.API_BASE_URL || 'http://localhost:5001/api';

/**
 * Preflight: skip the entire test if the backend API is not reachable.
 */
async function requireApi(page: Page) {
  try {
    const res = await page.request.get(`${API_BASE}/properties?limit=1`, { timeout: 5000 });
    if (!res.ok()) {
      test.skip(true, 'Backend API returned non-200 — is the server running?');
    }
  } catch {
    test.skip(true, 'Backend API is not reachable — start it with: cd backend && npm run dev');
  }
}

/**
 * Helper: collect JSON API responses during a page action.
 */
async function collectApiResponses(page: Page, action: () => Promise<void>): Promise<{ url: string; body: string }[]> {
  const responses: { url: string; body: string }[] = [];

  const handler = async (response: Response) => {
    const url = response.url();
    if (url.includes('/api/') && response.headers()['content-type']?.includes('json')) {
      try {
        const body = await response.text();
        responses.push({ url, body });
      } catch {
        // Response body may be unavailable
      }
    }
  };

  page.on('response', handler);
  await action();
  await page.waitForTimeout(3000);
  page.off('response', handler);

  return responses;
}

/**
 * Recursively check that no string value in the parsed JSON is a raw 24-char hex ObjectId.
 */
function findExposedObjectIds(jsonBody: string): string[] {
  const exposed: string[] = [];
  try {
    walkObject(JSON.parse(jsonBody), '', exposed);
  } catch { /* not valid JSON */ }
  return exposed;
}

function walkObject(obj: any, path: string, exposed: string[]): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'string') {
    if (/^[a-fA-F0-9]{24}$/.test(obj)) exposed.push(`${path} = "${obj}"`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walkObject(item, `${path}[${i}]`, exposed));
    return;
  }
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      walkObject(value, path ? `${path}.${key}` : key, exposed);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('ID Obfuscation — API Responses', () => {

  test('property list response should not contain raw MongoDB ObjectIds', async ({ page }) => {
    await requireApi(page);

    const responses = await collectApiResponses(page, async () => {
      await page.goto('/');
      await page.waitForLoadState('load');
      await page.waitForTimeout(3000);
    });

    const propertyResponses = responses.filter(r => r.url.includes('/properties'));
    expect(propertyResponses.length).toBeGreaterThan(0);

    for (const resp of propertyResponses) {
      const exposed = findExposedObjectIds(resp.body);
      expect(exposed, `Raw ObjectIds found in ${resp.url}:\n${exposed.join('\n')}`).toHaveLength(0);
    }
  });

  test('property detail response should use encoded IDs, not raw hex', async ({ page }) => {
    await requireApi(page);

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible on homepage');
      return;
    }

    const responses = await collectApiResponses(page, async () => {
      await propertyCard.click();
    });

    const detailResponses = responses.filter(r =>
      r.url.includes('/properties/') && !r.url.includes('?')
    );

    for (const resp of detailResponses) {
      const exposed = findExposedObjectIds(resp.body);
      expect(exposed, `Raw ObjectIds in property detail:\n${exposed.join('\n')}`).toHaveLength(0);
    }
  });

  test('auth response should not expose raw user ID', async ({ page }) => {
    await requireApi(page);

    const authResponses: string[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      if ((url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/me')) &&
          response.headers()['content-type']?.includes('json')) {
        try { authResponses.push(await response.text()); } catch { /* ignore */ }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    for (const body of authResponses) {
      const exposed = findExposedObjectIds(body);
      expect(exposed, `Raw ObjectIds in auth response:\n${exposed.join('\n')}`).toHaveLength(0);
    }
  });
});


test.describe('ID Obfuscation — URLs', () => {

  test('property URL should not contain raw MongoDB ObjectId', async ({ page }) => {
    await requireApi(page);

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible on homepage');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('/property/')) {
      const propertyPath = url.split('/property/')[1]?.split('?')[0];
      expect(propertyPath).toBeDefined();
      // Should NOT be a raw 24-char hex ObjectId
      expect(propertyPath).not.toMatch(/^[a-fA-F0-9]{24}$/);
      // Should be a slug with encoded suffix or a plain encoded ID
      const hasSlugFormat = propertyPath!.includes('_');
      const isEncodedId = /^[A-Za-z0-9_-]{16}$/.test(propertyPath!);
      expect(hasSlugFormat || isEncodedId).toBe(true);
    }
  });

  test('browser history state should not contain property IDs', async ({ page }) => {
    await requireApi(page);

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(2000);

    const historyState = await page.evaluate(() => window.history.state);
    if (historyState) {
      expect(historyState).not.toHaveProperty('propertyId');
      const stateJson = JSON.stringify(historyState);
      expect(stateJson).not.toMatch(MONGO_ID_REGEX);
    }
  });

  test('shared/canonical URL should use slug format', async ({ page }) => {
    await requireApi(page);

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(3000);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical && canonical.includes('/property/')) {
      expect(canonical).not.toMatch(/\/property\/[a-fA-F0-9]{24}(\/|$)/);
    }
  });
});


test.describe('ID Obfuscation — Network Tab Inspection', () => {

  test('no raw ObjectIds in any /api/ response body', async ({ page }) => {
    await requireApi(page);

    const allExposed: { url: string; fields: string[] }[] = [];

    const responses = await collectApiResponses(page, async () => {
      await page.goto('/');
      await page.waitForLoadState('load');
      await page.waitForTimeout(4000);
    });

    for (const resp of responses) {
      const exposed = findExposedObjectIds(resp.body);
      if (exposed.length > 0) {
        allExposed.push({ url: resp.url, fields: exposed });
      }
    }

    const report = allExposed
      .map(e => `  ${e.url}\n    ${e.fields.join('\n    ')}`)
      .join('\n');

    expect(allExposed, `Raw MongoDB ObjectIds found in API responses:\n${report}`).toHaveLength(0);
  });

  test('property ID in API request URL should be encoded, not raw hex', async ({ page }) => {
    await requireApi(page);

    const requestUrls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/properties/')) requestUrls.push(url);
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(3000);

    const detailRequests = requestUrls.filter(url => {
      const parts = url.split('/properties/');
      return parts[1] && !parts[1].includes('?') && parts[1].length > 0;
    });

    for (const url of detailRequests) {
      const idPart = url.split('/properties/')[1]?.split('/')[0]?.split('?')[0];
      if (idPart) {
        expect(idPart, `Raw ObjectId used in API request: ${url}`).not.toMatch(/^[a-fA-F0-9]{24}$/);
      }
    }
  });
});


test.describe('ID Obfuscation — DOM Inspection', () => {

  test('no raw MongoDB ObjectIds in visible DOM text or data attributes', async ({ page }) => {
    await requireApi(page);

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const domContent = await page.evaluate(() => {
      const texts: string[] = [];

      document.querySelectorAll('*').forEach((el) => {
        const attrs = el.attributes;
        for (let i = 0; i < attrs.length; i++) {
          const attr = attrs[i];
          if (attr.name.startsWith('data-') && attr.value) {
            texts.push(`[${attr.name}="${attr.value}"]`);
          }
        }
      });

      document.querySelectorAll('a[href]').forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        if (href.includes('/property/')) {
          texts.push(`href: ${href}`);
        }
      });

      return texts;
    });

    const rawIdPattern = /[a-fA-F0-9]{24}/;
    const exposed = domContent.filter(t => rawIdPattern.test(t));
    expect(exposed, `Raw ObjectIds found in DOM:\n${exposed.join('\n')}`).toHaveLength(0);
  });
});


test.describe('ID Obfuscation — Backward Compatibility', () => {

  test('encoded property ID should resolve via API', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/properties?limit=1`, { timeout: 5000 }).catch(() => null);
    if (!response?.ok()) { test.skip(true, 'API not available'); return; }

    const data = await response.json();
    const properties = data.properties || data.data || [];
    if (properties.length === 0) { test.skip(true, 'No properties in database'); return; }

    const encodedId = properties[0].id;
    expect(encodedId).toBeDefined();
    expect(encodedId).not.toMatch(/^[a-fA-F0-9]{24}$/);

    const detailResponse = await page.request.get(`${API_BASE}/properties/${encodedId}`);
    expect(detailResponse.ok()).toBe(true);

    const detailData = await detailResponse.json();
    expect(detailData.property).toBeDefined();
    expect(detailData.property.id).toBe(encodedId);
    expect(detailData.property._id).toBeUndefined();
  });

  test('slug-based URL should resolve via API', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/properties?limit=1`, { timeout: 5000 }).catch(() => null);
    if (!response?.ok()) { test.skip(true, 'API not available'); return; }

    const data = await response.json();
    const properties = data.properties || data.data || [];
    if (properties.length === 0) { test.skip(true, 'No properties in database'); return; }

    const encodedId = properties[0].id;
    const slug = `test-slug_${encodedId}`;

    const slugResponse = await page.request.get(`${API_BASE}/properties/${slug}`);
    expect(slugResponse.ok()).toBe(true);

    const slugData = await slugResponse.json();
    expect(slugData.property).toBeDefined();
    expect(slugData.property.id).toBe(encodedId);
  });

  test('property seller ID should be encoded in API response', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/properties?limit=1`, { timeout: 5000 }).catch(() => null);
    if (!response?.ok()) { test.skip(true, 'API not available'); return; }

    const data = await response.json();
    const properties = data.properties || data.data || [];
    if (properties.length === 0) { test.skip(true, 'No properties in database'); return; }

    const property = properties[0];

    if (property.sellerId && typeof property.sellerId === 'object') {
      const sellerId = property.sellerId.id || property.sellerId._id;
      if (sellerId) {
        expect(sellerId, 'Seller ID should not be raw hex').not.toMatch(/^[a-fA-F0-9]{24}$/);
      }
      expect(property.sellerId._id).toBeUndefined();
    }
  });
});


test.describe('ID Obfuscation — Mobile', () => {

  test('mobile property navigation should use encoded URLs', async ({ page }) => {
    await requireApi(page);

    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible on mobile');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('/property/')) {
      const propertyPath = url.split('/property/')[1]?.split('?')[0];
      expect(propertyPath).not.toMatch(/^[a-fA-F0-9]{24}$/);
    }

    const historyState = await page.evaluate(() => window.history.state);
    if (historyState) {
      expect(historyState).not.toHaveProperty('propertyId');
    }
  });
});
