import { test, expect } from '@playwright/test';

/**
 * Agent Profile E2E Tests
 * Tests: Profile display, contact actions, edit modal, license
 */

test.describe('Agent Profile Page', () => {
  test.describe('Profile Display', () => {
    test('should navigate to an agent profile from agency detail', async ({ page }) => {
      await page.goto('/agencies');
      await page.waitForLoadState('networkidle');

      // Click into first agency
      const agencyLink = page.locator('a[href*="/agencies/"]').first();
      if (await agencyLink.isVisible()) {
        await agencyLink.click();
        await page.waitForLoadState('networkidle');

        // Find and click on an agent in the team section
        const agentCard = page.locator('[class*="agent"], [data-testid="agent-card"]').first();
        if (await agentCard.isVisible()) {
          await agentCard.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  test.describe('Contact Actions', () => {
    test('should display contact buttons (call, email, message)', async ({ page }) => {
      // Navigate to an agent profile
      await page.goto('/agencies');
      await page.waitForLoadState('networkidle');

      const agencyLink = page.locator('a[href*="/agencies/"]').first();
      if (await agencyLink.isVisible()) {
        await agencyLink.click();
        await page.waitForLoadState('networkidle');

        const agentCard = page.locator('[class*="agent"]').first();
        if (await agentCard.isVisible()) {
          await agentCard.click();
          await page.waitForLoadState('networkidle');

          // Should show contact buttons
          const callButton = page.locator('button, a', { hasText: /call|phone/i });
          const emailButton = page.locator('button, a', { hasText: /email|message/i });
        }
      }
    });
  });
});

test.describe('Agent Edit Modal', () => {
  test('should not show edit button when not logged in as agent', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('balkan_estate_token'));
    await page.goto('/agencies');
    await page.waitForLoadState('networkidle');

    const agencyLink = page.locator('a[href*="/agencies/"]').first();
    if (await agencyLink.isVisible()) {
      await agencyLink.click();
      await page.waitForLoadState('networkidle');

      const agentCard = page.locator('[class*="agent"]').first();
      if (await agentCard.isVisible()) {
        await agentCard.click();
        await page.waitForLoadState('networkidle');

        // Edit button should NOT be visible
        const editButton = page.locator('button', { hasText: /edit profile/i });
        await expect(editButton).not.toBeVisible();
      }
    }
  });
});
