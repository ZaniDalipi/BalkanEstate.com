import axios from 'axios';
import { findListingApi, type ListingApi } from '../browserApiSniff';
import type { CapturedJson } from '../browserClient';
import { chunkUrlsFromBundle, extractApiCandidates, scriptUrlsFromHtml } from './extractApiCandidates';

const TIMEOUT_MS = 8_000;
const MAX_SCRIPT_BYTES = 8_000_000;
const MAX_SCRIPTS = 12;
const PROBE_BATCH = 5;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** A text body, or null on any failure. */
const getText = async (url: string, headers: Record<string, string> = {}): Promise<string | null> => {
  try {
    const r = await axios.get<string>(url, {
      timeout: TIMEOUT_MS,
      responseType: 'text',
      maxContentLength: MAX_SCRIPT_BYTES,
      headers: { 'User-Agent': UA, ...headers },
      validateStatus: (s) => s >= 200 && s < 300,
      transformResponse: (d: unknown) => d,
    });
    return typeof r.data === 'string' ? r.data : null;
  } catch {
    return null;
  }
};

/** The app's JavaScript: its scripts, then the route chunks they load lazily. */
const loadAppScripts = async (html: string, pageUrl: string): Promise<string[]> => {
  const entry = scriptUrlsFromHtml(html, pageUrl).slice(0, MAX_SCRIPTS);
  const entryJs = (await Promise.all(entry.map((u) => getText(u)))).map((js, i) => ({ url: entry[i], js }));
  const loaded = entryJs.filter((s): s is { url: string; js: string } => s.js !== null);

  const seen = new Set(entry);
  const chunks = loaded
    .flatMap((s) => chunkUrlsFromBundle(s.js, s.url))
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
    .slice(0, Math.max(0, MAX_SCRIPTS - loaded.length));
  const chunkJs = await Promise.all(chunks.map((u) => getText(u)));

  // Inline scripts can hold the API address too (window.ENV = { API_URL: … }).
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return [...inline, ...loaded.map((s) => s.js), ...chunkJs.filter((js): js is string => js !== null)];
};

const probeJson = async (url: string, pageOrigin: string): Promise<CapturedJson | null> => {
  const body = await getText(url, { Accept: 'application/json', Origin: pageOrigin, Referer: `${pageOrigin}/` });
  if (!body || !/^\s*[[{]/.test(body)) return null;
  try {
    return { url, data: JSON.parse(body) as unknown };
  } catch {
    return null;
  }
};

/**
 * Finds the API a single-page app loads its listings from by reading its
 * JavaScript and probing the addresses it names. No browser needed.
 */
export const discoverBundleApi = async (html: string, pageUrl: string): Promise<ListingApi | null> => {
  const scripts = await loadAppScripts(html, pageUrl);
  if (!scripts.length) return null;
  const { urls } = extractApiCandidates(scripts, pageUrl);
  const origin = new URL(pageUrl).origin;

  for (let i = 0; i < urls.length; i += PROBE_BATCH) {
    const batch = await Promise.all(urls.slice(i, i + PROBE_BATCH).map((u) => probeJson(u, origin)));
    const found = findListingApi(batch.filter((b): b is CapturedJson => b !== null));
    if (found) return found;
  }
  return null;
};
