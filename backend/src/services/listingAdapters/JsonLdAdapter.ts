import * as cheerio from 'cheerio';
import type { IListingSource } from '../../models/ListingSource';
import { isValidListingItem } from '../listingNormalizerService';
import { looksLikeListingPath } from '../listingDetectorService';
import { httpGet } from './httpClient';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface JsonLdAdapterConfig {
  /** Listing-page URLs to crawl, OR an `indexUrl` + `linkSelector` to discover them. */
  listingUrls?: string[];
  indexUrl?: string;
  /** CSS selector for anchor tags pointing at listing detail pages. */
  linkSelector?: string;
  /** Optional CSS selector for an "next page" anchor on the index. */
  nextPageSelector?: string;
  /** schema.org @types we accept; defaults to RealEstateListing/Residence/Apartment/SingleFamilyResidence/Product. */
  acceptedTypes?: string[];
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  maxPages?: number;
  limit?: number;
}

const DEFAULT_TYPES = new Set([
  'RealEstateListing',
  'Residence',
  'Apartment',
  'House',
  'SingleFamilyResidence',
  'Accommodation',
  'Place',
  'Product',
]);

const flattenJsonLd = (node: unknown, out: Record<string, unknown>[]): void => {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) flattenJsonLd(n, out);
    return;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if ('@graph' in obj && Array.isArray(obj['@graph'])) flattenJsonLd(obj['@graph'], out);
    else out.push(obj);
  }
};

const matchesType = (node: Record<string, unknown>, accepted: Set<string>): boolean => {
  const t = node['@type'];
  if (!t) return false;
  if (typeof t === 'string') return accepted.has(t);
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && accepted.has(x));
  return false;
};

const resolveUrl = (base: string, href: string): string => {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

export class JsonLdAdapter implements SourceAdapter {
  readonly type = 'jsonLd' as const;

  private async parsePage(
    url: string,
    accepted: Set<string>
  ): Promise<{ jsonLd: Record<string, unknown> | null; detailHtml: string } | null> {
    const response = await httpGet<string>(url, { responseType: 'text' });
    const html = String(response.data);
    const $ = cheerio.load(html);
    const candidates: Record<string, unknown>[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const txt = $(el).contents().text();
      if (!txt) return;
      try {
        flattenJsonLd(JSON.parse(txt), candidates);
      } catch {
        // ignore malformed JSON-LD
      }
    });
    const jsonLd = candidates.find((c) => matchesType(c, accepted)) ?? null;
    return { jsonLd, detailHtml: html };
  }

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    const cfg = (source.adapterConfig ?? {}) as unknown as JsonLdAdapterConfig;
    const accepted = new Set(cfg.acceptedTypes ?? Array.from(DEFAULT_TYPES));
    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];

    const requestOpts = {
      userAgent: cfg.userAgent,
      requestDelayMs: cfg.requestDelayMs,
      respectRobotsTxt: cfg.respectRobotsTxt,
    };

    let urls: string[] = [];
    if (cfg.listingUrls?.length) {
      urls = cfg.listingUrls;
    } else if (cfg.indexUrl && cfg.linkSelector) {
      let current: string | undefined = cfg.indexUrl;
      const maxPages = cfg.maxPages ?? 1;
      for (let i = 0; i < maxPages && current; i++) {
        const pageUrl: string = current;
        const response = await httpGet<string>(pageUrl, { ...requestOpts, responseType: 'text' });
        const $ = cheerio.load(String(response.data));
        const linkSel = cfg.linkSelector as string;
        const seen = new Set<string>();
        $(linkSel).each((_, el) => {
          const href = $(el).attr('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
              href.startsWith('mailto:') || href.startsWith('tel:')) return;
          const abs = resolveUrl(pageUrl, href);
          let pathname = '';
          try { pathname = new URL(abs).pathname; } catch { return; }
          // Only keep URLs that look like a listing detail page.
          if (!looksLikeListingPath(pathname)) return;
          if (seen.has(abs)) return;
          seen.add(abs);
          urls.push(abs);
        });
        if (cfg.nextPageSelector) {
          const nextHref = $(cfg.nextPageSelector).attr('href');
          current = nextHref ? resolveUrl(pageUrl, nextHref) : undefined;
        } else {
          current = undefined;
        }
      }
    } else {
      throw new Error(`JsonLdAdapter: provide listingUrls OR (indexUrl + linkSelector) (source ${source.slug})`);
    }

    // Report total URL count before starting individual page fetches so the
    // frontend transitions from "discovering" to "syncing N/total" immediately.
    options.onProgress?.(urls.length, 0);

    let fetched = 0;
    for (const url of urls) {
      try {
        const result = await this.parsePage(url, accepted);
        options.onProgress?.(urls.length, ++fetched);
        if (!result) continue;
        const { jsonLd, detailHtml } = result;

        // Build the raw payload. We always include detailHtml so the normalizer's
        // enricher can extract OpenGraph / microdata / image gallery even when
        // the page has no JSON-LD (or the JSON-LD doesn't pass our type filter).
        const raw: Record<string, unknown> = jsonLd ? { ...jsonLd, detailHtml } : { detailHtml };

        // Skip pages that have neither valid JSON-LD nor enough OpenGraph for us
        // to consider them listings.
        const hasJsonLd = jsonLd && isValidListingItem(jsonLd);
        const ogTitleHit = /<meta[^>]+property=["']og:title["']/i.test(detailHtml);
        const ogPriceHit = /<meta[^>]+property=["'](og:price:amount|product:price:amount)["']/i.test(detailHtml);
        const looksLikeListing = hasJsonLd || (ogTitleHit && (ogPriceHit || /price|cijena|cena|preis/i.test(detailHtml)));
        if (!looksLikeListing) continue;

        const id = String(
          (jsonLd && (jsonLd['@id'] ?? jsonLd['identifier'] ?? jsonLd['sku'])) ?? url
        );
        out.push({ id, url, raw });
        if (limit && out.length >= limit) break;
      } catch {
        // skip failed page; orchestrator records per-listing failures
        options.onProgress?.(urls.length, ++fetched);
      }
    }

    return out;
  }
}
