import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chrome if Playwright-managed binary is unavailable
        ...(process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {}),
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        ...(process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {}),
      },
    },
  ],

  // Start dev server before running tests.
  // If the dev server is already running, Playwright reuses it (reuseExistingServer).
  // In CI, a fresh server is spawned. Locally, start the server yourself first:
  //   Terminal 1: cd backend && npm run dev
  //   Terminal 2: npm run dev
  //   Terminal 3: npm run test:e2e
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
