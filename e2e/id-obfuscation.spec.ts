import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * ID Obfuscation E2E Tests
 *
 * Verifies that raw MongoDB ObjectIds (24-char hex strings) are never
 * exposed to the client — not in API responses, URLs, or browser state.
 *
 * MongoDB ObjectId pattern: /^[a-fA-F0-9]{24}$/
 */

const MONGO_ID_REGEX = /[a-fA-F0-9]{24}/;
const API_BASE = 'http://localhost:5001/api';

/**
 * Helper: collect all API responses during a page action.
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
        // Response body may be unavailable for some requests
      }
    }
  };

  page.on('response', handler);
  await action();
  // Wait for network to settle
  await page.waitForTimeout(2000);
  page.off('response', handler);

  return responses;
}

/**
 * Check that a JSON string does not contain any raw MongoDB ObjectId
 * in value positions (field values, not in URLs or irrelevant noise).
 */
function findExposedObjectIds(jsonBody: string): string[] {
  const exposed: string[] = [];
  try {
    const parsed = JSON.parse(jsonBody);
    walkObject(parsed, '', exposed);
  } catch {
    // Not valid JSON — skip
  }
  return exposed;
}

function walkObject(obj: any, path: string, exposed: string[]): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'string') {
    // Check if this string value is a raw 24-char hex ObjectId
    if (/^[a-fA-F0-9]{24}$/.test(obj)) {
      exposed.push(`${path} = "${obj}"`);
    }
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


test.describe('ID Obfuscation — API Responses', () => {

  test('property list response should not contain raw MongoDB ObjectIds', async ({ page }) => {
    const responses = await collectApiResponses(page, async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    const propertyResponses = responses.filter(r => r.url.includes('/properties'));

    for (const resp of propertyResponses) {
      const exposed = findExposedObjectIds(resp.body);
      expect(exposed, `Raw ObjectIds found in ${resp.url}:\n${exposed.join('\n')}`).toHaveLength(0);
    }
  });

  test('property detail response should use encoded IDs, not raw hex', async ({ page }) => {
    // First load homepage to get a property ID
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the first property card
    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible on homepage');
      return;
    }

    const responses = await collectApiResponses(page, async () => {
      await propertyCard.click();
      await page.waitForTimeout(2000);
    });

    // Check the property detail API response
    const detailResponses = responses.filter(r =>
      r.url.includes('/properties/') && !r.url.includes('?')
    );

    for (const resp of detailResponses) {
      const exposed = findExposedObjectIds(resp.body);
      expect(exposed, `Raw ObjectIds leaked in property detail response:\n${exposed.join('\n')}`).toHaveLength(0);
    }
  });

  test('auth response should not expose raw user ID', async ({ page }) => {
    // Intercept auth API responses
    const authResponses: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if ((url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/me')) &&
          response.headers()['content-type']?.includes('json')) {
        try {
          authResponses.push(await response.text());
        } catch { /* ignore */ }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for any /auth/me request (auto-login check)
    await page.waitForTimeout(3000);

    for (const body of authResponses) {
      const exposed = findExposedObjectIds(body);
      expect(exposed, `Raw ObjectIds in auth response:\n${exposed.join('\n')}`).toHaveLength(0);
    }
  });
});


test.describe('ID Obfuscation — URLs', () => {

  test('property URL should not contain raw MongoDB ObjectId', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to click a property card
    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible on homepage');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('/property/')) {
      // Extract the property ID part from the URL
      const propertyPath = url.split('/property/')[1]?.split('?')[0];
      expect(propertyPath).toBeDefined();

      // Should NOT be a raw 24-char hex ObjectId
      expect(propertyPath).not.toMatch(/^[a-fA-F0-9]{24}$/);

      // Should be either an encoded ID (16-char base64url) or a slug with encoded suffix
      const hasSlugFormat = propertyPath!.includes('_'); // slug_EncodedId format
      const isEncodedId = /^[A-Za-z0-9_-]{16}$/.test(propertyPath!);
      expect(hasSlugFormat || isEncodedId).toBe(true);
    }
  });

  test('browser history state should not contain property IDs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click a property card
    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(2000);

    // Check window.history.state — should not contain propertyId
    const historyState = await page.evaluate(() => window.history.state);
    if (historyState) {
      expect(historyState).not.toHaveProperty('propertyId');
      // Also verify no raw ObjectIds in any state values
      const stateJson = JSON.stringify(historyState);
      expect(stateJson).not.toMatch(MONGO_ID_REGEX);
    }
  });

  test('shared/canonical URL should use slug format', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(3000);

    // Check canonical link tag
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical && canonical.includes('/property/')) {
      // Canonical URL should NOT have a raw 24-char hex ObjectId
      expect(canonical).not.toMatch(/\/property\/[a-fA-F0-9]{24}(\/|$)/);
    }
  });
});


