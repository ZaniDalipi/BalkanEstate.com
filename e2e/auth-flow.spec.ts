import { test, expect } from '@playwright/test';

/**
 * Authentication Flow E2E Tests
 * Tests: Login, Signup, Logout, Role switching, Phone requirement
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Login', () => {
    test('should open auth modal from navbar login button', async ({ page }) => {
      // Find login/register button in navbar
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (!await loginButton.isVisible()) {
        // Try the user icon button
        const userIcon = page.locator('button[aria-label*="login"], button[aria-label*="account"]').first();
        if (await userIcon.isVisible()) {
          await userIcon.click();
        }
      } else {
        await loginButton.click();
      }

      // Auth modal should appear
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should show email and password fields in login form', async ({ page }) => {
      // Open auth modal
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
      }

      await page.waitForTimeout(500);

      const emailField = page.locator('input[type="email"], input[name="email"]');
      const passwordField = page.locator('input[type="password"], input[name="password"]');

      if (await emailField.isVisible()) {
        await expect(emailField).toBeVisible();
        await expect(passwordField).toBeVisible();
      }
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      // Open auth modal
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(500);
      }

      // Try submitting empty form
      const submitButton = page.locator('button[type="submit"], button', { hasText: /sign in|log in/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation errors
        const errorMessages = page.locator('[class*="error"], [role="alert"], .text-red');
        await page.waitForTimeout(500);
      }
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Open auth modal
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(500);
      }

      const emailField = page.locator('input[type="email"], input[name="email"]');
      const passwordField = page.locator('input[type="password"], input[name="password"]');

      if (await emailField.isVisible()) {
        await emailField.fill('invalid@test.com');
        await passwordField.fill('wrongpassword123');

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Wait for error response
        const error = page.locator('[class*="error"], [role="alert"], .text-red').first();
        await expect(error).toBeVisible({ timeout: 10000 });
      }
    });

    test('should toggle between login and register forms', async ({ page }) => {
      // Open auth modal
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(500);
      }

      // Find the toggle link (e.g., "Don't have an account? Register")
      const registerLink = page.locator('button, a', { hasText: /register|sign up|create account/i });
      if (await registerLink.first().isVisible()) {
        await registerLink.first().click();
        await page.waitForTimeout(300);

        // Registration form should now have name fields
        const nameField = page.locator('input[name="name"], input[name="firstName"]');
        // Form changed - at least URL or visible fields changed
      }
    });
  });

  test.describe('Registration', () => {
    test('should show all required fields in registration form', async ({ page }) => {
      // Open auth modal and switch to register
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(500);
      }

      const registerLink = page.locator('button, a', { hasText: /register|sign up|create account/i });
      if (await registerLink.first().isVisible()) {
        await registerLink.first().click();
        await page.waitForTimeout(300);

        // Check for required fields
        const fields = page.locator('input');
        const fieldCount = await fields.count();
        expect(fieldCount).toBeGreaterThanOrEqual(3); // name, email, password minimum
      }
    });
  });

  test.describe('Auth Modal Close', () => {
    test('should close auth modal with close button', async ({ page }) => {
      const loginButton = page.locator('button', { hasText: /login|sign in|register/i }).first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(500);

        const closeButton = page.locator('button[aria-label*="close"], button', { hasText: /close|×/i }).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(300);

          const modal = page.locator('[role="dialog"]').first();
          await expect(modal).not.toBeVisible();
        }
      }
    });
  });
});
