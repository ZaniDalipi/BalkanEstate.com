import type * as cheerio from 'cheerio';

/**
 * Finding a site's listing index pages ("all properties for sale", "for
 * rent") — the pages that list the whole catalogue, page by page — as
 * opposed to a homepage showing a few featured cards, or one listing.
 */

/** Words a catalogue / category path is made of, in the languages we serve. */
const CATEGORY_WORDS = new Set([
  // English
  'sale', 'sales', 'for-sale', 'forsale', 'buy', 'rent', 'rental', 'rentals', 'for-rent', 'to-rent', 'let', 'lettings',
  'long-term', 'short-term', 'vacation', 'holiday', 'holidays', 'properties', 'property', 'listings', 'listing',
  'search', 'all', 'real-estate', 'estates', 'homes', 'apartments', 'houses', 'villas', 'land', 'plots', 'commercial',
  'new-build', 'new-developments', 'developments', 'projects', 'residential', 'offers',
  // BCMS / HR / SR / ME
  'nekretnine', 'prodaja', 'izdavanje', 'najam', 'iznajmljivanje', 'stanovi', 'kuce', 'kuće', 'oglasi', 'novogradnja',
  'poslovni-prostori', 'zemljista', 'zemljišta', 'kupovina',
  // Albanian
  'shitje', 'qira', 'qera', 'prona', 'pronat', 'apartamente', 'shtepi', 'vila', 'toka',
  // MK / BG (transliterated) and RO / EL / DE / FR / IT
  'prodazba', 'izdavanje', 'imoti', 'prodajba', 'naem', 'vanzare', 'inchiriere', 'inchirieri', 'imobiliare',
  'akinita', 'poliseis', 'enoikiaseis', 'kaufen', 'kauf', 'mieten', 'miete', 'immobilien', 'vente', 'location',
  'vendita', 'affitto', 'immobili',
]);

/** Catalogues of listings that are no longer available. */
const SOLD_RE = /(^|[-_/])(sold|rented|prodano|prodato|prodani|izdato|shitur|vandut|verkauft|vendu|venduti)([-_/]|$)/i;
/** An id or reference code in a segment marks a single listing ("ALVS1455", "stan-12345"). */
const ID_SEGMENT_RE = /\d{3,}|[a-z]{2,}\d{2,}/i;
const LOCALE_RE = /^([a-z]{2}|[a-z]{2}-[a-z]{2})$/i;

const segmentsOf = (pathname: string): string[] => {
  const segs = pathname.toLowerCase().split('/').filter(Boolean);
  return segs.length > 0 && LOCALE_RE.test(segs[0]) ? segs.slice(1) : segs;
};

/**
 * True for a catalogue path such as `/en/properties/sale/`,
 * `/nekretnine/prodaja/stanovi`, `/properties/kosovo/rent/` — the last
 * segment is a category word and no segment carries a listing id.
 */
export const looksLikeIndexPath = (pathname: string): boolean => {
  const segs = segmentsOf(pathname);
  if (segs.length === 0 || segs.length > 4) return false;
  if (segs.some((s) => ID_SEGMENT_RE.test(s))) return false;
  return CATEGORY_WORDS.has(segs[segs.length - 1]) && segs.some((s) => CATEGORY_WORDS.has(s));
};

/** Homepage, or a bare language root like `/en/`. */
export const isSiteRoot = (pathname: string): boolean => segmentsOf(pathname).length === 0;

const scoreIndexPath = (pathname: string): number => {
  const p = pathname.toLowerCase();
  let score = 0;
  if (/(sale|buy|prodaja|shitje|vanzare|kauf|vente|vendita|poliseis|kupovina)/.test(p)) score += 3;
  if (/(rent|let|najam|izdavanje|qira|qera|inchiri|miete|location|affitto|enoikiaseis|naem)/.test(p)) score += 2;
  if (/(propert|listing|nekretnin|prona|imoti|imobil|immobil|akinita|real-estate|estates)/.test(p)) score += 1;
  if (/(vacation|holiday|short-term)/.test(p)) score -= 1;
  return score;
};

/**
 * The site's listing catalogue pages linked from `pageUrl` (same site), best
 * first: for sale, then for rent, then the rest. Sold archives are skipped.
 */
export const findIndexPageUrls = ($: cheerio.CheerioAPI, pageUrl: string, max = 6): string[] => {
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return [];
  }
  const counts = new Map<string, number>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let u: URL;
    try {
      u = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (u.origin !== origin || SOLD_RE.test(u.pathname) || !looksLikeIndexPath(u.pathname)) return;
    u.hash = '';
    u.search = '';
    if (!u.pathname.endsWith('/')) u.pathname += '/'; // "/nekretnine" and "/nekretnine/" are one page
    counts.set(u.toString(), (counts.get(u.toString()) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([url, count]) => ({ url, kind: scoreIndexPath(new URL(url).pathname), count }))
    .filter((c) => c.kind > 0)
    .map((c) => ({ url: c.url, score: c.kind * 10 + Math.min(c.count, 9) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((c) => c.url);
};

const CHALLENGE_PATTERNS = [
  /<title>\s*(one moment, please|just a moment|attention required|checking your browser|please wait|ddos-guard|access denied)/i,
  /cf-browser-verification|cf_chl_|\/cdn-cgi\/challenge-platform/i,
  /_Incapsula_Resource|incap_ses_/i,
  /px-captcha|sgcaptcha|wsidchk/i,
];

/**
 * A bot-check / "one moment please" interstitial instead of the real page.
 * We don't try to get past these: the caller reports it, or uses a source
 * the site does offer to crawlers (its sitemap).
 */
export const isBotChallengePage = (html: string): boolean =>
  html.length < 60_000 && CHALLENGE_PATTERNS.some((re) => re.test(html));

/**
 * The total a listings page announces: "Showing 1–9 of 526", "1-24 od 312",
 * "526 results", "312 oglasa", "526 prona". Undefined when none is shown.
 */
export const parseListingTotal = (text: string): number | undefined => {
  const t = text.replace(/\s+/g, ' ');
  const patterns = [
    /\d+\s*[-–—]\s*\d+\s+(?:of|od|nga|из|από|din|von|de|di|из)\s+([\d.,\s]{1,9}\d)/i,
    /([\d.,]{1,7}\d)\s+(?:results|properties|listings|oglasa|oglasi|nekretnina|prona|pronat|rezultata|rezultate|имоти|обяви|αγγελίες|anunturi|anunțuri|immobilien|objekte)\b/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const n = parseInt(m[1].replace(/[.,\s]/g, ''), 10);
    // "Since 2007, 300 properties sold" — a year is not a total.
    if (re === patterns[1] && n >= 1950 && n <= 2100) continue;
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n;
  }
  return undefined;
};
