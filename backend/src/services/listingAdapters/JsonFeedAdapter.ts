import { JSONPath } from 'jsonpath-plus';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { httpGet } from './httpClient';
import {
  configError,
  invalidEndpointError,
  isFetchableUrl,
  resolveEndpoint,
  resolveItemId,
} from './configUtils';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface JsonFeedAdapterConfig {
  /**
   * Remote endpoint to fetch. Required unless `inlineJson` is provided.
   * Legacy configs may carry `url` instead — see resolveEndpoint.
   */
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
    const rawCfg = (source.adapterConfig ?? {}) as Record<string, unknown>;
    const cfg = rawCfg as unknown as JsonFeedAdapterConfig;
    const resolvedEndpoint = resolveEndpoint(rawCfg);

    if (!cfg.itemsPath) {
      throw configError('JSON feed', source, ['the path to the listings array (itemsPath)']);
    }
    if (!resolvedEndpoint && !cfg.inlineJson) {
      throw configError('JSON feed', source, ['the feed URL']);
    }

    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];
    const since = options.since?.getTime();

    // Inline JSON path: parse once, no HTTP, no pagination.
    if (cfg.inlineJson && !resolvedEndpoint) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(cfg.inlineJson);
      } catch (err) {
        throw new Error(`JsonFeedAdapter: inlineJson is not valid JSON (source ${source.slug}): ${(err as Error).message}`);
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

    // Below this point we require an endpoint (the inlineJson branch above
    // returned early). Narrow it for the type checker.
    const endpoint = resolvedEndpoint as string;
    if (!isFetchableUrl(endpoint)) {
      throw invalidEndpointError('JSON', source, endpoint);
    }

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
