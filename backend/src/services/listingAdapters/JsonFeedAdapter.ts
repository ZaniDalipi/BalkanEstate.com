import * as cheerio from 'cheerio';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { fetchWithBrowser } from './browserClient';
import { extractEmbeddedSpaListings } from './embeddedState';
import { httpGet } from './httpClient';
import { queryArray, queryFirst, resolveItemId } from './jsonFeed/items';
import { nextLinkInPayload } from './jsonFeed/nextLinkInPayload';
import { findNextPageUrl } from './pagination/nextPageLink';
import { walkPages, type LoadedPage } from './pagination/walkPages';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface JsonFeedAdapterConfig {
  /** Remote endpoint to fetch. Required unless `inlineJson` is provided. */
  endpoint?: string;
  /** Older detector configs saved the endpoint under `url`. */
  url?: string;
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
  /**
   * The endpoint is a web page whose listings live in its embedded JS state
   * (Next.js __NEXT_DATA__, Nuxt, __INITIAL_STATE__). Set by the detector.
   */
  embeddedState?: boolean;
  /** Render embedded-state pages in a headless browser. */
  usePlaywright?: boolean;
  /** Explicit paging. Without it, the response's next link is followed, or the page URL pattern guessed. */
  pagination?: {
    type: 'page' | 'offset' | 'cursor';
    pageParam?: string;
    sizeParam?: string;
    pageSize?: number;
    maxPages?: number;
    cursorPath?: string;
    cursorParam?: string;
  };
  maxPages?: number;
  headers?: Record<string, string>;
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  limit?: number;
}

const DEFAULT_MAX_PAGES = 200;

const withParams = (endpoint: string, params: Record<string, string | number>): string => {
  const u = new URL(endpoint);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
};

export class JsonFeedAdapter implements SourceAdapter {
  readonly type = 'jsonFeed' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const cfg = (source.adapterConfig ?? {}) as unknown as JsonFeedAdapterConfig;
    const endpoint = cfg.endpoint ?? cfg.url;
    if (!cfg.itemsPath || !cfg.idPath) {
      throw new Error(`JsonFeedAdapter: itemsPath and idPath are required (source ${source.slug})`);
    }
    if (!endpoint && !cfg.inlineJson) {
      throw new Error(`JsonFeedAdapter: either endpoint or inlineJson must be provided (source ${source.slug})`);
    }
    const limit = options.limit ?? cfg.limit;
    const since = options.since?.getTime();

    const toListings = (items: unknown[], idOffset: number): RawListing[] => {
      const out: RawListing[] = [];
      items.forEach((item, i) => {
        if (!item || typeof item !== 'object' || !isValidListingItem(item as Record<string, unknown>)) return;
        if (since && cfg.publishedAtPath) {
          const ts = queryFirst(item, cfg.publishedAtPath);
          const t = ts ? new Date(String(ts)).getTime() : NaN;
          if (Number.isFinite(t) && t < since) return;
        }
        const id = resolveItemId(item, cfg.idPath, idOffset + i);
        const url = cfg.urlPath ? (queryFirst(item, cfg.urlPath) as string | undefined) : undefined;
        out.push({ id, url: typeof url === 'string' ? url : undefined, raw: item as Record<string, unknown> });
      });
      return out;
    };

    // Inline JSON: parse once, no HTTP, no pagination.
    if (cfg.inlineJson && !endpoint) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(cfg.inlineJson);
      } catch (err) {
        throw new Error(`JsonFeedAdapter: inlineJson is not valid JSON (source ${source.slug}): ${(err as Error).message}`);
      }
      const out = toListings(queryArray(parsed, cfg.itemsPath), 0);
      return limit ? out.slice(0, limit) : out;
    }

    const base = endpoint as string;
    if (cfg.pagination?.type === 'cursor') return this.fetchByCursor(base, cfg, toListings, limit);

    const pagination = cfg.pagination;
    const pattern = pagination?.pageParam && (pagination.type === 'page' || (pagination.type === 'offset' && pagination.pageSize))
      ? pagination.type === 'page'
        ? { kind: 'query' as const, param: pagination.pageParam, base: 1 as const }
        : { kind: 'offset' as const, param: pagination.pageParam, perPage: pagination.pageSize as number }
      : undefined;
    const firstUrl = pagination?.type === 'page' && pagination.sizeParam && pagination.pageSize
      ? withParams(base, { [pagination.sizeParam]: pagination.pageSize })
      : base;

    let loaded = 0;
    return walkPages<RawListing>({
      firstUrl,
      pattern,
      maxPages: pagination?.maxPages ?? cfg.maxPages ?? DEFAULT_MAX_PAGES,
      limit,
      keyOf: (l) => l.id,
      onPage: (n) => options.onProgress?.(n, n),
      load: async (url, pageNo): Promise<LoadedPage<RawListing>> => {
        const page = cfg.embeddedState ? await this.loadEmbeddedPage(url, pageNo, cfg) : await this.loadJsonPage(url, cfg);
        const items = toListings(page.items, loaded);
        loaded += page.items.length;
        return { items, nextUrl: page.nextUrl };
      },
    });
  }

  private requestOpts(cfg: JsonFeedAdapterConfig) {
    return { userAgent: cfg.userAgent, requestDelayMs: cfg.requestDelayMs, respectRobotsTxt: cfg.respectRobotsTxt, headers: cfg.headers };
  }

  private async loadJsonPage(url: string, cfg: JsonFeedAdapterConfig): Promise<{ items: unknown[]; nextUrl?: string }> {
    const response = await httpGet<unknown>(url, this.requestOpts(cfg));
    // Older configs point a JSON source at a web page with embedded state.
    if (typeof response.data === 'string' && /<html|<script/i.test(response.data)) {
      return { items: extractEmbeddedSpaListings(response.data)?.items ?? [] };
    }
    return { items: queryArray(response.data, cfg.itemsPath), nextUrl: nextLinkInPayload(response.data, url) };
  }

  /** Listings from a web page's embedded JS state (re-located on every page, so the path can't drift). */
  private async loadEmbeddedPage(url: string, pageNo: number, cfg: JsonFeedAdapterConfig): Promise<{ items: unknown[]; nextUrl?: string }> {
    const html = cfg.usePlaywright
      ? (await fetchWithBrowser(url, { waitUntil: 'networkidle', settleMs: 800 })).html
      : String((await httpGet<string>(url, { ...this.requestOpts(cfg), responseType: 'text' })).data);
    return { items: extractEmbeddedSpaListings(html)?.items ?? [], nextUrl: findNextPageUrl(cheerio.load(html), url, pageNo) };
  }

  private async fetchByCursor(
    endpoint: string,
    cfg: JsonFeedAdapterConfig,
    toListings: (items: unknown[], idOffset: number) => RawListing[],
    limit?: number
  ): Promise<RawListing[]> {
    const p = cfg.pagination;
    const out: RawListing[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < (p?.maxPages ?? DEFAULT_MAX_PAGES); i++) {
      const url = cursor && p?.cursorParam ? withParams(endpoint, { [p.cursorParam]: cursor }) : endpoint;
      const response = await httpGet<unknown>(url, this.requestOpts(cfg));
      const items = queryArray(response.data, cfg.itemsPath);
      if (!items.length) break;
      out.push(...toListings(items, out.length));
      if (limit && out.length >= limit) return out.slice(0, limit);
      const next = p?.cursorPath ? (queryFirst(response.data, p.cursorPath) as string | undefined) : undefined;
      if (!next || next === cursor) break;
      cursor = next;
    }
    return out;
  }
}
