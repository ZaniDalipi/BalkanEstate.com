import { parseStringPromise } from 'xml2js';
import { JSONPath } from 'jsonpath-plus';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { httpGet } from './httpClient';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface XmlFeedAdapterConfig {
  endpoint: string;
  /** JSONPath into the parsed XML object yielding the array of items. */
  itemsPath: string;
  idPath: string;
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
    const cfg = (source.adapterConfig ?? {}) as unknown as XmlFeedAdapterConfig;
    if (!cfg.endpoint || !cfg.itemsPath || !cfg.idPath) {
      throw new Error(`XmlFeedAdapter: endpoint, itemsPath and idPath required (source ${source.slug})`);
    }

    const response = await httpGet<string>(cfg.endpoint, {
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
      if (limit && out.length >= limit) break;
    }

    return out;
  }
}
