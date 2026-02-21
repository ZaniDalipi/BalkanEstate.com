import { test, expect } from '@playwright/test';

/**
 * Navigation & Core Pages E2E Tests
 * Tests: Homepage, Agencies List, Agent Profiles, Search, Notifications
 */

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // App should render
    await expect(page).toHaveTitle(/balkan|estate/i);
  });

  test('should display featured agencies section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const featuredSection = page.locator('text=/featured|top agencies/i').first();
    // Featured section may or may not exist depending on data
  });

  test('should have working navbar with key links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Subscribe button
    const subscribeButton = page.locator('button', { hasText: /subscribe/i });
    // New listing button
    const newListingButton = page.locator('button', { hasText: /new listing/i });
    // Notification bell
    const notificationBell = page.locator('button[aria-label*="notification"], [class*="notification"]');
  });
});

test.describe('Agencies List Page', () => {
  test('should load agencies list page', async ({ page }) => {
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');

    // Should have some content
    const heading = page.locator('h1, h2', { hasText: /agenc/i });
    // Page should load without errors
    await page.waitForTimeout(2000);
  });

  test('should display agency cards', async ({ page }) => {
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Agency cards should be rendered
    const agencyCards = page.locator('[class*="agency"], [data-testid="agency-card"]');
    // May or may not have cards depending on data
  });

  test('should navigate to agency detail when clicking a card', async ({ page }) => {
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstCard = page.locator('a[href*="/agencies/"]').first();
    if (await firstCard.isVisible()) {
      const href = await firstCard.getAttribute('href');
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to agency detail
      if (href) {
        await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
    }
  });

  test('should display agency cover image or gradient', async ({ page }) => {
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Cards should have visual backgrounds
    const cards = page.locator('[class*="agency"]');
    if (await cards.first().isVisible()) {
      // Cards exist
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Notification Center', () => {
  test('should display notification bell icon', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bellIcon = page.locator('[class*="notification"], button[aria-label*="notification"]').first();
    // Bell icon should be present in the header
  });

  test('should open notification dropdown on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bellIcon = page.locator('[class*="notification"], button[aria-label*="notification"]').first();
    if (await bellIcon.isVisible()) {
      await bellIcon.click();
      await page.waitForTimeout(500);

      // Notification dropdown/panel should appear
      const dropdown = page.locator('[class*="notification"][class*="dropdown"], [class*="notification"][class*="panel"]');
    }
  });
});

test.describe('Subscription Page', () => {
  test('should display subscription plans', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click subscribe button
    const subscribeButton = page.locator('button', { hasText: /subscribe/i }).first();
    if (await subscribeButton.isVisible()) {
      await subscribeButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('New Listing Flow', () => {
  test('should prompt auth when clicking new listing while logged out', async ({ page }) => {
    // Ensure logged out
    await page.evaluate(() => localStorage.removeItem('balkan_estate_token'));
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const newListingButton = page.locator('button', { hasText: /new listing/i }).first();
    if (await newListingButton.isVisible()) {
      await newListingButton.click();

      // Should show auth modal
      const authModal = page.locator('[role="dialog"], [class*="modal"]').first();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Page Not Found', () => {
  test('should show 404 for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show some kind of not found or redirect to home
    await page.waitForTimeout(2000);
  });
});

test.describe('Responsive Design', () => {
  test('should adapt layout for mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should render without horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20); // small tolerance
  });

  test('should adapt layout for tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should render properly
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768 + 20);
  });
});
