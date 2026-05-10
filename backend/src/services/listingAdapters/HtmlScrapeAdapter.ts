import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { IListingSource } from '../../models/ListingSource';
import { httpGet } from './httpClient';
import { looksLikeListingPath } from '../listingDetectorService';
import { isValidListingItem } from '../listingNormalizerService';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

const isUsableHref = (href: string): boolean => {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  // Skip empty fragment / pseudo-protocol / non-navigational links.
  if (trimmed.startsWith('#') || trimmed.startsWith('javascript:') ||
      trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return false;
  return true;
};

interface SelectorMap {
  /** CSS selector that matches each listing card on the index page. */
  listingItem: string;
  /** Selector resolving to the listing's canonical detail URL. Use `attr:href` syntax. */
  link: string;
  /** Selector for the source-side id; falls back to detail URL. */
  id?: string;
  title?: string;
  price?: string;
  description?: string;
  city?: string;
  address?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  image?: string;
  images?: string;
  propertyType?: string;
  /** Free-form selectors stored in `raw.extras`. */
  extras?: Record<string, string>;
}

interface HtmlScrapeAdapterConfig {
  indexUrl: string;
  selectors: SelectorMap;
  /** Selector for "next page" anchor; absent ⇒ single-page. */
  nextPageSelector?: string;
  /** Use `?page=N` style pagination as an alternative to nextPageSelector. */
  pageParam?: string;
  pageStart?: number;
  maxPages?: number;
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  limit?: number;
  /** When true, fetch each detail page and include its HTML in `raw.detailHtml` for the normalizer to mine. */
  followDetails?: boolean;
  /** Max concurrent detail-page fetches. Defaults to 4 — set higher for fast/large hosts. */
  detailConcurrency?: number;
  /** Per-host delay specifically for detail fetches. Falls back to requestDelayMs / 300ms. */
  detailRequestDelayMs?: number;
}

const ATTR_PREFIX = 'attr:';

type AnyCheerio = cheerio.Cheerio<AnyNode>;

const resolveSelector = ($el: AnyCheerio, sel: string): string | undefined => {
  if (sel.startsWith(ATTR_PREFIX)) {
    const attr = sel.slice(ATTR_PREFIX.length);
    return ($el.attr(attr) ?? undefined) as string | undefined;
  }
  const text = $el.text().trim();
  return text || undefined;
};

const pick = ($: cheerio.CheerioAPI, root: AnyCheerio, sel?: string): string | undefined => {
  if (!sel) return undefined;
  const [css, accessor] = sel.includes('|') ? sel.split('|').map((s) => s.trim()) : [sel, undefined];
  const $el = root.find(css).first();
  if (!$el.length) return undefined;
  if (accessor) return resolveSelector($el, accessor);
  return $el.text().trim() || undefined;
};

/**
 * Smart extraction with strict context requirements to avoid false positives.
 *
 * Rules:
 * - Require word boundaries so we don't match inside other words
 * - Validate plausible numeric ranges (e.g., 1-20 beds, not 50)
 * - Require currency symbols/units adjacent to numbers
 * - Reject obviously non-listing matches (phone numbers, dates, IDs)
 *
 * Returns `undefined` (not a guess) when there's no high-confidence match.
 */
const smartExtract = (
  text: string | undefined,
  field: 'price' | 'beds' | 'baths' | 'sqft'
): string | undefined => {
  if (!text || text.length < 3) return undefined;
  // Normalise whitespace so multi-line cards behave like single-line text.
  const t = text.replace(/\s+/g, ' ').trim();

  switch (field) {
    case 'price': {
      // Require currency symbol/code adjacent to a number with reasonable magnitude.
      // Reject sub-100 numbers (likely fees, not listing prices) and >100M (typo).
      const patterns = [
        // €1,234,567 / EUR 250.000 / $500K
        /(?:€|EUR|\$|USD|£|GBP|RSD|kn|HRK|BAM|MKD)\s*([\d][\d.,\s]*[\d](?:\s*[KMB])?)(?!\d)/i,
        // 1,234,567 € / 250.000 EUR
        /(?<!\d)([\d][\d.,\s]*[\d](?:\s*[KMB])?)\s*(?:€|EUR|\$|USD|£|GBP|RSD|kn|HRK|BAM|MKD)\b/i,
      ];
      for (const re of patterns) {
        const m = t.match(re);
        if (!m) continue;
        const numStr = m[1].replace(/[^\d.,KMB]/gi, '');
        const num = parseFloat(numStr.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
        if (!Number.isFinite(num) || num < 100 || num > 100_000_000) continue;
        return m[0].trim();
      }
      return undefined;
    }
    case 'beds': {
      // Require word boundary before the number so "12345 sobe" → bedroom
      // matches don't fire on phone numbers / postcodes. Require the unit
      // to be followed by a word boundary too.
      const m = t.match(
        /(?<![.\d])(\d{1,2})\s*(?:bed(?:room)?s?|soba|sobi|sobe|chambre[s]?|habitaci[oó]n(?:es)?|zimmer|schlafzimmer)\b/i
      );
      if (!m) return undefined;
      const n = parseInt(m[1], 10);
      if (n < 1 || n > 15) return undefined;
      return String(n);
    }
    case 'baths': {
      // `wc` removed — too noisy (matches IDs, slugs). Use full words only.
      const m = t.match(
        /(?<![.\d])(\d{1,2})\s*(?:bath(?:room)?s?|kupatil[ao]?|toilets?|salle\s+de\s+bain|badezimmer|ba[nñ]os?)\b/i
      );
      if (!m) return undefined;
      const n = parseInt(m[1], 10);
      if (n < 1 || n > 10) return undefined;
      return String(n);
    }
    case 'sqft': {
      // Strict m² / m2 boundary; reject "M2" engine codes by requiring digits-then-unit
      // and rejecting an immediately-preceding letter.
      const m = t.match(
        /(?<![A-Za-z])(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s*m\.?|square\s*meters?|qm|m\^2|kvadrata?|povr[sš]ina[\s:]*\d+)\b/i
      );
      if (!m) return undefined;
      const n = parseFloat(m[1].replace(',', '.'));
      // Realistic property areas: 10 m² (tiny studio) to 50,000 m² (large estate)
      if (!Number.isFinite(n) || n < 10 || n > 50_000) return undefined;
      return String(n);
    }
  }
  return undefined;
};

const pickAll = ($: cheerio.CheerioAPI, root: AnyCheerio, sel: string): string[] => {
  const out: string[] = [];
  const [css, accessor] = sel.includes('|') ? sel.split('|').map((s) => s.trim()) : [sel, undefined];
  root.find(css).each((_, el) => {
    const v = accessor ? resolveSelector($(el), accessor) : $(el).text().trim();
    if (v) out.push(v);
  });
  return out;
};

const resolveUrl = (base: string, href: string): string => {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

/** Default cap for concurrent detail-page fetches against the same source. */
const DEFAULT_DETAIL_CONCURRENCY = 4;
/** Default delay between sequential per-host requests when followDetails is on. */
const DEFAULT_DETAIL_DELAY_MS = 300;

/**
 * Run `worker` over `items` with at most `concurrency` in flight at once.
 * Maintains input order in the result array. Failures are mapped to `undefined`
 * — the caller decides how to treat them (we don't want one slow detail page
 * to abort the whole adapter run).
 */
const pMap = async <T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<(R | undefined)[]> => {
  const results = new Array<R | undefined>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch {
        results[i] = undefined;
      }
    }
  });
  await Promise.all(runners);
  return results;
};

