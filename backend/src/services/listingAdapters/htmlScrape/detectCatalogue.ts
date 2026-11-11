import * as cheerio from 'cheerio';
import { findIndexPageUrls, isBotChallengePage, isSiteRoot, parseListingTotal } from './indexPages';

/**
 * Decides where a site's whole catalogue is, when the pasted page isn't it:
 *
 *  - a homepage shows a handful of featured cards; the catalogue is on its
 *    "for sale" / "for rent" pages, which are crawled instead (all of them);
 *  - a catalogue behind a bot check can't be crawled; the site's sitemap
 *    (offered to crawlers in robots.txt) lists the listings instead.
 */

export type CataloguePlan =
  | { kind: 'indexPages'; indexUrls: string[]; html: string; total?: number }
  | { kind: 'sitemap'; reason: 'bot-check' }
  | { kind: 'asPasted'; total?: number };

export interface CatalogueDeps {
  /** HTML of a page, or null when it can't be fetched. */
  fetchPage: (url: string) => Promise<string | null>;
  /** How many listing cards a page shows (0 when it isn't a listings page). */
  countCards: (html: string, url: string) => number;
}

const pageText = (html: string): string => cheerio.load(html)('body').text();

export const planCatalogue = async (html: string, url: string, deps: CatalogueDeps): Promise<CataloguePlan> => {
  if (isBotChallengePage(html)) return { kind: 'sitemap', reason: 'bot-check' };

  let pathname = '/';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return { kind: 'asPasted' };
  }
  const total = parseListingTotal(pageText(html));
  if (!isSiteRoot(pathname)) return { kind: 'asPasted', total };

  const indexUrls = findIndexPageUrls(cheerio.load(html), url);
  if (indexUrls.length === 0) return { kind: 'asPasted', total };

  // Look at the best catalogue page: it decides the card selectors.
  for (const candidate of indexUrls) {
    const indexHtml = await deps.fetchPage(candidate);
    if (!indexHtml) continue;
    if (isBotChallengePage(indexHtml)) return { kind: 'sitemap', reason: 'bot-check' };
    if (deps.countCards(indexHtml, candidate) >= 2) {
      const ordered = [candidate, ...indexUrls.filter((u) => u !== candidate)];
      return { kind: 'indexPages', indexUrls: ordered, html: indexHtml, total: parseListingTotal(pageText(indexHtml)) };
    }
  }
  return { kind: 'asPasted', total };
};
