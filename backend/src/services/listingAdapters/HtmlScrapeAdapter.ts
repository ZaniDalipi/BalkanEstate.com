import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { IListingSource } from '../../models/ListingSource';
import { httpGet } from './httpClient';
import type { FetchOptions, RawListing, SourceAdapter } from './types';

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

    let pageUrl: string | undefined = cfg.indexUrl;
    let pageNum = cfg.pageStart ?? 1;

    for (let i = 0; i < maxPages && pageUrl; i++) {
      const url: string = cfg.pageParam ? this.withPageParam(cfg.indexUrl, cfg.pageParam, pageNum) : pageUrl;
      const response = await httpGet<string>(url, { ...requestOpts, responseType: 'text' });
      const $ = cheerio.load(String(response.data));
      const items = $(cfg.selectors.listingItem);

      for (const el of items.toArray()) {
        const root = $(el);
        const linkVal = pick($, root, cfg.selectors.link);
        if (!linkVal) continue;
        const detailUrl = resolveUrl(url, linkVal);
        const id = pick($, root, cfg.selectors.id) || detailUrl;

        const item: Record<string, unknown> = {
          title: pick($, root, cfg.selectors.title),
          price: pick($, root, cfg.selectors.price),
          description: pick($, root, cfg.selectors.description),
          city: pick($, root, cfg.selectors.city),
          address: pick($, root, cfg.selectors.address),
          beds: pick($, root, cfg.selectors.beds),
          baths: pick($, root, cfg.selectors.baths),
          sqft: pick($, root, cfg.selectors.sqft),
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

        if (cfg.followDetails) {
          try {
            const detail = await httpGet<string>(detailUrl, { ...requestOpts, responseType: 'text' });
            item.detailHtml = String(detail.data);
          } catch {
            // ignore detail-page failures
          }
        }

        out.push({ id: String(id), url: detailUrl, raw: item });
        if (limit && out.length >= limit) return out;
      }

      if (cfg.nextPageSelector) {
        const next = $(cfg.nextPageSelector).attr('href');
        pageUrl = next ? resolveUrl(url, next) : undefined;
      } else if (cfg.pageParam) {
        pageNum++;
      } else {
        pageUrl = undefined;
      }
    }

    return out;
  }

  private withPageParam(baseUrl: string, param: string, page: number): string {
    const u = new URL(baseUrl);
    u.searchParams.set(param, String(page));
    return u.toString();
  }
}
