/**
 * WebKit detection in the performance governor.
 *
 * `html.is-webkit` gates the whole "WebKit compositing budget" section of
 * src/index.css — the blur radii it trims and the ambient loops it stops. Two
 * things have to hold. Every WebKit browser must be caught, including the
 * Chrome/Firefox/Edge builds on iOS, which are WebKit underneath and share the
 * problem. And no Blink or Gecko browser may be caught, because those render
 * the design as intended today and should keep doing so.
 *
 * The UA strings below are real ones, kept verbatim — the whole point of the
 * check is that it survives their overlapping vocabulary ("Safari" appears in
 * nearly all of them).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Swap in a browser's identity, then boot a fresh copy of the module. */
async function bootAs(userAgent: string, vendor: string): Promise<boolean> {
  vi.resetModules();
  document.documentElement.className = '';
  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });
  Object.defineProperty(window.navigator, 'vendor', { value: vendor, configurable: true });

  const { initPerfMode } = await import('@/src/utils/perfMode');
  initPerfMode();
  return document.documentElement.classList.contains('is-webkit');
}

const APPLE = 'Apple Computer, Inc.';
const GOOGLE = 'Google Inc.';

describe('perfMode WebKit detection', () => {
  const realUA = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
  const realVendor = Object.getOwnPropertyDescriptor(window.navigator, 'vendor');

  beforeEach(() => {
    // matchMedia is not implemented in jsdom; the governor guards for its
    // absence, but stubbing it keeps this test about detection alone.
    vi.stubGlobal('matchMedia', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (realUA) Object.defineProperty(window.navigator, 'userAgent', realUA);
    if (realVendor) Object.defineProperty(window.navigator, 'vendor', realVendor);
    document.documentElement.className = '';
  });

  it('catches Safari on macOS', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        APPLE,
      ),
    ).toBe(true);
  });

  it('catches Safari on iPhone', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        APPLE,
      ),
    ).toBe(true);
  });

  it('catches Chrome on iOS, which is WebKit wearing a Chrome user agent', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
        APPLE,
      ),
    ).toBe(true);
  });

  it('catches Firefox on iOS', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15',
        APPLE,
      ),
    ).toBe(true);
  });

  it('leaves Chrome on macOS alone', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        GOOGLE,
      ),
    ).toBe(false);
  });

  it('leaves Chrome on Android alone', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
        GOOGLE,
      ),
    ).toBe(false);
  });

  it('leaves Edge on Windows alone', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.65',
        GOOGLE,
      ),
    ).toBe(false);
  });

  it('leaves Firefox on the desktop alone', async () => {
    expect(
      await bootAs(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
        '',
      ),
    ).toBe(false);
  });
});

/**
 * The same detection is written twice on purpose: index.html runs it before
 * first paint so Safari never renders a frame of the expensive style, and
 * perfMode re-runs it on boot for tests and for any host that serves the app
 * without that script. Two copies can drift, so this pins them together — if
 * one is taught about a browser the other is not, this fails.
 */
describe('the pre-paint copy of the detection in index.html', () => {
  /** Run the inline script against a browser identity, in isolation. */
  function inlineScriptSays(userAgent: string, vendor: string): boolean {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
    // index.html has several inline scripts, so split on the closing tag and
    // take the one block that mentions the class rather than regexing across
    // the whole file.
    const body = html
      .split('</script>')
      .map((chunk) => chunk.slice(chunk.lastIndexOf('<script>') + '<script>'.length))
      .find((chunk) => chunk.includes('is-webkit'));
    expect(body, 'the is-webkit script is still in index.html').toBeDefined();
    const classes = new Set<string>();
    const fakeDocument = { documentElement: { classList: { add: (c: string) => classes.add(c) } } };
    // eslint-disable-next-line no-new-func
    new Function('navigator', 'document', body!)({ userAgent, vendor }, fakeDocument);
    return classes.has('is-webkit');
  }

  const browsers: Array<[string, string, string]> = [
    ['Safari on macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15', APPLE],
    ['Safari on iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', APPLE],
    ['Chrome on iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1', APPLE],
    ['Firefox on iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15', APPLE],
    ['Chrome on macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', GOOGLE],
    ['Chrome on Android', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36', GOOGLE],
    ['Edge on Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.65', GOOGLE],
    ['Firefox on the desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0', ''],
  ];

  it.each(browsers)('agrees with perfMode about %s', async (_name, ua, vendor) => {
    expect(inlineScriptSays(ua, vendor)).toBe(await bootAs(ua, vendor));
  });
});
