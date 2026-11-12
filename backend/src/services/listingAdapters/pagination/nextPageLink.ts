import type * as cheerio from 'cheerio';

export const isUsableHref = (href: string | undefined): href is string => {
  const trimmed = href?.trim();
  if (!trimmed) return false;
  return !(trimmed.startsWith('#') || trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') || trimmed.startsWith('tel:'));
};

export const resolveUrl = (base: string, href: string): string => {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
};

const NEXT_CSS_SELECTORS = [
  '.pagination a.next', '.pagination li.next a', '.pagination li.active + li a',
  '.pagination li.current + li a', '.pager a.next', '.pager li.next a', '.pager-next a',
  'nav[aria-label*="paginat" i] a[aria-label*="next" i]',
  'nav[aria-label*="paginat" i] a[aria-label*="sljedeć" i]',
  'nav[aria-label*="paginat" i] a[aria-label*="sledeć" i]',
  'a[class*="next-page"]', 'a[class*="nextpage"]', 'a[class*="pagination-next"]',
  'a[class*="page-next"]', 'a[class*="pagination__next"]', '.wp-pagenavi a.nextpostslink',
  '.nav-links a.next', 'a.next.page-numbers', 'li.next > a', 'a.next',
  'a[aria-label="Next page" i]', 'a[aria-label="Next" i]', 'a[title="Next" i]',
];

/** "Next" in the languages of the markets we serve. */
const NEXT_LABELS = [
  'next', 'next page', '›', '»', '>', '→', 'naprijed', 'dalje', 'sljedeća', 'sledeća', 'sledeca', 'sljedeca',
  'następna', 'următor', 'urmatoarea', 'следваща', 'следна', 'следећа', 'επόμενη', 'tjetra', 'para',
  'suivant', 'weiter', 'nächste', 'successivo', 'siguiente',
];

const PAGINATION_CONTAINERS =
  '[class*="paginat" i], [class*="pager" i], [class*="paging" i], [class*="page-numbers" i], ' +
  '[class*="stranic" i], nav[role="navigation"], nav[aria-label*="page" i], ul.pages';

/**
 * Find the URL of the page after `currentPage` from a listings page's HTML.
 *
 * In order: `<link rel="next">`, `a[rel="next"]`, well-known "next" classes,
 * a "Next" label (multilingual) inside the pagination bar, and finally the
 * numbered link "currentPage + 1" — which is all many Balkan portals show.
 * Returns undefined when nothing credible is found.
 */
export const findNextPageUrl = (
  $: cheerio.CheerioAPI,
  currentUrl: string,
  currentPage: number
): string | undefined => {
  const accept = (href: string | undefined): string | undefined => {
    if (!isUsableHref(href)) return undefined;
    const abs = resolveUrl(currentUrl, href);
    return abs === currentUrl ? undefined : abs;
  };

  const direct = accept($('link[rel="next"]').attr('href')) ?? accept($('a[rel~="next"]').first().attr('href'));
  if (direct) return direct;

  for (const sel of NEXT_CSS_SELECTORS) {
    const hit = accept($(sel).first().attr('href'));
    if (hit) return hit;
  }

  const containers = $(PAGINATION_CONTAINERS);
  if (!containers.length) return undefined;
  const anchors = containers.find('a[href]').toArray().map((el) => ({
    text: $(el).text().trim().toLowerCase(),
    aria: ($(el).attr('aria-label') ?? $(el).attr('title') ?? '').trim().toLowerCase(),
    href: $(el).attr('href'),
  }));

  for (const a of anchors) {
    if (NEXT_LABELS.some((l) => a.text === l || a.aria === l || a.aria.startsWith(`${l} `))) {
      const hit = accept(a.href);
      if (hit) return hit;
    }
  }

  const wanted = String(currentPage + 1);
  for (const a of anchors) {
    if (a.text === wanted || a.aria.endsWith(` ${wanted}`)) {
      const hit = accept(a.href);
      if (hit) return hit;
    }
  }
  return undefined;
};
