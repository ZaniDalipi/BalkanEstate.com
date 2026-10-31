import * as cheerio from 'cheerio';
import { isValidListingItem } from '../listingNormalizerService';

export interface EmbeddedListings {
  items: Record<string, unknown>[];
  /** JSONPath of the array inside the embedded state (for display / config). */
  itemsPath: string;
  source: string;
}

/**
 * Walk a deeply-nested object/array and return the first array that has at
 * least 2 items that look like real-estate listings.
 */
const findListingsInState = (
  obj: unknown,
  depth = 0,
  path = '$'
): { items: Record<string, unknown>[]; itemsPath: string } | null => {
  if (depth > 7 || obj == null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length >= 2) {
      const records = obj.filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null && !Array.isArray(i));
      if (records.filter((i) => isValidListingItem(i)).length >= 2) return { items: records, itemsPath: `${path}[*]` };
    }
    return null;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const result = findListingsInState(val, depth + 1, `${path}.${key}`);
    if (result) return result;
  }
  return null;
};

/**
 * The JSON object literal starting at `start` (which must point at `{`),
 * found by balanced-brace scanning that respects strings — so states of any
 * size parse, not just small ones.
 */
export const readJsonObjectAt = (text: string, start: number): unknown => {
  if (text[start] !== '{') return undefined;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
};

const assignedObject = (html: string, re: RegExp): unknown => {
  const m = re.exec(html);
  if (!m) return undefined;
  const brace = html.indexOf('{', m.index + m[0].length - 1);
  return brace >= 0 ? readJsonObjectAt(html, brace) : undefined;
};

/**
 * Listing data embedded in a page's JavaScript state: Next.js
 * (__NEXT_DATA__), Nuxt (window.__NUXT__), window.__INITIAL_STATE__ /
 * __PRELOADED_STATE__, or any <script type="application/json"> block.
 */
export const extractEmbeddedSpaListings = (html: string): EmbeddedListings | null => {
  const $ = cheerio.load(html);
  const candidates: Array<{ data: unknown; source: string }> = [];

  const next = $('script#__NEXT_DATA__').contents().text();
  if (next) {
    try {
      const data = JSON.parse(next) as Record<string, unknown>;
      const props = (data.props as Record<string, unknown> | undefined) ?? data;
      candidates.push({ data: props.pageProps ?? props, source: '__NEXT_DATA__' });
    } catch { /* not JSON */ }
  }
  const nuxt = assignedObject(html, /window\.__NUXT__\s*=\s*\{/);
  if (nuxt) candidates.push({ data: (nuxt as Record<string, unknown>).data ?? nuxt, source: '__NUXT__' });
  const state = assignedObject(html, /window\.__(?:INITIAL_STATE|PRELOADED_STATE|STATE|APP_STATE)__\s*=\s*\{/i);
  if (state) candidates.push({ data: state, source: '__INITIAL_STATE__' });
  $('script[type="application/json"]').each((_, el) => {
    if ($(el).attr('id') === '__NEXT_DATA__') return;
    const text = $(el).contents().text();
    if (!text || text.length < 50) return;
    try {
      candidates.push({ data: JSON.parse(text), source: 'application/json script' });
    } catch { /* not JSON */ }
  });

  for (const c of candidates) {
    const found = findListingsInState(c.data);
    if (found) return { ...found, source: c.source };
  }
  return null;
};
