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
const DEFAULT_SELECTOR = 'body';

/**
 * Launch a headless browser, navigate to the URL, wait for a CSS selector,
 * and return the full page HTML. Throws a descriptive error if Puppeteer is not installed.
 */
export const fetchRenderedHtml = async (
  url: string,
  waitForSelector: string = DEFAULT_SELECTOR,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> => {
  if (!puppeteer) {
    throw new Error(
      'Puppeteer is not installed. Run: npm install puppeteer --save-dev'
    );
  }

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('BalkanEstateBot/1.0');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    await page.waitForSelector(waitForSelector, { timeout: timeoutMs });
    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
};