test.describe('ID Obfuscation — Network Tab Inspection', () => {

  test('no raw ObjectIds in any /api/ response body', async ({ page }) => {
    // This is a broad sweep: load the homepage and check ALL API responses
    const allExposed: { url: string; fields: string[] }[] = [];

    const responses = await collectApiResponses(page, async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
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
    const requestUrls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/properties/')) {
        requestUrls.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click a property to trigger a detail fetch
    const propertyCard = page.locator('[class*="property"], [class*="card"]').first();
    if (!await propertyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No property cards visible');
      return;
    }

    await propertyCard.click();
    await page.waitForTimeout(3000);

    // Check that property detail requests use encoded IDs, not raw hex
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
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get all text content and data attributes from the page
    const domContent = await page.evaluate(() => {
      const texts: string[] = [];

      // Collect all data-* attributes
      document.querySelectorAll('*').forEach((el) => {
        const attrs = el.attributes;
        for (let i = 0; i < attrs.length; i++) {
          const attr = attrs[i];
          if (attr.name.startsWith('data-') && attr.value) {
            texts.push(`[${attr.name}="${attr.value}"]`);
          }
        }
      });

      // Check href attributes for raw IDs
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
    // Fetch property list to get an encoded ID
    const response = await page.request.get(`${API_BASE}/properties?limit=1`);

    if (!response.ok()) {
      test.skip(true, 'API not available');
      return;
    }

    const data = await response.json();
    const properties = data.properties || data.data || [];

    if (properties.length === 0) {
      test.skip(true, 'No properties in database');
      return;
    }

    const encodedId = properties[0].id;
    expect(encodedId).toBeDefined();

    // The ID should NOT be a raw 24-char hex ObjectId
    expect(encodedId).not.toMatch(/^[a-fA-F0-9]{24}$/);

    // Fetch property using the encoded ID — should succeed
    const detailResponse = await page.request.get(`${API_BASE}/properties/${encodedId}`);
    expect(detailResponse.ok()).toBe(true);

    const detailData = await detailResponse.json();
    expect(detailData.property).toBeDefined();
    // The returned property should also have an encoded ID
    expect(detailData.property.id).toBe(encodedId);
    // Should NOT have _id field
    expect(detailData.property._id).toBeUndefined();
  });

  test('slug-based URL should resolve via API', async ({ page }) => {
    // Fetch a property to build a slug URL
    const response = await page.request.get(`${API_BASE}/properties?limit=1`);

    if (!response.ok()) {
      test.skip(true, 'API not available');
      return;
    }

    const data = await response.json();
    const properties = data.properties || data.data || [];

    if (properties.length === 0) {
      test.skip(true, 'No properties in database');
      return;
    }

    const property = properties[0];
    const encodedId = property.id;

    // Build a slug similar to what the frontend generates
    const slug = `test-slug_${encodedId}`;

    // Fetch via slug — backend should extract the encoded ID from suffix
    const slugResponse = await page.request.get(`${API_BASE}/properties/${slug}`);
    expect(slugResponse.ok()).toBe(true);

    const slugData = await slugResponse.json();
    expect(slugData.property).toBeDefined();
    expect(slugData.property.id).toBe(encodedId);
  });

  test('property seller ID should be encoded in API response', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/properties?limit=1`);

    if (!response.ok()) {
      test.skip(true, 'API not available');
      return;
    }

    const data = await response.json();
    const properties = data.properties || data.data || [];

    if (properties.length === 0) {
      test.skip(true, 'No properties in database');
      return;
    }

    const property = properties[0];

    // If sellerId is populated (object), check its id is encoded
    if (property.sellerId && typeof property.sellerId === 'object') {
      const sellerId = property.sellerId.id || property.sellerId._id;
      if (sellerId) {
        expect(sellerId, 'Seller ID should not be raw hex').not.toMatch(/^[a-fA-F0-9]{24}$/);
      }
      // _id field should not exist
      expect(property.sellerId._id).toBeUndefined();
    }
  });
});


test.describe('ID Obfuscation — Mobile', () => {

  test('mobile property navigation should use encoded URLs', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

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
      // Should NOT be a raw ObjectId
      expect(propertyPath).not.toMatch(/^[a-fA-F0-9]{24}$/);
    }

    // History state should be clean
    const historyState = await page.evaluate(() => window.history.state);
    if (historyState) {
      expect(historyState).not.toHaveProperty('propertyId');
    }
  });
});
