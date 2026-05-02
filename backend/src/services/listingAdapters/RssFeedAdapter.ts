import Parser from 'rss-parser';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { httpGet } from './httpClient';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface RssAdapterConfig {
  feedUrl?: string;
  feedUrls?: string[];
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  limit?: number;
}

const parser = new Parser({
  // Cast through unknown — rss-parser's types don't include the runtime customFields key allowlist.
  customFields: { item: ['enclosure', 'media:content', 'media:thumbnail', 'georss:point'] },
} as unknown as Parser.ParserOptions<unknown, unknown>);

export class RssFeedAdapter implements SourceAdapter {
  readonly type = 'rss' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const cfg = (source.adapterConfig ?? {}) as RssAdapterConfig;
    const urls = cfg.feedUrls ?? (cfg.feedUrl ? [cfg.feedUrl] : []);
    if (!urls.length) throw new Error(`RssFeedAdapter: missing feedUrl/feedUrls for ${source.slug}`);

    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];

    for (const url of urls) {
      const response = await httpGet<string>(url, {
        userAgent: cfg.userAgent,
        requestDelayMs: cfg.requestDelayMs,
        respectRobotsTxt: cfg.respectRobotsTxt,
        responseType: 'text',
      });

      const xml = typeof response.data === 'string' ? response.data : String(response.data);
      const feed = await parser.parseString(xml);
      for (const item of feed.items ?? []) {
        const id = item.guid || item.link || (item as unknown as { id?: string }).id;
        if (!id) continue;
        // Validate that this item looks like a real listing (not news or other content)
        if (!isValidListingItem(item as unknown as Record<string, unknown>)) continue;
        const pub = item.isoDate || item.pubDate;
        if (options.since && pub) {
          const ts = new Date(pub).getTime();
          if (Number.isFinite(ts) && ts < options.since.getTime()) continue;
        }
        out.push({
          id: String(id),
          url: item.link,
          raw: item as unknown as Record<string, unknown>,
        });
        if (limit && out.length >= limit) return out;
      }
    }

    return out;
  }
}
