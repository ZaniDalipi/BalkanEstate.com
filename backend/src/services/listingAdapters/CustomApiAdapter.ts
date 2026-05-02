import { JSONPath } from 'jsonpath-plus';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { httpGet } from './httpClient';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface CustomApiAdapterConfig {
  endpoint: string;
  itemsPath: string;
  idPath: string;
  urlPath?: string;
  publishedAtPath?: string;
  /** Authentication injected as a request header. */
  auth?:
    | { type: 'bearer'; token: string }
    | { type: 'apiKey'; headerName: string; key: string }
    | { type: 'basic'; username: string; password: string };
  headers?: Record<string, string>;
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
    const cfg = (source.adapterConfig ?? {}) as unknown as CustomApiAdapterConfig;
    if (!cfg.endpoint || !cfg.itemsPath || !cfg.idPath) {
      throw new Error(`CustomApiAdapter: endpoint, itemsPath and idPath required (source ${source.slug})`);
    }

    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];
    const since = options.since?.getTime();
    const headers = { ...buildAuthHeaders(cfg), ...(cfg.headers ?? {}) };
    const maxPages = cfg.pagination?.maxPages ?? 1;

    for (let page = 1; page <= maxPages; page++) {
      const params: Record<string, string | number> = { ...(cfg.query ?? {}) };
      if (cfg.pagination?.type === 'page') {
        params[cfg.pagination.pageParam] = page;
        if (cfg.pagination.sizeParam && cfg.pagination.pageSize) params[cfg.pagination.sizeParam] = cfg.pagination.pageSize;
      } else if (cfg.pagination?.type === 'offset' && cfg.pagination.pageSize) {
        params[cfg.pagination.pageParam] = (page - 1) * cfg.pagination.pageSize;
      }
      const url = Object.keys(params).length ? withQuery(cfg.endpoint, params) : cfg.endpoint;

      const response = await httpGet<unknown>(url, {
        userAgent: cfg.userAgent,
        requestDelayMs: cfg.requestDelayMs,
        respectRobotsTxt: cfg.respectRobotsTxt,
        headers,
      });

      const items = queryArray(response.data, cfg.itemsPath);
      if (!items.length) break;

      for (const item of items) {
        const id = queryFirst(item, cfg.idPath);
        if (id == null) continue;
        // Validate that this item looks like a real listing (not page metadata or other content)
        if (!isValidListingItem(item as Record<string, unknown>)) continue;
        if (since && cfg.publishedAtPath) {
          const ts = queryFirst(item, cfg.publishedAtPath);
          const t = ts ? new Date(String(ts)).getTime() : NaN;
          if (Number.isFinite(t) && t < since) continue;
        }
        const url = cfg.urlPath ? (queryFirst(item, cfg.urlPath) as string | undefined) : undefined;
        out.push({ id: String(id), url, raw: item as Record<string, unknown> });
        if (limit && out.length >= limit) return out;
      }
    }

    return out;
  }
}
