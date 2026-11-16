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

/** A JSON response the page fetched on its own while rendering (its data API). */
export interface CapturedJson {
  url: string;
  data: unknown;
}

export interface BrowserFetchResult {
  html: string;
  url: string;
  /** JSON GET responses the page loaded; only filled when `captureJson` is set. */
  json: CapturedJson[];
}

const MAX_CAPTURED_JSON = 40;
const MAX_JSON_BYTES = 5_000_000;
const SCROLL_STEPS = 6;

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
    /** Keep the JSON the page fetches (its data API), so listings can be read from the source. */
    captureJson?: boolean;
    /** Scroll down so lazily loaded / infinite-scroll cards are rendered before the snapshot. */
    scroll?: boolean;
  } = {}
): Promise<BrowserFetchResult> => {
  const {
    timeoutMs = 30_000,
    waitUntil = 'networkidle',
    waitForSelector,
    settleMs = 500,
    captureJson = false,
    scroll = false,
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

    const pending: Promise<void>[] = [];
    const json: CapturedJson[] = [];
    if (captureJson) {
      page.on('response', (res) => {
        const req = res.request();
        const type = req.resourceType();
        if (req.method() !== 'GET' || (type !== 'fetch' && type !== 'xhr') || !res.ok()) return;
        if (!(res.headers()['content-type'] ?? '').includes('json') || pending.length >= MAX_CAPTURED_JSON) return;
        pending.push(
          res.text().then((text) => {
            if (text.length > MAX_JSON_BYTES) return;
            json.push({ url: res.url(), data: JSON.parse(text) as unknown });
          }).catch(() => { /* body gone or not JSON */ })
        );
      });
    }

    await page.goto(url, { waitUntil, timeout: timeoutMs });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10_000 }).catch(() => {});
    }
    if (scroll) {
      let lastHeight = 0;
      for (let i = 0; i < SCROLL_STEPS; i++) {
        // A string: this project has no DOM types, the code runs inside the page.
        const height = await page.evaluate<number>(
          '(window.scrollTo(0, document.body.scrollHeight), document.body.scrollHeight)'
        ).catch(() => lastHeight);
        if (height === lastHeight) break;
        lastHeight = height;
        await page.waitForTimeout(500);
      }
    }
    if (settleMs > 0) {
      await page.waitForTimeout(settleMs);
    }
    await Promise.allSettled(pending);

    const html = await page.content();
    const finalUrl = page.url();

    log.info(`[browser] Fetched ${url} → ${html.length} chars, ${json.length} JSON response(s)`);
    return { html, url: finalUrl, json };
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
