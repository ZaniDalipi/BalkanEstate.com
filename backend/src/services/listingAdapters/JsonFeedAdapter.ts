import { JSONPath } from 'jsonpath-plus';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { httpGet } from './httpClient';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface JsonFeedAdapterConfig {
  /** Remote endpoint to fetch. Required unless `inlineJson` is provided. */
  endpoint?: string;
  /** Inline JSON payload (string). Used when the user pasted a JSON sample
   *  without an API URL — the import re-uses the pasted data once. */
  inlineJson?: string;
  /** JSONPath to the array of items inside the response payload, e.g. "$.results" or "$.data.listings". */
  itemsPath: string;
  /** JSONPath (relative to each item) yielding the source listing id, e.g. "$.id". */
  idPath: string;
  /** Optional JSONPath (relative to each item) yielding the canonical URL, e.g. "$.url". */
  urlPath?: string;
  /** Optional JSONPath yielding ISO timestamp for since-filtering. */
  publishedAtPath?: string;
  pagination?: {
    type: 'page' | 'offset' | 'cursor';
    pageParam?: string;
    sizeParam?: string;
    pageSize?: number;
    maxPages?: number;
    cursorPath?: string;
    cursorParam?: string;
  };
  headers?: Record<string, string>;
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  limit?: number;
}

const queryFirst = (data: unknown, path: string): unknown => {
  const result = JSONPath({ path, json: data as object, wrap: false }) as unknown;
  return result;
};

/**
 * Common id-shaped keys we try when the configured idPath misses. Sources
 * exported with Mongo Extended JSON, partner APIs that use `_id`/`uid`,
 * and ad-hoc samples without any id field all need to land on a stable
 * identifier so upserts stay idempotent across runs.
 */
const ID_FALLBACK_KEYS = ['id', '_id', 'uid', 'uuid', 'listing_id', 'property_id', 'listingId', 'propertyId', 'sku', 'reference'];

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
 * Resolve a stable id for an item. Tries the configured JSONPath first,
 * then falls back to common id keys, then to a hash of the JSON. The
 * synthetic-index suffix is used only as a last resort so the same item
 * gets the same id across runs whenever possible (idempotent upsert).
 */
const resolveItemId = (item: unknown, idPath: string, syntheticIdx: number): string => {
  const raw = queryFirst(item, idPath);
  if (raw != null) {
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    if (typeof raw === 'object' && typeof (raw as Record<string, unknown>).$oid === 'string') {
      return (raw as Record<string, string>).$oid;
    }
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const fallback = extractIdFromObject(item as Record<string, unknown>);
    if (fallback) return fallback;
  }
  // Last resort: deterministic hash of the JSON so the same item maps to
  // the same id across runs even when no id field exists.
  try {
    const json = JSON.stringify(item);
    let h = 0;
    for (let i = 0; i < json.length; i++) h = ((h << 5) - h + json.charCodeAt(i)) | 0;
    return `synthetic-${(h >>> 0).toString(36)}`;
  } catch {
    return `synthetic-${syntheticIdx}`;
  }
};

const queryArray = (data: unknown, path: string): unknown[] => {
  const result = JSONPath({ path, json: data as object }) as unknown[];
  if (Array.isArray(result) && result.length === 1 && Array.isArray(result[0])) return result[0] as unknown[];
  return Array.isArray(result) ? result : [];
};

const buildUrl = (endpoint: string, params: Record<string, string | number>): string => {
  const u = new URL(endpoint);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
};

