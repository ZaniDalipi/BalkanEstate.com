/**
 * Playwright-based page fetcher for JavaScript-rendered sites.
 *
 * Uses a single shared browser instance (lazy-initialised) to avoid the
 * 2-3s Chromium launch overhead on every request. The browser is kept alive
 * for the process lifetime; each fetch opens and closes its own page/tab.
 *
 * Environmental requirements:
 *   PLAYWRIGHT_BROWSERS_PATH  — optional override (defaults to /opt/pw-browsers)
 *   PLAYWRIGHT_CHROMIUM_PATH  — explicit binary path override
 */
import { cronLogger } from '../../utils/logger';

const log = cronLogger;

// ── Browser instance singleton ────────────────────────────────────────────────

let _browser: import('playwright-core').Browser | null = null;
let _launching = false;
let _launchWaiters: Array<(b: import('playwright-core').Browser | null) => void> = [];

const CHROMIUM_PATHS = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium-1208/chrome-linux/chrome',
  // Common system paths
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].filter(Boolean) as string[];

const findChromiumBinary = async (): Promise<string | undefined> => {
  const { existsSync } = await import('fs');
  for (const p of CHROMIUM_PATHS) {
    if (existsSync(p)) return p;
  }
  return undefined;
};

const getBrowser = async (): Promise<import('playwright-core').Browser> => {
  if (_browser && _browser.isConnected()) return _browser;
  if (_launching) {
    return new Promise((resolve) => {
      _launchWaiters.push((b) => {
        if (b) resolve(b);
        else resolve(getBrowser());
      });
    });
  }

  _launching = true;
  try {
    const { chromium } = await import('playwright-core');
    const executablePath = await findChromiumBinary();
    if (!executablePath) {
      throw new Error('No Chromium binary found — run "npx playwright install chromium"');
    }

    log.info(`[browser] Launching Chromium at ${executablePath}`);
    _browser = await chromium.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
      ],
    });

    _browser.on('disconnected', () => {
      log.info('[browser] Browser disconnected — will re-launch on next request');
      _browser = null;
    });

    _launchWaiters.forEach((cb) => cb(_browser));
    _launchWaiters = [];
    return _browser!;
  } catch (err) {
    _launching = false;
    _launchWaiters.forEach((cb) => cb(null));
    _launchWaiters = [];
    throw err;
  } finally {
    _launching = false;
  }
};

export interface BrowserFetchResult {
  html: string;
  url: string;
}

/**
 * Fetch a URL using a real Chromium browser. Waits for the network to quiet
 * down (networkidle) so JS-rendered content and lazy-loaded images are present.
 *
 * Times out after `timeoutMs` (default 30s). On failure throws with a message
 * that includes the reason.
 */
export const fetchWithBrowser = async (
  url: string,
  options: {
    timeoutMs?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    /** Extra CSS selector to wait for before returning (e.g. a listing card class). */
    waitForSelector?: string;
    /** Additional ms to wait after load before snapshot. Useful for React hydration. */
    settleMs?: number;
  } = {}
): Promise<BrowserFetchResult> => {
  const {
    timeoutMs = 30_000,
    waitUntil = 'networkidle',
    waitForSelector,
    settleMs = 500,
  } = options;

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9,hr;q=0.8,sr;q=0.7',
    },
  });

  try {
    const page = await context.newPage();

    // Block heavyweight resources that don't contribute to listing content.
    await page.route('**/*', (route) => {
      const rt = route.request().resourceType();
      if (['font', 'media', 'websocket'].includes(rt)) {
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });

    await page.goto(url, { waitUntil, timeout: timeoutMs });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10_000 }).catch(() => {});
    }
    if (settleMs > 0) {
      await page.waitForTimeout(settleMs);
    }

    const html = await page.content();
    const finalUrl = page.url();

    log.info(`[browser] Fetched ${url} → ${html.length} chars`);
    return { html, url: finalUrl };
  } finally {
    await context.close().catch(() => {});
  }
};

/**
 * Gracefully shut down the shared browser. Call on process exit.
 */
export const closeBrowser = async (): Promise<void> => {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
};
