import type * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { looksLikeListingPath } from '../../listingDetectorService';
import { isValidListingItem } from '../../listingNormalizerService';
import { isUsableHref, resolveUrl } from '../pagination/nextPageLink';
import type { RawListing } from '../types';
import { pick, pickAll, type SelectorMap } from './selectors';
import { smartExtract } from './smartExtract';

const PAGINATION_HREF_RE = /[?&](page|p|pg|paged|offset|start|from|strana|stranica)=\d+/i;
const PAGINATION_PATH_RE = /\/(?:page|p|str|strana|stranica|seite|pagina)\/\d+/i;

const pathnameOf = (url: string): string | null => {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
};

/** One listing card → raw stub (fields read with the selectors, then by pattern from the card text). */
const cardToStub = (
  $: cheerio.CheerioAPI,
  el: AnyNode,
  pageUrl: string,
  selectors: SelectorMap
): RawListing | null => {
  const root = $(el);
  const linkVal = pick($, root, selectors.link);
  if (!isUsableHref(linkVal)) return null;
  const detailUrl = resolveUrl(pageUrl, linkVal);
  const pathname = pathnameOf(detailUrl);
  if (!pathname || !looksLikeListingPath(pathname)) return null;

  // Text nodes joined with spaces — `.text()` glues "2 sobe" and "51 m²" into "2 sobe51 m²".
  const cardText = root.find('*').addBack().contents().toArray()
    .filter((n) => n.type === 'text')
    .map((n) => $(n).text())
    .join(' ');
  const item: Record<string, unknown> = {
    title: pick($, root, selectors.title),
    price: pick($, root, selectors.price) || smartExtract(cardText, 'price'),
    description: pick($, root, selectors.description),
    city: pick($, root, selectors.city) || pick($, root, selectors.location),
    address: pick($, root, selectors.address),
    beds: pick($, root, selectors.beds) || smartExtract(cardText, 'beds'),
    baths: pick($, root, selectors.baths) || smartExtract(cardText, 'baths'),
    sqft: pick($, root, selectors.sqft) || smartExtract(cardText, 'sqft'),
    image: pick($, root, selectors.image),
    images: selectors.images ? pickAll($, root, selectors.images) : undefined,
    propertyType: pick($, root, selectors.propertyType),
    url: detailUrl,
  };
  if (selectors.extras) {
    const extras: Record<string, string | undefined> = {};
    for (const [k, sel] of Object.entries(selectors.extras)) extras[k] = pick($, root, sel);
    item.extras = extras;
  }
  const id = pick($, root, selectors.id) || detailUrl;
  return { id: String(id), url: detailUrl, raw: item };
};

/** Fallback when no card matched: every anchor on the page that looks like a listing detail link. */
const anchorStubs = ($: cheerio.CheerioAPI, pageUrl: string): RawListing[] => {
  const out: RawListing[] = [];
  for (const a of $('a[href]').toArray()) {
    const href = $(a).attr('href');
    if (!isUsableHref(href) || PAGINATION_HREF_RE.test(href) || PAGINATION_PATH_RE.test(href)) continue;
    const detailUrl = resolveUrl(pageUrl, href);
    const pathname = pathnameOf(detailUrl);
    if (!pathname || !looksLikeListingPath(pathname)) continue;
    if (pathname.split('/').filter(Boolean).length < 2 && !/\d{3,}/.test(pathname)) continue;
    const anchorText = $(a).text().trim();
    if (/^\d{1,4}$/.test(anchorText)) continue;
    out.push({
      id: detailUrl,
      url: detailUrl,
      raw: { title: $(a).attr('title') || anchorText || undefined, url: detailUrl },
    });
  }
  return out;
};

/**
 * All listings on one index page, de-duplicated by detail URL. When
 * `followDetails` is off the cards must already look like listings; with it
 * on, validation waits until the detail page has been fetched.
 */
export const parseIndexPage = (
  $: cheerio.CheerioAPI,
  pageUrl: string,
  selectors: SelectorMap,
  followDetails: boolean
): RawListing[] => {
  const keep = (stub: RawListing) => followDetails || isValidListingItem(stub.raw);
  const seen = new Set<string>();
  const unique = (stubs: RawListing[]) =>
    stubs.filter((s) => (s.url && !seen.has(s.url) ? (seen.add(s.url), true) : false));

  const fromCards = unique(
    $(selectors.listingItem)
      .toArray()
      .map((el) => cardToStub($, el, pageUrl, selectors))
      .filter((s): s is RawListing => s !== null)
  ).filter(keep);
  if (fromCards.length > 0) return fromCards;
  return unique(anchorStubs($, pageUrl)).filter(keep);
};
