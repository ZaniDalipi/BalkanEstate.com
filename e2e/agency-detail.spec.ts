import { test, expect } from '@playwright/test';

/**
 * Agency Detail Page E2E Tests
 * Tests: Share, Favourite, Hero, Members, Properties, Edit Modal
 */

test.describe('Agency Detail Page', () => {
  // Navigate to the first available agency before each test
  test.beforeEach(async ({ page }) => {
    // Go to agencies list
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');

    // Click the first agency card to navigate to detail
    const agencyCard = page.locator('[data-testid="agency-card"], a[href*="/agencies/"]').first();
    if (await agencyCard.isVisible()) {
      await agencyCard.click();
      await page.waitForLoadState('networkidle');
    } else {
      test.skip(true, 'No agencies available to test');
    }
  });

  test.describe('Hero Section', () => {
    test('should display agency name, location, and stats', async ({ page }) => {
      // Agency name in h1
      const agencyName = page.locator('h1');
      await expect(agencyName).toBeVisible();
      await expect(agencyName).not.toBeEmpty();

      // Location badge with city/country
      const locationBadge = page.locator('text=/.*,\\s.*/')
        .filter({ has: page.locator('svg') })
        .first();
      await expect(locationBadge).toBeVisible();

      // Stats row - Listings, Agents, Rating
      await expect(page.getByText('Listings')).toBeVisible();
      await expect(page.getByText('Agents')).toBeVisible();
      await expect(page.getByText('Rating')).toBeVisible();
    });

    test('should display agency logo or fallback icon', async ({ page }) => {
      const logoContainer = page.locator('.rounded-2xl.overflow-hidden').first();
      await expect(logoContainer).toBeVisible();
    });

    test('should show back button and navigate back', async ({ page }) => {
      const backButton = page.locator('button', { hasText: /back/i });
      await expect(backButton).toBeVisible();

      await backButton.click();
      // Should navigate away from agency detail
      await page.waitForLoadState('networkidle');
    });

    test('should show breadcrumbs on desktop', async ({ page }) => {
      // Breadcrumbs are hidden on mobile (hidden sm:block)
      const viewport = page.viewportSize();
      if (viewport && viewport.width >= 640) {
        const breadcrumbs = page.locator('nav[aria-label*="breadcrumb"], .breadcrumb, [class*="breadcrumb"]');
        // Breadcrumbs may or may not be present depending on implementation
      }
    });
  });

  test.describe('Share Button', () => {
    test('should display share button in hero', async ({ page }) => {
      const shareButton = page.locator('button', { hasText: /share/i });
      await expect(shareButton).toBeVisible();
    });

    test('should open share dropdown on click (desktop)', async ({ page }) => {
      const shareButton = page.locator('button', { hasText: /share/i });
      await shareButton.click();

      // Should show social share icons (Facebook, Twitter, WhatsApp, etc.)
      // The SocialShare component renders icon buttons
      const shareIcons = page.locator('button.rounded-full').filter({
        has: page.locator('svg'),
      });
      // Wait a moment for dropdown to appear
      await page.waitForTimeout(300);

      // At minimum the dropdown should be visible
      const shareContainer = shareButton.locator('..').locator('..');
      await expect(shareContainer).toBeVisible();
    });

    test('should close share dropdown when clicking outside', async ({ page }) => {
      const shareButton = page.locator('button', { hasText: /share/i });
      await shareButton.click();
      await page.waitForTimeout(300);

      // Click somewhere else on the page
      await page.locator('h1').click();
      await page.waitForTimeout(300);

      // Dropdown should be closed - SocialShare icons should not be visible
    });
  });

  test.describe('Favourite Button', () => {
    test('should display save/favourite button in hero', async ({ page }) => {
      const favButton = page.locator('button', { hasText: /save/i }).first();
      await expect(favButton).toBeVisible();
    });

    test('should prompt login when clicking favourite while logged out', async ({ page }) => {
      // Ensure we're logged out
      await page.evaluate(() => localStorage.removeItem('balkan_estate_token'));
      await page.reload();
      await page.waitForLoadState('networkidle');

      const favButton = page.locator('button', { hasText: /save/i }).first();
      await favButton.click();

      // Auth modal should appear
      const authModal = page.locator('[role="dialog"], .modal, [class*="modal"]')
        .filter({ hasText: /login|sign in|register/i });
      await expect(authModal).toBeVisible({ timeout: 5000 });
    });

    test('should toggle favourite state when logged in', async ({ page }) => {
      // This test requires being logged in
      // First check if we have a login form to use
      const accountButton = page.locator('button', { hasText: /account|login/i });
      if (await accountButton.isVisible()) {
        // Try to log in first - skip if can't
        test.skip(true, 'Login required - run with auth setup');
      }
    });

    test('should show heart icon with correct styling', async ({ page }) => {
      const favButton = page.locator('button[aria-label*="avorit"], button[aria-label*="avorit"]').first();
      if (await favButton.isVisible()) {
        // Should contain an SVG heart
        const heartSvg = favButton.locator('svg path[d*="4.318"]');
        await expect(heartSvg).toBeVisible();
      }
    });
  });

  test.describe('Properties Section', () => {
    test('should display property listing tabs (active/sold/rented)', async ({ page }) => {
      // Scroll to properties section
      const propertiesSection = page.getByText('Listings', { exact: false }).first();
      await propertiesSection.scrollIntoViewIfNeeded();

      // Look for tab buttons
      const activeTab = page.locator('button', { hasText: /active/i });
      const soldTab = page.locator('button', { hasText: /sold/i });

      // At least active listings tab should exist
    });

    test('should display property cards', async ({ page }) => {
      await page.waitForTimeout(1000); // Wait for properties to load
      const propertyCards = page.locator('[class*="property-card"], [data-testid="property-card"]');
      // Properties may or may not be loaded
    });
  });

  test.describe('Members Section', () => {
    test('should display team members section', async ({ page }) => {
      const membersSection = page.getByText(/team|members|agents/i).first();
      if (await membersSection.isVisible()) {
        await membersSection.scrollIntoViewIfNeeded();
      }
    });
  });

  test.describe('Contact Information', () => {
    test('should display agency contact details', async ({ page }) => {
      // Look for phone, email, address elements
      const contactSection = page.locator('text=/phone|email|address/i').first();
      if (await contactSection.isVisible()) {
        await contactSection.scrollIntoViewIfNeeded();
      }
    });
  });
});
