import { parseStringPromise } from 'xml2js';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { httpGet } from './httpClient';
import { queryArray, queryFirst, resolveItemId } from './jsonFeed/items';
import { XML_PARSER_OPTIONS, detectXmlFeed } from './xmlFeed/detectXmlFeed';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface XmlFeedAdapterConfig {
  endpoint?: string;
  /** Alias of `endpoint` used by some saved configs. */
  url?: string;
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

/**
 * Reads an XML listings export (one request, every listing in the file).
 * Each element's attributes are mapped later, attribute by attribute, by the
 * normalizer.
 */
export class XmlFeedAdapter implements SourceAdapter {
  readonly type = 'xmlFeed' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const cfg = (source.adapterConfig ?? {}) as unknown as XmlFeedAdapterConfig;
    const endpoint = cfg.endpoint ?? cfg.url;
    if (!endpoint || !cfg.itemsPath || !cfg.idPath) {
      throw new Error(`XmlFeedAdapter: endpoint, itemsPath and idPath required (source ${source.slug})`);
    }

    const response = await httpGet<string>(endpoint, {
      userAgent: cfg.userAgent,
      requestDelayMs: cfg.requestDelayMs,
      respectRobotsTxt: cfg.respectRobotsTxt,
      responseType: 'text',
    });
    const body = String(response.data);
    const parsed = await parseStringPromise(body, { ...XML_PARSER_OPTIONS, ...(cfg.parserOptions ?? {}) });

    let items = queryArray(parsed, cfg.itemsPath);
    if (items.length === 0) {
      // The feed's structure changed since it was set up — locate the listings again.
      const redetected = await detectXmlFeed(body);
      if (redetected?.kind === 'listings') items = queryArray(parsed, redetected.itemsPath);
    }

    const out: RawListing[] = [];
    const since = options.since?.getTime();
    const limit = options.limit ?? cfg.limit;
    items.forEach((item, i) => {
      if (limit && out.length >= limit) return;
      if (!item || typeof item !== 'object' || !isValidListingItem(item as Record<string, unknown>)) return;
      if (since && cfg.publishedAtPath) {
        const ts = queryFirst(item, cfg.publishedAtPath);
        const t = ts ? new Date(String(ts)).getTime() : NaN;
        if (Number.isFinite(t) && t < since) return;
      }
      const url = cfg.urlPath ? queryFirst(item, cfg.urlPath) : undefined;
      out.push({
        id: resolveItemId(item, cfg.idPath, i),
        url: typeof url === 'string' ? url : undefined,
        raw: item as Record<string, unknown>,
      });
    });
    options.onProgress?.(out.length, out.length);
    return out;
  }
}
