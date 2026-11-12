import type { IListingSource } from '../../models/ListingSource';
import { httpGet } from './httpClient';
import { fetchWithBrowser } from './browserClient';
import { isValidListingItem } from '../listingNormalizerService';
import { BotChallengeError, crawlIndexPages } from './htmlScrape/crawlIndexPages';
import { isBotChallengePage } from './htmlScrape/indexPages';
import { discoverSitemapUrls } from './sitemap';
import type { SelectorMap } from './htmlScrape/selectors';
import { pMap } from './pMap';
import { usableAdapterConfig } from './adapterConfig';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

interface HtmlScrapeAdapterConfig {
  indexUrl: string;
  /** Further catalogue pages crawled after `indexUrl` (e.g. for sale, for rent, another country). */
  indexUrls?: string[];
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

    const cfg = usableAdapterConfig('htmlScrape', source.adapterConfig ?? {}) as unknown as HtmlScrapeAdapterConfig;

    const limit = options.limit ?? cfg.limit;
    const usePlaywright = cfg.usePlaywright === true;
    const followDetails = cfg.followDetails === true;
    const fetchHtml = this.htmlFetcher(cfg, usePlaywright);

    const deadline = Date.now() + (cfg.maxDurationMs ?? DEFAULT_MAX_DURATION_MS);
    const stubs = await this.crawlAllIndexes(cfg, followDetails, limit, deadline, fetchHtml, options);
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
      if (typeof html === 'string' && html.length > 0 && !isBotChallengePage(html)) {
        stub.raw.detailHtml = html;
        out.push(stub);
      } else if (isValidListingItem(stub.raw)) {
        // Detail page failed, but the card alone looks like a listing.
        out.push(stub);
      }
    });
    return out;
  }

  /**
   * Every listing on every catalogue page. When the site hides its catalogue
   * behind a bot check, its sitemap (offered to crawlers in robots.txt) is
   * used instead; the detail pages then supply all the fields.
   */
  private async crawlAllIndexes(
    cfg: HtmlScrapeAdapterConfig,
    followDetails: boolean,
    limit: number | undefined,
    deadline: number,
    fetchHtml: (url: string) => Promise<string>,
    options: FetchOptions
  ): Promise<RawListing[]> {
    const indexUrls = Array.from(new Set([cfg.indexUrl, ...(cfg.indexUrls ?? [])]));
    const all: RawListing[] = [];
    const seen = new Set<string>();
    let blocked: BotChallengeError | null = null;
    for (const indexUrl of indexUrls) {
      if (limit && all.length >= limit) break;
      try {
        const stubs = await crawlIndexPages(
          {
            indexUrl,
            selectors: cfg.selectors,
            followDetails,
            // The configured paging belongs to the first catalogue; others are detected.
            nextPageSelector: indexUrl === cfg.indexUrl ? cfg.nextPageSelector : undefined,
            pageParam: indexUrl === cfg.indexUrl ? cfg.pageParam : undefined,
            pageStart: indexUrl === cfg.indexUrl ? cfg.pageStart : undefined,
            maxPages: cfg.maxPages ?? DEFAULT_MAX_PAGES,
            limit: limit ? limit - all.length : undefined,
            deadline,
          },
          // Per-page progress so the UI shows "N listings found" while pages load.
          { fetchHtml, onPage: (found) => options.onProgress?.(all.length + found, 0) }
        );
        for (const stub of stubs) {
          const key = stub.url ?? stub.id;
          if (!seen.has(key)) {
            seen.add(key);
            all.push(stub);
          }
        }
      } catch (err) {
        if (!(err instanceof BotChallengeError)) throw err;
        blocked = err;
      }
    }
    if (all.length > 0 || !blocked) return all;

    const sitemap = await discoverSitemapUrls(cfg.indexUrl);
    if (!sitemap?.urls.length) {
      throw new Error(`${blocked.message}, and it has no sitemap listing its properties.`);
    }
    const urls = limit ? sitemap.urls.slice(0, limit) : sitemap.urls;
    return urls.map((url) => ({ id: url, url, raw: { url } }));
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
