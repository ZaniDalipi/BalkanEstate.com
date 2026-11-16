import { isValidListingItem } from '../listingNormalizerService';
import type { CapturedJson } from './browserClient';
import { findListingsInState } from './embeddedState';

export interface ListingApi {
  /** The API address the page fetched its listings from. */
  endpoint: string;
  /** JSONPath of the listings array inside the response. */
  itemsPath: string;
  items: Record<string, unknown>[];
}

/** Trackers, translations and settings — never the listings. */
const NOISE_URL_RE = /(analytics|gtag|google|facebook|sentry|hotjar|segment|mixpanel|clarity|doubleclick|intercom|cookie|consent|translat|locales?|i18n|\.well-known|manifest)/i;

/** The JSON response, among those a page loaded, that holds the most listings. */
export const findListingApi = (captured: CapturedJson[]): ListingApi | null => {
  let best: (ListingApi & { valid: number }) | null = null;
  for (const { url, data } of captured) {
    if (NOISE_URL_RE.test(url)) continue;
    const found = findListingsInState(data);
    if (!found) continue;
    const valid = found.items.filter(isValidListingItem).length;
    if (!best || valid > best.valid) best = { endpoint: url, ...found, valid };
  }
  return best ? { endpoint: best.endpoint, itemsPath: best.itemsPath, items: best.items } : null;
};
