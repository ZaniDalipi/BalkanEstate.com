// Puppeteer is an optional peer dependency — install it when needed:
// npm install puppeteer --save-dev
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteer: any | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  puppeteer = require('puppeteer');
} catch {
  // not installed
}

const DEFAULT_TIMEOUT_MS = 30_000;

export interface BrowserFetchOptions {
  /** Puppeteer waitUntil strategy (e.g. 'networkidle2', 'domcontentloaded'). */
  waitUntil?: string;
  /** Extra ms to wait after page load before capturing HTML. */
  settleMs?: number;
  timeout?: number;
  waitForSelector?: string;
}

export interface BrowserFetchResult {
  html: string;
  status?: number;
}

/**
 * Launch a headless browser, navigate to the URL, optionally wait for a CSS selector,
 * and return { html }. Throws a descriptive error if Puppeteer is not installed.
 */
export const fetchWithBrowser = async (
  url: string,
  options: BrowserFetchOptions = {}
): Promise<BrowserFetchResult> => {
  if (!puppeteer) {
    throw new Error(
      'Puppeteer is not installed. Run: npm install puppeteer --save-dev'
    );
  }

  const {
    waitUntil = 'networkidle2',
    settleMs = 0,
    timeout = DEFAULT_TIMEOUT_MS,
    waitForSelector,
  } = options;

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('BalkanEstateBot/1.0');
    await page.goto(url, { waitUntil, timeout });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    }
    if (settleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, settleMs));
    }
    const html: string = await page.content();
    return { html };
  } finally {
    await browser.close();
  }
};

/** @deprecated Use fetchWithBrowser */
export const fetchRenderedHtml = async (
  url: string,
  waitForSelector?: string,
  timeoutMs?: number
): Promise<string> => {
  const result = await fetchWithBrowser(url, { waitForSelector, timeout: timeoutMs });
  return result.html;
};
