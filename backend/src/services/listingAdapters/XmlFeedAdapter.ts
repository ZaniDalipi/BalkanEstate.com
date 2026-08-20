import { parseStringPromise } from 'xml2js';
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

interface XmlFeedAdapterConfig {
  /** Canonical key. Legacy configs may carry `url`/`feedUrl` instead — see resolveEndpoint. */
  endpoint?: string;
  /** JSONPath into the parsed XML object yielding the array of items. */
  itemsPath: string;
  /** Optional: falls back to common id keys, then a content hash. */
  idPath?: string;
  urlPath?: string;
  publishedAtPath?: string;
  /** xml2js options, typically `{ explicitArray: false, mergeAttrs: true }`. */
  parserOptions?: Record<string, unknown>;
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

export class XmlFeedAdapter implements SourceAdapter {
  readonly type = 'xmlFeed' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const rawCfg = (source.adapterConfig ?? {}) as Record<string, unknown>;
    const cfg = rawCfg as unknown as XmlFeedAdapterConfig;

    const endpoint = resolveEndpoint(rawCfg);
    const missing: string[] = [];
    if (!endpoint) missing.push('the feed URL');
    if (!cfg.itemsPath) missing.push('the path to the listings array (itemsPath)');
    if (missing.length) throw configError('XML feed', source, missing);
    if (!isFetchableUrl(endpoint as string)) {
      throw invalidEndpointError('XML', source, endpoint as string);
    }

    const response = await httpGet<string>(endpoint as string, {
      userAgent: cfg.userAgent,
      requestDelayMs: cfg.requestDelayMs,
      respectRobotsTxt: cfg.respectRobotsTxt,
      responseType: 'text',
    });

    const parsed = await parseStringPromise(String(response.data), {
      explicitArray: false,
      mergeAttrs: true,
      ...(cfg.parserOptions ?? {}),
    });

    const items = queryArray(parsed, cfg.itemsPath);
    const out: RawListing[] = [];
    const since = options.since?.getTime();
    const limit = options.limit ?? cfg.limit;

    let syntheticIdx = 0;

    for (const item of items) {
      // Validate that this item looks like a real listing (not page metadata or other content)
      if (!isValidListingItem(item as Record<string, unknown>)) continue;
      if (since && cfg.publishedAtPath) {
        const ts = queryFirst(item, cfg.publishedAtPath);
        const t = ts ? new Date(String(ts)).getTime() : NaN;
        if (Number.isFinite(t) && t < since) continue;
      }
      // Never drop an item just because the configured idPath missed.
      const id = resolveItemId(item, cfg.idPath, syntheticIdx++);
      const url = cfg.urlPath ? (queryFirst(item, cfg.urlPath) as string | undefined) : undefined;
      out.push({ id, url, raw: item as Record<string, unknown> });
      if (limit && out.length >= limit) break;
    }

    return out;
  }
}
