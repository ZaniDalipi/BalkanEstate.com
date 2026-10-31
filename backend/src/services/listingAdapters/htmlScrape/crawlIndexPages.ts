import * as cheerio from 'cheerio';
import { findNextPageUrl, resolveUrl } from '../pagination/nextPageLink';
import { walkPages } from '../pagination/walkPages';
import type { RawListing } from '../types';
import type { SelectorMap } from './selectors';
import { parseIndexPage } from './indexPage';

export interface CrawlConfig {
  indexUrl: string;
  selectors: SelectorMap;
  followDetails: boolean;
  /** CSS selector of the "next page" anchor (configured or detected). */
  nextPageSelector?: string;
  /** Query param carrying the page number, e.g. `page` in `?page=2`. */
  pageParam?: string;
  pageStart?: number;
  maxPages: number;
  limit?: number;
  /** Wall-clock deadline (epoch ms) after which no further pages are fetched. */
  deadline: number;
}

export interface CrawlDeps {
  fetchHtml: (url: string) => Promise<string>;
  onPage?: (listingsSoFar: number) => void;
}

/**
 * Walk every page of a listings index and return all listing stubs, in page
 * order, de-duplicated by detail URL. Each page's next link comes from the
 * configured selector or is detected from the page; sites without one
 * ("Load more", infinite scroll) get their page-URL pattern guessed.
 */
export const crawlIndexPages = (cfg: CrawlConfig, deps: CrawlDeps): Promise<RawListing[]> =>
  walkPages<RawListing>({
    firstUrl: cfg.indexUrl,
    pattern: cfg.pageParam ? { kind: 'query', param: cfg.pageParam, base: 1 } : undefined,
    firstPageNo: cfg.pageStart,
    maxPages: cfg.maxPages,
    limit: cfg.limit,
    deadline: cfg.deadline,
    keyOf: (stub) => stub.url ?? stub.id,
    onPage: deps.onPage,
    load: async (url, pageNo) => {
      const $ = cheerio.load(await deps.fetchHtml(url));
      const items = parseIndexPage($, url, cfg.selectors, cfg.followDetails);
      const viaSelector = cfg.nextPageSelector ? $(cfg.nextPageSelector).first().attr('href') : undefined;
      const nextUrl = viaSelector ? resolveUrl(url, viaSelector) : findNextPageUrl($, url, pageNo);
      return { items, nextUrl };
    },
  });