export class HtmlScrapeAdapter implements SourceAdapter {
  readonly type = 'htmlScrape' as const;

  async fetchListings(source: IListingSource, options: FetchOptions = {}): Promise<RawListing[]> {
    if (!source.acceptedTermsAt) {
      throw new Error(
        `HtmlScrapeAdapter refused to run for source "${source.slug}": acceptedTermsAt is not set. ` +
          `An admin must explicitly accept the source's ToS before HTML scraping is permitted.`
      );
    }

    const cfg = (source.adapterConfig ?? {}) as unknown as HtmlScrapeAdapterConfig;
    if (!cfg.indexUrl || !cfg.selectors?.listingItem || !cfg.selectors?.link) {
      throw new Error(`HtmlScrapeAdapter: indexUrl, selectors.listingItem, selectors.link required (source ${source.slug})`);
    }

    const limit = options.limit ?? cfg.limit;
    const out: RawListing[] = [];
    const maxPages = cfg.maxPages ?? 1;

    const requestOpts = {
      userAgent: cfg.userAgent,
      requestDelayMs: cfg.requestDelayMs,
      respectRobotsTxt: cfg.respectRobotsTxt,
    };
    const detailRequestOpts = {
      ...requestOpts,
      // Detail pages reuse the same host we just fetched — let them go fast.
      requestDelayMs: cfg.detailRequestDelayMs ?? DEFAULT_DETAIL_DELAY_MS,
      responseType: 'text' as const,
    };
    const detailConcurrency = Math.max(1, cfg.detailConcurrency ?? DEFAULT_DETAIL_CONCURRENCY);

    /**
     * Stub the per-listing item without fetching its detail page. We collect
     * stubs synchronously and parallelise the actual detail HTTP calls in a
     * single batch at the end of each page — fixes the worst slowness in the
     * preview/import flow when `followDetails` is on.
     */
    const stubs: RawListing[] = [];

    let pageUrl: string | undefined = cfg.indexUrl;
    let pageNum = cfg.pageStart ?? 1;

    for (let i = 0; i < maxPages && pageUrl; i++) {
      const url: string = cfg.pageParam ? this.withPageParam(cfg.indexUrl, cfg.pageParam, pageNum) : pageUrl;
      const response = await httpGet<string>(url, { ...requestOpts, responseType: 'text' });
      const $ = cheerio.load(String(response.data));
      const items = $(cfg.selectors.listingItem);

      const seenUrls = new Set<string>();
      let producedFromCards = 0;

      for (const el of items.toArray()) {
        const root = $(el);
        const linkVal = pick($, root, cfg.selectors.link);
        if (!linkVal || !isUsableHref(linkVal)) continue;
        const detailUrl = resolveUrl(url, linkVal);

        let pathname = '';
        try { pathname = new URL(detailUrl).pathname; } catch { continue; }
        if (!looksLikeListingPath(pathname)) continue;
        if (seenUrls.has(detailUrl)) continue;
        seenUrls.add(detailUrl);

        const id = pick($, root, cfg.selectors.id) || detailUrl;
        // Extract fields using selectors, then try smart extraction as fallback
        const cardText = root.text();
        const item: Record<string, unknown> = {
          title: pick($, root, cfg.selectors.title),
          price: pick($, root, cfg.selectors.price) || smartExtract(cardText, 'price'),
          description: pick($, root, cfg.selectors.description),
          city: pick($, root, cfg.selectors.city),
          address: pick($, root, cfg.selectors.address),
          beds: pick($, root, cfg.selectors.beds) || smartExtract(cardText, 'beds'),
          baths: pick($, root, cfg.selectors.baths) || smartExtract(cardText, 'baths'),
          sqft: pick($, root, cfg.selectors.sqft) || smartExtract(cardText, 'sqft'),
          image: pick($, root, cfg.selectors.image),
          images: cfg.selectors.images ? pickAll($, root, cfg.selectors.images) : undefined,
          propertyType: pick($, root, cfg.selectors.propertyType),
          url: detailUrl,
        };
        if (cfg.selectors.extras) {
          const extras: Record<string, string | undefined> = {};
          for (const [k, sel] of Object.entries(cfg.selectors.extras)) {
            extras[k] = pick($, root, sel);
          }
          item.extras = extras;
        }

        // Defer the decision to drop items without a detailHtml until after
        // the parallel detail fetch — `followDetails` items are validated post-fetch.
        if (!cfg.followDetails && !isValidListingItem(item)) continue;

        stubs.push({ id: String(id), url: detailUrl, raw: item });
        producedFromCards++;
        if (limit && stubs.length >= limit) break;
      }

      // Fallback: 0 items via selectors → mine every anchor on the page.
      if (producedFromCards === 0 && (!limit || stubs.length < limit)) {
        for (const a of $('a[href]').toArray()) {
          const href = $(a).attr('href');
          if (!href || !isUsableHref(href)) continue;
          const detailUrl = resolveUrl(url, href);
          let pathname = '';
          try { pathname = new URL(detailUrl).pathname; } catch { continue; }
          if (!looksLikeListingPath(pathname)) continue;

          const pathParts = pathname.split('/').filter(Boolean);
          if (pathParts.length < 2 && !/\d{3,}/.test(pathname)) continue;
          if (seenUrls.has(detailUrl)) continue;
          seenUrls.add(detailUrl);

          const item: Record<string, unknown> = {
            title: $(a).attr('title') || $(a).text().trim() || undefined,
            url: detailUrl,
          };
          if (!cfg.followDetails && !isValidListingItem(item)) continue;

          stubs.push({ id: detailUrl, url: detailUrl, raw: item });
          if (limit && stubs.length >= limit) break;
        }
      }

      if (limit && stubs.length >= limit) break;
      if (cfg.nextPageSelector) {
        const next = $(cfg.nextPageSelector).attr('href');
        pageUrl = next ? resolveUrl(url, next) : undefined;
      } else if (cfg.pageParam) {
        pageNum++;
      } else {
        pageUrl = undefined;
      }
    }

    const capped = limit ? stubs.slice(0, limit) : stubs;
    // Report how many listing URLs we found before starting detail fetches.
    options.onProgress?.(capped.length, 0);

    if (!cfg.followDetails) return capped;

    // Parallel detail-page fetches — the big perf win. The httpClient queues
    // per-host so we still respect the polite delay, just in a tight loop
    // rather than one-at-a-time across the whole page.
    let detailsCompleted = 0;
    const detailHtmls = await pMap(
      capped,
      async (stub) => {
        const detail = await httpGet<string>(stub.url ?? '', detailRequestOpts);
        options.onProgress?.(capped.length, ++detailsCompleted);
        return String(detail.data);
      },
      detailConcurrency
    );

    for (let i = 0; i < capped.length; i++) {
      const stub = capped[i];
      const html = detailHtmls[i];
      const raw = stub.raw as Record<string, unknown>;
      if (typeof html === 'string' && html.length > 0) {
        raw.detailHtml = html;
      }
      // Skip the item only if neither the index card nor the detail page
      // produced any listing-shaped signals.
      const sanity: Record<string, unknown> = { ...raw };
      delete sanity.detailHtml;
      if (!raw.detailHtml && !isValidListingItem(sanity)) continue;
      out.push(stub);
    }

    return out;
  }

  private withPageParam(baseUrl: string, param: string, page: number): string {
    const u = new URL(baseUrl);
    u.searchParams.set(param, String(page));
    return u.toString();
  }
}
