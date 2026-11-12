import { parseStringPromise } from 'xml2js';
import { isValidListingItem } from '../../listingNormalizerService';

/** Parser options shared by detection and the adapter, so paths line up. */
export const XML_PARSER_OPTIONS = { explicitArray: false, mergeAttrs: true } as const;

export type XmlFeedKind =
  | { kind: 'rss' }
  | { kind: 'listings'; itemsPath: string; idPath: string; urlPath?: string; items: Record<string, unknown>[] };

const ID_KEYS = ['id', 'ref', 'reference', 'listing_id', 'property_id', 'propertyid', 'code', 'sifra', 'uid', 'guid', 'unique_id'];
const URL_KEYS = ['url', 'link', 'permalink', 'web_url', 'weburl', 'detail_url', 'listing_url', 'property_url'];

/** Body is XML (a feed export), not an HTML page. */
export const looksLikeXml = (body: string): boolean => {
  const head = body.slice(0, 500).trimStart().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  return head.startsWith('<?xml') || /^<[a-z_][\w:.-]*[\s>]/.test(head);
};

const seg = (key: string): string => `['${key.replace(/'/g, "\\'")}']`;

interface Found { path: string; items: Record<string, unknown>[]; valid: number }

/** The repeated element holding the most listing-like records. */
const findListingArray = (node: unknown, path: string, depth: number, best: Found | null): Found | null => {
  if (depth > 8 || node == null || typeof node !== 'object') return best;
  if (Array.isArray(node)) {
    const records = node.filter((n): n is Record<string, unknown> => !!n && typeof n === 'object' && !Array.isArray(n));
    const valid = records.filter((r) => isValidListingItem(r)).length;
    if (valid > 0 && (!best || valid > best.valid)) best = { path: `${path}[*]`, items: records, valid };
    // Listings never nest inside other listings; don't descend.
    return best;
  }
  const entries = Object.entries(node as Record<string, unknown>);
  for (const [key, value] of entries) best = findListingArray(value, `${path}${seg(key)}`, depth + 1, best);
  // A feed with a single listing: xml2js gives an object, not an array.
  if (!best && depth > 0 && isValidListingItem(node as Record<string, unknown>)) {
    return { path, items: [node as Record<string, unknown>], valid: 1 };
  }
  return best;
};

const firstKey = (sample: Record<string, unknown>, keys: string[]): string | undefined => {
  const lowerKeys = new Map(Object.keys(sample).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const real = lowerKeys.get(k);
    if (real && sample[real] != null && typeof sample[real] !== 'object') return real;
  }
  return undefined;
};

/**
 * Recognise an XML listings feed: RSS/Atom, or an agency export
 * (`<properties><property>…`, Kyero-style, OpenImmo-style…). Returns where the
 * listings are and how to identify them, or null when it isn't one.
 */
export const detectXmlFeed = async (body: string): Promise<XmlFeedKind | null> => {
  if (!looksLikeXml(body)) return null;
  const head = body.slice(0, 2000).toLowerCase();
  if (/<urlset\b|<sitemapindex\b/.test(head)) return null;
  if (/<rss\b|<feed\b[^>]*atom/.test(head)) return { kind: 'rss' };

  let parsed: unknown;
  try {
    parsed = await parseStringPromise(body, XML_PARSER_OPTIONS);
  } catch {
    return null;
  }
  const found = findListingArray(parsed, '$', 0, null);
  if (!found) return null;
  const sample = found.items.find((i) => isValidListingItem(i)) ?? found.items[0];
  const idKey = firstKey(sample, ID_KEYS);
  const urlKey = firstKey(sample, URL_KEYS);
  return {
    kind: 'listings',
    itemsPath: found.path,
    idPath: idKey ? `$${seg(idKey)}` : '$.id',
    urlPath: urlKey ? `$${seg(urlKey)}` : undefined,
    items: found.items.filter((i) => isValidListingItem(i)),
  };
};
