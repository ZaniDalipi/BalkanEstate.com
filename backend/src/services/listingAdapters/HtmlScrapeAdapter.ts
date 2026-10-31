import type { IListingSource } from '../../models/ListingSource';
import { httpGet } from './httpClient';
import { fetchWithBrowser } from './browserClient';
import { isValidListingItem } from '../listingNormalizerService';
import { crawlIndexPages } from './htmlScrape/crawlIndexPages';
import type { SelectorMap } from './htmlScrape/selectors';
import { pMap } from './pMap';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface HtmlScrapeAdapterConfig {
  indexUrl: string;
  selectors: SelectorMap;
  /** Selector for "next page" anchor; absent ⇒ detected from each page, or guessed. */
  nextPageSelector?: string;
  /** Use `?page=N` style pagination as an alternative to nextPageSelector. */
  pageParam?: string;
  pageStart?: number;
  maxPages?: number;
  /** Hard cap on total wall-clock time for walking the index pages (ms). Default: 15 min. */
  maxDurationMs?: number;
  userAgent?: string;
  requestDelayMs?: number;
  respectRobotsTxt?: boolean;
  limit?: number;
  /** When true, fetch each detail page and include its HTML in `raw.detailHtml` for the normalizer to mine. */
  followDetails?: boolean;
  /** Max concurrent detail-page fetches. Defaults to 4 — set higher for fast/large hosts. */
  detailConcurrency?: number;
  /** When true, use a headless Chromium browser instead of plain HTTP for index and detail fetches. */
  usePlaywright?: boolean;
}

/** Default cap for concurrent detail-page fetches against the same source. */
const DEFAULT_DETAIL_CONCURRENCY = 4;
const DEFAULT_MAX_PAGES = 500;
const DEFAULT_MAX_DURATION_MS = 15 * 60_000;

/**
 * Scrapes a listings index page by page (every page, not just the first),
 * optionally fetching each listing's detail page so the normalizer can read
 * all of its attributes.
 */
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
    const usePlaywright = cfg.usePlaywright === true;
    const followDetails = cfg.followDetails === true;
    const fetchHtml = this.htmlFetcher(cfg, usePlaywright);

    const stubs = await crawlIndexPages(
      {
        indexUrl: cfg.indexUrl,
        selectors: cfg.selectors,
        followDetails,
        nextPageSelector: cfg.nextPageSelector,
        pageParam: cfg.pageParam,
        pageStart: cfg.pageStart,
        maxPages: cfg.maxPages ?? DEFAULT_MAX_PAGES,
        limit,
        deadline: Date.now() + (cfg.maxDurationMs ?? DEFAULT_MAX_DURATION_MS),
      },
      // Per-page progress so the UI shows "N listings found" while pages load.
      { fetchHtml, onPage: (found) => options.onProgress?.(found, 0) }
    );
    options.onProgress?.(stubs.length, 0);

    if (!followDetails) return stubs;

    // Parallel detail-page fetches. The httpClient queues per host, so the
    // polite delay still holds.
    const concurrency = usePlaywright ? 1 : Math.max(1, cfg.detailConcurrency ?? DEFAULT_DETAIL_CONCURRENCY);
    let detailsCompleted = 0;
    const detailHtmls = await pMap(
      stubs,
      async (stub) => {
        const html = await fetchHtml(stub.url ?? '');
        options.onProgress?.(stubs.length, ++detailsCompleted);
        return html;
      },
      concurrency
    );

    const out: RawListing[] = [];
    stubs.forEach((stub, i) => {
      const html = detailHtmls[i];
      if (typeof html === 'string' && html.length > 0) {
        stub.raw.detailHtml = html;
        out.push(stub);
      } else if (isValidListingItem(stub.raw)) {
        // Detail page failed, but the card alone looks like a listing.
        out.push(stub);
      }
    });
    return out;
  }

  /** Fetch a page's HTML with up to 3 attempts; 4xx answers are final. */
  private htmlFetcher(cfg: HtmlScrapeAdapterConfig, usePlaywright: boolean): (url: string) => Promise<string> {
    const requestOpts = {
      userAgent: cfg.userAgent,
      requestDelayMs: cfg.requestDelayMs,
      respectRobotsTxt: cfg.respectRobotsTxt,
    };
    return async (url: string): Promise<string> => {
      let lastErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (usePlaywright) {
            const r = await fetchWithBrowser(url, { waitUntil: 'networkidle', settleMs: 800 });
            return r.html;
          }
          const r = await httpGet<string>(url, { ...requestOpts, responseType: 'text', timeout: 30_000 });
          return String(r.data);
        } catch (err) {
          lastErr = err;
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status && status >= 400 && status < 500) throw err;
          if (attempt < 2) await new Promise((res) => setTimeout(res, 1_000 * (attempt + 1)));
        }
      }
      throw lastErr;
    };
  }
}
