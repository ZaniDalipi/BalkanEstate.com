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
  resolveQueryParams,
} from './configUtils';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface CustomApiAdapterConfig {
  /** Canonical key. Legacy configs may carry `url`/`apiUrl` instead — see resolveEndpoint. */
  endpoint?: string;
  itemsPath: string;
  /** Optional: falls back to common id keys, then a content hash. */
  idPath?: string;
  urlPath?: string;
  publishedAtPath?: string;
  /** Authentication injected as a request header. */
  auth?:
    | { type: 'bearer'; token: string }
    | { type: 'apiKey'; headerName: string; key: string }
    | { type: 'basic'; username: string; password: string };
  headers?: Record<string, string>;
  /** Canonical key. Legacy configs may carry `params` instead — see resolveQueryParams. */
  query?: Record<string, string>;
  pagination?: {
    type: 'page' | 'offset';
    pageParam: string;
    sizeParam?: string;
    pageSize?: number;
    maxPages?: number;
  };
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  limit?: number;
}

const queryFirst = (data: unknown, path: string): unknown =>
  JSONPath({ path, json: data as object, wrap: false }) as unknown;

const queryArray = (data: unknown, path: string): unknown[] => {
  const result = JSONPath({ path, json: data as object }) as unknown[];
  if (Array.isArray(result) && result.length === 1 && Array.isArray(result[0])) return result[0] as unknown[];
  return Array.isArray(result) ? result : [];
};

const buildAuthHeaders = (cfg: CustomApiAdapterConfig): Record<string, string> => {
  const auth = cfg.auth;
  if (!auth) return {};
  if (auth.type === 'bearer') return { Authorization: `Bearer ${auth.token}` };
  if (auth.type === 'apiKey') return { [auth.headerName]: auth.key };
  if (auth.type === 'basic') {
    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }
  return {};
};

const withQuery = (endpoint: string, params: Record<string, string | number>): string => {
  const u = new URL(endpoint);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
};

export class CustomApiAdapter implements SourceAdapter {
  readonly type = 'customApi' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const rawCfg = (source.adapterConfig ?? {}) as Record<string, unknown>;
    const cfg = rawCfg as unknown as CustomApiAdapterConfig;

    const endpoint = resolveEndpoint(rawCfg);
    const missing: string[] = [];
    if (!endpoint) missing.push('the API endpoint URL');
    if (!cfg.itemsPath) missing.push('the path to the listings array (itemsPath)');
    if (missing.length) throw configError('Custom API', source, missing);
    if (!isFetchableUrl(endpoint as string)) {
      throw invalidEndpointError('Custom API', source, endpoint as string);
    }
    const baseEndpoint = endpoint as string;
    const staticQuery = resolveQueryParams(rawCfg) ?? {};

    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];
    const since = options.since?.getTime();
    const headers = { ...buildAuthHeaders(cfg), ...(cfg.headers ?? {}) };
    const maxPages = cfg.pagination?.maxPages ?? 1;
    let syntheticIdx = 0;

    for (let page = 1; page <= maxPages; page++) {
      const params: Record<string, string | number> = { ...staticQuery };
      if (cfg.pagination?.type === 'page') {
        params[cfg.pagination.pageParam] = page;
        if (cfg.pagination.sizeParam && cfg.pagination.pageSize) params[cfg.pagination.sizeParam] = cfg.pagination.pageSize;
      } else if (cfg.pagination?.type === 'offset' && cfg.pagination.pageSize) {
        params[cfg.pagination.pageParam] = (page - 1) * cfg.pagination.pageSize;
      }
      const url = Object.keys(params).length ? withQuery(baseEndpoint, params) : baseEndpoint;

      const response = await httpGet<unknown>(url, {
        userAgent: cfg.userAgent,
        requestDelayMs: cfg.requestDelayMs,
        respectRobotsTxt: cfg.respectRobotsTxt,
        headers,
      });

      const items = queryArray(response.data, cfg.itemsPath);
      if (!items.length) break;

      for (const item of items) {
        // Validate that this item looks like a real listing (not page metadata or other content)
        if (!isValidListingItem(item as Record<string, unknown>)) continue;
        if (since && cfg.publishedAtPath) {
          const ts = queryFirst(item, cfg.publishedAtPath);
          const t = ts ? new Date(String(ts)).getTime() : NaN;
          if (Number.isFinite(t) && t < since) continue;
        }
        // Never drop an item just because the configured idPath missed — the
        // detector guesses "$.id" and many APIs key their items differently.
        const id = resolveItemId(item, cfg.idPath, syntheticIdx++);
        const url = cfg.urlPath ? (queryFirst(item, cfg.urlPath) as string | undefined) : undefined;
        out.push({ id, url, raw: item as Record<string, unknown> });
        if (limit && out.length >= limit) return out;
      }
    }

    return out;
  }
}
