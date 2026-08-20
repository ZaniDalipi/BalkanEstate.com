import { JSONPath } from 'jsonpath-plus';
import type { IListingSource } from '../../models/ListingSource';

/**
 * Shared adapter-config helpers.
 *
 * Adapter configs are stored as free-form `Mixed` documents, and they have been
 * written by several producers over time (the auto-detector, the "paste JSON
 * sample" wizard, and hand-edits in the feed form). Those producers did not
 * always agree on key names — the detector emitted `url`/`params` while the
 * adapters read `endpoint`/`query`, which made every source created from
 * detection fail at fetch time with "endpoint, itemsPath and idPath required".
 *
 * These helpers accept every alias that has been persisted so existing sources
 * keep working without a migration, while new writes use the canonical names.
 */

/** Accepted aliases for the remote endpoint, in priority order. */
const ENDPOINT_KEYS = ['endpoint', 'url', 'apiUrl', 'feedUrl', 'indexUrl'] as const;

/** Accepted aliases for the static query-string parameters, in priority order. */
const QUERY_KEYS = ['query', 'params', 'queryParams'] as const;

const nonEmptyString = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s || undefined;
};

/**
 * Pick the endpoint out of an adapter config, tolerating legacy key names.
 * Returns undefined when no alias holds a usable string.
 */
export const resolveEndpoint = (cfg: Record<string, unknown>): string | undefined => {
  for (const key of ENDPOINT_KEYS) {
    const value = nonEmptyString(cfg[key]);
    if (value) return value;
  }
  return undefined;
};

/** True when `endpoint` is an absolute http(s) URL we can actually fetch. */
export const isFetchableUrl = (endpoint: string): boolean => {
  try {
    const { protocol } = new URL(endpoint);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Pick the static query parameters out of an adapter config, tolerating legacy
 * key names. Values are stringified because they end up in a query string.
 */
export const resolveQueryParams = (
  cfg: Record<string, unknown>
): Record<string, string> | undefined => {
  for (const key of QUERY_KEYS) {
    const value = cfg[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v == null || typeof v === 'object') continue;
      out[k] = String(v);
    }
    if (Object.keys(out).length) return out;
  }
  return undefined;
};

/**
 * A feed whose stored config can't be used. This is a user-fixable state, not
 * a server fault, so callers map it to HTTP 400 instead of 500.
 */
export class ListingSourceConfigError extends Error {
  readonly code = 'SOURCE_MISCONFIGURED';

  constructor(message: string) {
    super(message);
    this.name = 'ListingSourceConfigError';
  }
}

/**
 * HTML scraping is gated on the user having accepted responsibility for the
 * target site's terms. Distinct from a config error so the UI can offer the
 * acceptance flow rather than sending the user to the config editor.
 */
export class ListingSourceTermsError extends Error {
  readonly code = 'SOURCE_TERMS_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'ListingSourceTermsError';
  }
}

/**
 * Build an actionable configuration error. The old messages named internal
 * config keys only, which told the user nothing about how to fix the feed —
 * this one names the source and the human-readable settings that are missing.
 */
export const configError = (
  adapterLabel: string,
  source: Pick<IListingSource, 'name' | 'slug'>,
  missing: string[]
): ListingSourceConfigError =>
  new ListingSourceConfigError(
    `${adapterLabel} feed "${source.name || source.slug}" is not configured correctly — ` +
      `missing ${missing.join(' and ')}. ` +
      'Open the feed, click Edit and fill in the missing setting, or remove the feed and add it again so it can be re-detected.'
  );

/** Raise a `ListingSourceConfigError` for an endpoint that isn't a fetchable URL. */
export const invalidEndpointError = (
  adapterLabel: string,
  source: Pick<IListingSource, 'name' | 'slug'>,
  endpoint: string
): ListingSourceConfigError =>
  new ListingSourceConfigError(
    `${adapterLabel} feed "${source.name || source.slug}" has an invalid URL (${endpoint}). ` +
      'It must be a full http:// or https:// address.'
  );

/**
 * Common id-shaped keys tried when the configured `idPath` misses. Sources
 * exported with Mongo Extended JSON, partner APIs that use `_id`/`uid`, and
 * ad-hoc samples without any id field all need to land on a stable identifier
 * so upserts stay idempotent across runs.
 */
const ID_FALLBACK_KEYS = [
  'id',
  '_id',
  'uid',
  'uuid',
  'listing_id',
  'property_id',
  'listingId',
  'propertyId',
  'sku',
  'reference',
];

const extractIdFromObject = (item: Record<string, unknown>): string | null => {
  for (const key of ID_FALLBACK_KEYS) {
    const v = item[key];
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    // Mongo extended JSON: { $oid: '...' }
    if (typeof v === 'object' && !Array.isArray(v) && typeof (v as Record<string, unknown>).$oid === 'string') {
      return (v as Record<string, string>).$oid;
    }
  }
  return null;
};

/**
 * Resolve a stable id for an item. Tries the configured JSONPath first, then
 * falls back to common id keys, then to a deterministic hash of the JSON so the
 * same item maps to the same id across runs. The synthetic-index suffix is the
 * last resort.
 *
 * Adapters must not skip items whose `idPath` misses: a detector-guessed
 * `$.id` that doesn't match the real payload would otherwise silently drop
 * every listing and report "0 imported".
 */
export const resolveItemId = (item: unknown, idPath: string | undefined, syntheticIdx: number): string => {
  if (idPath) {
    const raw = JSONPath({ path: idPath, json: item as object, wrap: false }) as unknown;
    if (raw != null) {
      if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
      if (typeof raw === 'object' && typeof (raw as Record<string, unknown>).$oid === 'string') {
        return (raw as Record<string, string>).$oid;
      }
    }
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const fallback = extractIdFromObject(item as Record<string, unknown>);
    if (fallback) return fallback;
  }
  try {
    const json = JSON.stringify(item);
    let h = 0;
    for (let i = 0; i < json.length; i++) h = ((h << 5) - h + json.charCodeAt(i)) | 0;
    return `synthetic-${(h >>> 0).toString(36)}`;
  } catch {
    return `synthetic-${syntheticIdx}`;
  }
};
