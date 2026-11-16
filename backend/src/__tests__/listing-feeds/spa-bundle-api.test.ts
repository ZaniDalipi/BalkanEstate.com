process.env.SKIP_TEST_DB = 'true';

/**
 * Sites built as single-page apps (React/Vue on Netlify, Vercel …) send an
 * empty shell; the listings come from an API the JavaScript calls. Detection
 * must find that API by reading the app's scripts — with no headless browser,
 * since production may have none.
 */

jest.mock('axios', () => {
  const get = jest.fn();
  return { __esModule: true, default: { get, isAxiosError: () => false }, get, isAxiosError: () => false };
});
jest.mock('../../services/listingAdapters/httpClient', () => ({ httpGet: jest.fn().mockRejectedValue(new Error('404')) }));
jest.mock('../../services/listingAdapters/browserClient', () => ({
  fetchWithBrowser: jest.fn().mockRejectedValue(new Error('No Chromium binary found')),
}));

import axios from 'axios';
import {
  chunkUrlsFromBundle, extractApiCandidates, looksLikeAppShell, scriptUrlsFromHtml,
} from '../../services/listingAdapters/spaBundle/extractApiCandidates';
import { detectFeedForUrl } from '../../services/listingDetectorService';

const PAGE = 'https://trust.example.app/product/list';

const SHELL = `<!doctype html><html><head><title>Trust</title>
  <script type="module" crossorigin src="/assets/index-a1B2c3D4.js"></script></head>
  <body><div id="root"></div></body></html>`;

const MAIN_JS = `const api=axios.create({baseURL:"https://trust-api.onrender.com/api"});
  const fonts="https://fonts.googleapis.com/css2";
  const routes=[{path:"/product/list",lazy:()=>import("./ProductList-Zx9Yw8Vu.js")},{path:"/about"}];`;
const CHUNK_JS = `export const load=()=>api.get(\`/product/all?page=\${p}\`);export const one=id=>api.get("/product/"+id);`;

const LISTINGS = {
  success: true,
  data: [1, 2, 3].map((i) => ({
    _id: `65f1c2a9e4b0a1b2c3d4e5f${i}`, name: `Banesë ${i} në Prishtinë`, price: 80000 + i, city: 'Prishtinë', area: 70 + i,
  })),
};

const serve = (routes: Record<string, unknown>) =>
  (axios.get as jest.Mock).mockImplementation(async (url: string) => {
    const bare = url.split('?')[0];
    if (!(bare in routes)) throw Object.assign(new Error('404'), { response: { status: 404 } });
    const data = routes[bare];
    return { status: 200, data: typeof data === 'string' ? data : JSON.stringify(data), headers: {}, request: { res: { responseUrl: url } } };
  });

describe('reading a single-page app', () => {
  it('spots an empty app shell, but not a page with content', () => {
    expect(looksLikeAppShell(SHELL)).toBe(true);
    expect(looksLikeAppShell(`<html><body><div id="root">${'<p>Listing text here. </p>'.repeat(200)}</div></body></html>`)).toBe(false);
  });

  it('lists the scripts and the lazily loaded route chunks, listing pages first', () => {
    expect(scriptUrlsFromHtml(SHELL, PAGE)).toEqual(['https://trust.example.app/assets/index-a1B2c3D4.js']);
    expect(chunkUrlsFromBundle(MAIN_JS, 'https://trust.example.app/assets/index-a1B2c3D4.js'))
      .toEqual(['https://trust.example.app/assets/ProductList-Zx9Yw8Vu.js']);
  });

  it('combines the API base with the listing paths it calls', () => {
    const { urls } = extractApiCandidates([MAIN_JS, CHUNK_JS], PAGE);
    expect(urls).toContain('https://trust-api.onrender.com/api/product/all');
    expect(urls).toContain('https://trust-api.onrender.com/api/product/list');
    expect(urls.some((u) => u.includes('googleapis'))).toBe(false);
    expect(urls.some((u) => u.includes('/api/api/'))).toBe(false);
  });
});

describe('detectFeedForUrl on a single-page app without a browser', () => {
  beforeEach(() => (axios.get as jest.Mock).mockReset());

  it('sets the feed up on the API the app loads its listings from', async () => {
    serve({
      [PAGE]: SHELL,
      'https://trust.example.app/assets/index-a1B2c3D4.js': MAIN_JS,
      'https://trust.example.app/assets/ProductList-Zx9Yw8Vu.js': CHUNK_JS,
      'https://trust-api.onrender.com/api/product/all': LISTINGS,
    });
    const result = await detectFeedForUrl(PAGE);
    expect(result.adapterType).toBe('jsonFeed');
    expect(result.adapterConfig).toMatchObject({ endpoint: 'https://trust-api.onrender.com/api/product/all', itemsPath: '$.data[*]' });
    expect(result.sample).toMatchObject({ name: 'Banesë 1 në Prishtinë' });
  });

  it('explains what to do when the app\'s API cannot be found', async () => {
    serve({ [PAGE]: SHELL, 'https://trust.example.app/assets/index-a1B2c3D4.js': 'console.log(1)' });
    await expect(detectFeedForUrl(PAGE)).rejects.toThrow(/builds its pages with JavaScript/);
  });
});