export class JsonFeedAdapter implements SourceAdapter {
  readonly type = 'jsonFeed' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const cfg = (source.adapterConfig ?? {}) as unknown as JsonFeedAdapterConfig;
    if (!cfg.itemsPath || !cfg.idPath) {
      throw new Error(`JsonFeedAdapter: itemsPath and idPath are required (source ${source.slug})`);
    }
    if (!cfg.endpoint && !cfg.inlineJson) {
      throw new Error(`JsonFeedAdapter: either endpoint or inlineJson must be provided (source ${source.slug})`);
    }

    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];
    const since = options.since?.getTime();

    // Inline JSON path: parse once, no HTTP, no pagination.
    if (cfg.inlineJson && !cfg.endpoint) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(cfg.inlineJson);
      } catch (firstErr) {
        // One-time recovery for sources saved before curly “smart quotes” (typically
        // introduced by macOS/Safari autocorrect when someone hand-edited the raw
        // config in the "Edit feed" form) were stripped out of inlineJson before
        // storage. Only swaps quote *characters* — never restructures the JSON —
        // so it can't mask a genuinely different problem; if this also fails we
        // throw the original error.
        try {
          const recovered = cfg.inlineJson.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
          parsed = JSON.parse(recovered);
        } catch {
          throw new Error(`JsonFeedAdapter: inlineJson is not valid JSON (source ${source.slug}): ${(firstErr as Error).message}`);
        }
      }
      const items = queryArray(parsed, cfg.itemsPath);
      let syntheticIdx = 0;
      for (const item of items) {
        if (!isValidListingItem(item as Record<string, unknown>)) continue;
        const id = resolveItemId(item, cfg.idPath, syntheticIdx++);
        const url = cfg.urlPath ? (queryFirst(item, cfg.urlPath) as string | undefined) : undefined;
        out.push({ id, url, raw: item as Record<string, unknown> });
        if (limit && out.length >= limit) break;
      }
      return out;
    }

    // Below this point we require `cfg.endpoint` (the inlineJson branch above
    // returned early). Narrow it for the type checker.
    const endpoint = cfg.endpoint as string;

    const pagination = cfg.pagination;
    const maxPages = pagination?.maxPages ?? 1;
    let page = 1;
    let cursor: string | undefined;

    for (let i = 0; i < maxPages; i++) {
      let url = endpoint;
      if (pagination?.type === 'page' && pagination.pageParam) {
        const params: Record<string, string | number> = { [pagination.pageParam]: page };
        if (pagination.sizeParam && pagination.pageSize) params[pagination.sizeParam] = pagination.pageSize;
        url = buildUrl(endpoint, params);
      } else if (pagination?.type === 'offset' && pagination.pageParam && pagination.pageSize) {
        url = buildUrl(endpoint, { [pagination.pageParam]: (page - 1) * pagination.pageSize });
      } else if (pagination?.type === 'cursor' && pagination.cursorParam && cursor) {
        url = buildUrl(endpoint, { [pagination.cursorParam]: cursor });
      }

      const response = await httpGet<unknown>(url, {
        userAgent: cfg.userAgent,
        requestDelayMs: cfg.requestDelayMs,
        respectRobotsTxt: cfg.respectRobotsTxt,
        headers: cfg.headers,
      });

      const items = queryArray(response.data, cfg.itemsPath);
      if (!items.length) break;

      let syntheticIdx = (page - 1) * (pagination?.pageSize ?? 100);
      for (const item of items) {
        // Validate that this item looks like a real listing (not page metadata or other content)
        if (!isValidListingItem(item as Record<string, unknown>)) continue;
        if (since && cfg.publishedAtPath) {
          const ts = queryFirst(item, cfg.publishedAtPath);
          const t = ts ? new Date(String(ts)).getTime() : NaN;
          if (Number.isFinite(t) && t < since) continue;
        }
        const id = resolveItemId(item, cfg.idPath, syntheticIdx++);
        const url = cfg.urlPath ? (queryFirst(item, cfg.urlPath) as string | undefined) : undefined;
        out.push({ id, url, raw: item as Record<string, unknown> });
        if (limit && out.length >= limit) return out;
      }

      if (pagination?.type === 'cursor') {
        const next = pagination.cursorPath ? (queryFirst(response.data, pagination.cursorPath) as string | undefined) : undefined;
        if (!next || next === cursor) break;
        cursor = next;
      } else {
        page++;
      }
    }

    return out;
  }
}
