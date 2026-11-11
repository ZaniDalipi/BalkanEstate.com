import type { ListingAdapterType } from '../api/listingSourceApi';
import type { FeedConfigErrorCode } from './feedErrorText';

/**
 * The edit form's quick check of a feed's settings before saving — the same
 * rules the server applies (backend `listingAdapters/adapterConfig.ts`), which
 * stays the last word. Only what can't be worked out is required.
 */

export interface FeedConfigProblem {
  field: string;
  code: FeedConfigErrorCode;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const isWebUrl = (v: string): boolean => /^https?:\/\/[^\s/]+\.[^\s]+/i.test(v);

const url = (config: Record<string, unknown>, key: string, missing: FeedConfigErrorCode): FeedConfigProblem[] => {
  const v = text(config[key]);
  if (!v) return [{ field: key, code: missing }];
  return isWebUrl(v) ? [] : [{ field: key, code: 'invalidUrl' }];
};

export const feedConfigProblems = (type: ListingAdapterType, config: unknown): FeedConfigProblem[] => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return [{ field: 'adapterConfig', code: 'notAnObject' }];
  const c = config as Record<string, unknown>;
  switch (type) {
    case 'customApi':
    case 'xmlFeed':
      return url({ endpoint: c.endpoint ?? c.url }, 'endpoint', 'missingEndpoint');
    case 'jsonFeed':
      if (text(c.endpoint ?? c.url)) return url({ endpoint: c.endpoint ?? c.url }, 'endpoint', 'missingEndpoint');
      if (!text(c.inlineJson)) return [{ field: 'endpoint', code: 'missingSource' }];
      try {
        JSON.parse(text(c.inlineJson));
        return [];
      } catch {
        return [{ field: 'inlineJson', code: 'invalidInlineJson' }];
      }
    case 'rss': {
      const urls = (Array.isArray(c.feedUrls) ? c.feedUrls : [c.feedUrl]).map(text).filter(Boolean);
      if (!urls.length) return [{ field: 'feedUrls', code: 'missingFeedUrl' }];
      return urls.every(isWebUrl) ? [] : [{ field: 'feedUrls', code: 'invalidUrl' }];
    }
    case 'htmlScrape': {
      const problems = url(c, 'indexUrl', 'missingIndexUrl');
      const sel = c.selectors as Record<string, unknown> | undefined;
      if (!sel || !text(sel.listingItem) || !text(sel.link)) problems.push({ field: 'selectors', code: 'missingSelectors' });
      return problems;
    }
    case 'jsonLd': {
      const hasUrls = Array.isArray(c.listingUrls) && c.listingUrls.some((u) => text(u));
      return hasUrls || text(c.sitemapOf) || (text(c.indexUrl) && text(c.linkSelector)) ? [] : [{ field: 'listingUrls', code: 'missingListingUrls' }];
    }
    default:
      return [];
  }
};
