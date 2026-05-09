/**
 * Auto-detect the best ingestion adapter for a given website URL.
 * Probes in order (fastest/most reliable first) and returns the first match.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import Parser from 'rss-parser';
import { isValidListingItem } from './listingNormalizerService';
import { findSiteProfile } from './listingDetectorProfiles';

const TIMEOUT = 12_000;

export interface DetectResult {
  adapterType: 'rss' | 'jsonFeed' | 'jsonLd' | 'customApi' | 'xmlFeed' | 'htmlScrape';
  adapterConfig: Record<string, unknown>;
  fieldMap: Record<string, string>;
  /** One raw example item from the source (for preview). */
  sample?: Record<string, unknown>;
  /** Human-readable description of what was found. */
  hint: string;
}

/**
 * URL-path fragments commonly used for individual listing detail pages
 * across Balkan / European real-estate sites. Used to discriminate
 * "listing card" anchors from navigation/footer/agency links.
 *
 * Trailing-dash variants (e.g. `/oglas-`) catch URL slugs like
 * `/oglas-stan-zagreb-12345` that don't have a path-segment break.
 */
const LISTING_URL_FRAGMENTS = [
  // Balkan
  '/oglas/', '/oglasi/', '/oglas-', '/oglasi-',
  '/nekretnina/', '/nekretnine/', '/nekretnina-', '/nekretnine-',
  '/imovina/', '/imobil/', '/imot/',
  '/objava/', '/objave/', '/objavi/',
  '/apartman/', '/apartmani/', '/apartman-',
  '/stan/', '/stanovi/', '/stan-', '/stanovi-',
  '/kuca/', '/kuće/', '/kuce/', '/kuca-', '/kuće-', '/kuce-',
  '/poslovni-prostor/', '/poslovni-',
  '/zemljiste/', '/zemljište/', '/zemljiste-',
  '/garaza/', '/garaza-',
  '/vikendica/', '/vikendica-',
  '/lokal/', '/lokali/',
  // English / generic
  '/listing/', '/listings/', '/listing-',
  '/property/', '/properties/', '/property-',
  '/real-estate/', '/realestate/',
  '/home/', '/homes/', '/house/', '/houses/',
  '/apartment/', '/apartments/', '/apt/',
  '/estate/', '/estates/',
  '/rental/', '/rentals/',
  '/for-sale/', '/for-rent/',
  '/sale/', '/rent/',
  '/detail/', '/details/', '/-detail-', '/detail-',
  // Romance / Germanic
  '/inmueble/', '/inmuebles/', '/casa/', '/pisos/', '/piso/', '/vivienda/',
  '/immobilien/', '/wohnung/', '/haus/',
  '/immobilier/', '/appartement/', '/maison/',
  '/imovel/', '/imoveis/',
  // Romanian
  '/anunt/', '/anuntul/', '/anunturi/', '/anunturi-',
  // Greek
  '/akinita/', '/akinhta/', '/diamerisma/',
  // Bulgarian
  '/imot/', '/imoti/', '/apartament/',
  // Common slug prefixes (single letter)
  '/p/', '/l/', '/o/', '/a/', '/h/',
];

/**
 * Path segments that, when they appear as the FIRST segment of the path,
 * mean we're looking at navigation/marketing/account pages rather than a
 * listing detail page. Compared against the leading segment only — never
 * substrings — so they don't accidentally reject e.g. `/listings/tag-xyz`.
 *
 * Kept tight on purpose: false negatives (rejecting real listings) are far
 * worse than false positives, because the adapter applies a second
 * `isValidListingItem` content check before persisting anything.
 *
 * Locale prefixes (e.g. `/en/`, `/sq-al/`) are stripped before this check.
 */
const NON_LISTING_LEADING_SEGMENTS = new Set<string>([
  // Auth / account
  'login', 'signin', 'register', 'signup', 'logout', 'auth',
  'account', 'profile', 'dashboard', 'my-account',
  // Marketing / static
  'about', 'about-us', 'contact', 'kontakt', 'help', 'faq', 'support',
  'terms', 'privacy', 'policy', 'legal', 'impressum',
  // System
  'sitemap', 'robots.txt', 'wp-admin', 'wp-login', 'admin',
  // Cart / checkout
  'cart', 'checkout',
]);

/**
 * Locale-prefix segments we strip before evaluating a path. These match the
 * common 2-letter ISO codes plus 5-letter `xx-yy` variants used by Balkan
 * portals (e.g. /sq-al/, /sr-rs/, /hr-hr/).
 */
const LOCALE_SEGMENT_RE = /^([a-z]{2}|[a-z]{2}-[a-z]{2})$/i;

/**
 * File extensions that are clearly not listing pages.
 */
const NON_LISTING_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|zip|rar|jpg|jpeg|png|gif|svg|webp|mp4|mp3|mov|avi|css|js|xml|json|txt)$/i;

/**
 * Returns true if the URL pathname looks like an individual real-estate
 * listing detail page.
 *
 * Strategy (positive-first — false negatives are far worse than false
 * positives because the adapter applies a second `isValidListingItem`
 * sanity check on the actual content):
 *
 *  1. Strip leading locale segment (`/en/`, `/sq-al/`, …)
 *  2. Reject extension-style asset URLs
 *  3. Reject only an explicit, tight blacklist of nav/account leading segments
 *  4. Reject obvious agency/agent profile pages (their leading segment alone)
 *  5. Accept any URL containing a known listing-y fragment
 *  6. Accept any path with a 3+ digit numeric segment (id-style detail URLs)
 */
export const looksLikeListingPath = (pathname: string): boolean => {
  if (!pathname || pathname === '/' || pathname.length < 3) return false;
  const lower = pathname.toLowerCase();
  if (NON_LISTING_EXTENSIONS.test(lower)) return false;

  // Drop leading slash and split into segments
  const rawSegments = lower.replace(/^\/+/, '').replace(/\/+$/, '').split('/');
  // Strip a leading locale segment (e.g. /en/property/123 → /property/123)
  const segments = rawSegments.length > 1 && LOCALE_SEGMENT_RE.test(rawSegments[0])
    ? rawSegments.slice(1)
    : rawSegments;
  if (segments.length === 0) return false;

  // Reject if the first segment is clearly nav/marketing
  if (NON_LISTING_LEADING_SEGMENTS.has(segments[0])) return false;
  // Reject `/agent/<slug>`, `/agency/<slug>` etc. (agency/agent profile pages)
  if (/^(agent|agents|agencija|agencije|agency|agencies|broker|brokers)$/.test(segments[0])) {
    return false;
  }

  // Permissive accept: any listing-y fragment anywhere in the path.
  if (LISTING_URL_FRAGMENTS.some((f) => lower.includes(f))) return true;

  // Numeric-id detail pages: /property/12345, /oglas/12345, /-12345, /id/12345
  if (/\/\d{3,}(?:[/-]|$)/.test(lower)) return true;
  // Slug + numeric id at end: /modern-apartment-zagreb-1234
  if (/-\d{3,}(?:[/-]|$)/.test(lower)) return true;

  return false;
};

// Realistic browser UA — many Balkan portals block obvious bot UAs at the edge.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const buildBrowserHeaders = (url: string) => {
  let referer: string | undefined;
  try {
    const u = new URL(url);
    referer = `${u.protocol}//${u.host}/`;
  } catch { /* ignore */ }
  return {
    'User-Agent': BROWSER_UA,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hr;q=0.8,sr;q=0.7,bs;q=0.7,sl;q=0.6,bg;q=0.6,mk;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br',
    ...(referer ? { Referer: referer } : {}),
  };
};

const get = (url: string, responseType: 'text' | 'json' = 'text') =>
  axios.get(url, {
    timeout: TIMEOUT,
    headers: buildBrowserHeaders(url),
    responseType,
    decompress: true,
    maxRedirects: 5,
    validateStatus: (s) => s < 400,
  });

/**
 * The probe-style fetch returns null on any failure (used during auto-detect
 * when each call may legitimately 404). The caller decides whether to keep
 * trying alternatives.
 */
const tryUrl = async (url: string, responseType: 'text' | 'json' = 'text') => {
  try {
    const r = await get(url, responseType);
    return r.data as unknown;
  } catch {
    return null;
  }
};

/**
 * Strict variant for the initial homepage fetch — surfaces the HTTP status so
 * detectFeedForUrl can give the user a meaningful error if the site blocks us
 * with 403 / Cloudflare instead of just saying "could not auto-detect".
 */
const fetchPageStrict = async (
  url: string
): Promise<{ html: string; status: number } | { html: null; status: number; reason: string }> => {
  try {
    const r = await axios.get<string>(url, {
      timeout: TIMEOUT,
      headers: buildBrowserHeaders(url),
      responseType: 'text',
      decompress: true,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    if (r.status >= 200 && r.status < 400) {
      return { html: typeof r.data === 'string' ? r.data : '', status: r.status };
    }
    let reason = `HTTP ${r.status}`;
    if (r.status === 403) reason = 'HTTP 403 — the site is blocking automated access (likely Cloudflare or anti-bot).';
    else if (r.status === 404) reason = 'HTTP 404 — page not found. Double-check the URL.';
    else if (r.status === 429) reason = 'HTTP 429 — rate-limited.';
    else if (r.status >= 500) reason = `HTTP ${r.status} — the site is temporarily unavailable.`;
    return { html: null, status: r.status, reason };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ENOTFOUND') return { html: null, status: 0, reason: 'Domain could not be resolved — check the spelling.' };
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        return { html: null, status: 0, reason: `Connection timed out after ${TIMEOUT}ms.` };
      }
    }
    return { html: null, status: 0, reason: (err as Error).message };
  }
};

/**
 * Walk a deeply-nested object/array and return the first array that:
 * - has at least 2 items
 * - items are objects that look like real estate listings
 * Returns the array and a dot-path to it (for itemsPath).
 */
const findListingsInState = (
  obj: unknown,
  depth = 0,
  path = '$'
): { items: Record<string, unknown>[]; itemsPath: string } | null => {
  if (depth > 6 || obj == null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length >= 2) {
      const records = obj as Record<string, unknown>[];
      const validCount = records.filter(i => typeof i === 'object' && i !== null && isValidListingItem(i as Record<string, unknown>)).length;
      if (validCount >= 2) return { items: records, itemsPath: `${path}[*]` };
    }
    return null;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const result = findListingsInState(val, depth + 1, `${path}.${key}`);
    if (result) return result;
  }
  return null;
};

/**
 * Try to extract listing data embedded in the page's JavaScript state.
 * Handles Next.js (__NEXT_DATA__), Nuxt (window.__NUXT__), generic
 * window.__INITIAL_STATE__, and any <script type="application/json"> blocks.
 */
const extractEmbeddedSpaListings = (
  html: string
): { items: Record<string, unknown>[]; itemsPath: string; source: string } | null => {
  // 1. Next.js: <script id="__NEXT_DATA__" type="application/json">
  const nextMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch?.[1]) {
    try {
      const data = JSON.parse(nextMatch[1]) as Record<string, unknown>;
      const props = (data.props as Record<string, unknown>)?.pageProps ?? data.props ?? data;
      const result = findListingsInState(props);
      if (result) return { ...result, source: '__NEXT_DATA__' };
    } catch {/* ignore */}
  }

  // 2. Nuxt: window.__NUXT__ = {...}  or  <script>window.__NUXT__={...}</script>
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]{20,8000}?\})\s*[;<]/);
  if (nuxtMatch?.[1]) {
    try {
      const data = JSON.parse(nuxtMatch[1]) as Record<string, unknown>;
      const state = (data.data as unknown[]) ?? data;
      const result = findListingsInState(state);
      if (result) return { ...result, source: '__NUXT__' };
    } catch {/* ignore */}
  }

  // 3. Generic window.__INITIAL_STATE__ or window.initialState
  const stateMatch = html.match(/window\.__(?:INITIAL_)?STATE__\s*=\s*(\{[\s\S]{20,8000}?\})\s*[;<]/i);
  if (stateMatch?.[1]) {
    try {
      const data = JSON.parse(stateMatch[1]) as Record<string, unknown>;
      const result = findListingsInState(data);
      if (result) return { ...result, source: '__INITIAL_STATE__' };
    } catch {/* ignore */}
  }

  // 4. Any standalone <script type="application/json"> with listing arrays
  const $ = cheerio.load(html);
  let spaResult: { items: Record<string, unknown>[]; itemsPath: string; source: string } | null = null;
  $('script[type="application/json"]').each((_, el) => {
    if (spaResult) return;
    const text = $(el).contents().text();
    if (!text || text.length < 50) return;
    try {
      const data = JSON.parse(text) as unknown;
      const result = findListingsInState(data);
      if (result) spaResult = { ...result, source: 'application/json script' };
    } catch {/* ignore */}
  });

  return spaResult;
};

/**
 * Discover listing detail-page URLs by parsing sitemap.xml.
 *
 * Most real-estate portals expose a sitemap (often listed in /robots.txt)
 * that enumerates every listing URL — this is the single most reliable way
 * to ingest a site's catalogue without HTML scraping.
 *
 * If `scopedToPath` is provided, only URLs whose pathname starts with it are
 * kept (useful when the user pastes an agency-specific URL).
 */
const SITEMAP_TIMEOUT = 8_000;
const SITEMAP_MAX_TOTAL_URLS = 5_000;
const SITEMAP_MAX_INDEX_CHILDREN = 30;
const SITEMAP_RETURN_LIMIT = 500;

const fetchTextWithBrowserUa = async (url: string): Promise<string | null> => {
  try {
    const r = await axios.get<string>(url, {
      timeout: SITEMAP_TIMEOUT,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/xml,application/xml,text/plain,*/*',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      responseType: 'text',
      maxRedirects: 5,
      decompress: true,
      validateStatus: (s) => s < 400,
    });
    return typeof r.data === 'string' ? r.data : null;
  } catch {
    return null;
  }
};

const parseSitemapXml = (xml: string): { kind: 'index' | 'urlset'; locs: string[] } => {
  // Cheap regex parse — sitemap files are simple XML and we only need <loc> values.
  const isIndex = /<sitemapindex\b/i.test(xml);
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    if (locs.length >= SITEMAP_MAX_TOTAL_URLS) break;
    locs.push(match[1].trim());
  }
  return { kind: isIndex ? 'index' : 'urlset', locs };
};

const discoverSitemapUrls = async (pageUrl: string): Promise<{
  urls: string[];
  source: string;
} | null> => {
  let origin: string;
  let scopedPath: string;
  try {
    const u = new URL(pageUrl);
    origin = u.origin;
    scopedPath = u.pathname;
  } catch {
    return null;
  }

  // Build candidate sitemap URLs from robots.txt + standard locations.
  const candidates = new Set<string>([
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ]);
  const robotsTxt = await fetchTextWithBrowserUa(`${origin}/robots.txt`);
  if (robotsTxt) {
    const matches = robotsTxt.match(/Sitemap:\s*(\S+)/gi);
    if (matches) {
      for (const m of matches) {
        const line = m.replace(/Sitemap:\s*/i, '').trim();
        if (line) candidates.add(line);
      }
    }
  }

  const allListingUrls: string[] = [];
  let usedSitemap = '';

  for (const sitemapUrl of candidates) {
    if (allListingUrls.length >= SITEMAP_RETURN_LIMIT) break;
    const xml = await fetchTextWithBrowserUa(sitemapUrl);
    if (!xml || (!xml.includes('<urlset') && !xml.includes('<sitemapindex'))) continue;
    usedSitemap ||= sitemapUrl;

    const parsed = parseSitemapXml(xml);
    if (parsed.kind === 'index') {
      // Visit child sitemaps. Prefer ones whose URL hints at listings/properties.
      const ranked = parsed.locs
        .slice(0, SITEMAP_MAX_INDEX_CHILDREN)
        .sort((a, b) => {
          const score = (s: string) =>
            /(oglas|nekretnin|listing|propert|imovin|agency|agencij|stan|kuca|apartman|advert)/i.test(s) ? -1 : 0;
          return score(a) - score(b);
        });
      for (const childUrl of ranked) {
        if (allListingUrls.length >= SITEMAP_RETURN_LIMIT) break;
        const childXml = await fetchTextWithBrowserUa(childUrl);
        if (!childXml) continue;
        const child = parseSitemapXml(childXml);
        for (const loc of child.locs) {
          try {
            if (looksLikeListingPath(new URL(loc).pathname)) allListingUrls.push(loc);
          } catch {/* ignore */}
          if (allListingUrls.length >= SITEMAP_RETURN_LIMIT) break;
        }
      }
    } else {
      // Direct urlset
      for (const loc of parsed.locs) {
        try {
          if (looksLikeListingPath(new URL(loc).pathname)) allListingUrls.push(loc);
        } catch {/* ignore */}
        if (allListingUrls.length >= SITEMAP_RETURN_LIMIT) break;
      }
    }
  }

  if (allListingUrls.length < 3) return null;

  // De-duplicate and (when the user pasted a scoped URL like /agencije/123/) try
  // to filter to URLs that share a meaningful path/id segment with the source URL.
  const unique = Array.from(new Set(allListingUrls));
  const idLike = scopedPath.match(/\/(\d{3,})(?:\/|$)/)?.[1];
  let filtered: string[];
  if (idLike && unique.some(u => u.includes(`/${idLike}/`) || u.includes(`-${idLike}/`) || u.includes(`/${idLike}.`))) {
    filtered = unique.filter(u => u.includes(`/${idLike}/`) || u.includes(`-${idLike}/`) || u.includes(`/${idLike}.`));
  } else {
    filtered = unique;
  }

  return { urls: filtered.slice(0, SITEMAP_RETURN_LIMIT), source: usedSitemap };
};

/** Extract the first RSS/Atom feed URL from a page's <head>. */
const findFeedLinkInHtml = (html: string, baseUrl: string): string | null => {
  const $ = cheerio.load(html);
  const el = $('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]').first();
  const href = el.attr('href');
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
};

/** Check if page has JSON-LD with real-estate types. */
const findJsonLdInHtml = (html: string): boolean => {
  const $ = cheerio.load(html);
  const ACCEPTED = new Set(['RealEstateListing', 'Residence', 'Apartment', 'House', 'Product']);
  let found = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).html() ?? '{}');
      const items = Array.isArray(data) ? data : [data];
      if (items.some((i) => i['@type'] && ACCEPTED.has(String(i['@type'])))) found = true;
    } catch {/* ignore */}
  });
  return found;
};

/** Try to validate a URL looks like an RSS/Atom feed with real estate listings. */
const probeRss = async (url: string): Promise<Record<string, unknown>[] | null> => {
  try {
    const parser = new Parser({ timeout: TIMEOUT, headers: { 'User-Agent': BROWSER_UA } });
    const feed = await parser.parseURL(url);
    if (feed.items && feed.items.length > 0) {
      // Filter to only items that look like real listings
      const validItems = (feed.items as Record<string, unknown>[]).filter(item => isValidListingItem(item));
      if (validItems.length > 0) return validItems;
    }
    return null;
  } catch {
    return null;
  }
};

/** Try WordPress REST API. */
const probeWordPress = async (baseUrl: string): Promise<Record<string, unknown>[] | null> => {
  const origin = new URL(baseUrl).origin;
  const data = await tryUrl(`${origin}/wp-json/wp/v2/posts?per_page=3&_embed`, 'json');
  if (Array.isArray(data) && data.length > 0) {
    // Filter to only items that look like real listings
    const validItems = (data as Record<string, unknown>[]).filter(item => isValidListingItem(item));
    if (validItems.length > 0) return validItems;
  }
  return null;
};

/**
 * Smart HTML scrape detection: parse a page (e.g. an agency listings page),
 * find anchors that match listing-detail URL patterns, identify the common
 * card container, and synthesize an htmlScrape adapter config.
 *
 * Returns null when fewer than 2 listing-link anchors are found.
 */
const detectHtmlScrape = (
  html: string,
  pageUrl: string
): {
  selectors: {
    listingItem: string;
    link: string;
    title?: string;
    price?: string;
    image?: string;
    description?: string;
  };
  sample: Record<string, unknown>;
  count: number;
} | null => {
  const $ = cheerio.load(html);

  // 1. Collect anchors that point at listing-detail URLs.
  type AnchorInfo = { el: cheerio.Cheerio<AnyNode>; href: string; abs: string };
  const anchors: AnchorInfo[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs: string;
    try { abs = new URL(href, pageUrl).toString(); } catch { return; }
    let pathname: string;
    try { pathname = new URL(abs).pathname; } catch { return; }
    if (looksLikeListingPath(pathname)) {
      anchors.push({ el: $(el), href, abs });
    }
  });

  if (anchors.length < 2) return null;

  // 2. De-duplicate by abs URL (some pages link the same listing 2-3 times via
  //    image + title + "view" anchors all inside one card).
  const seenUrl = new Set<string>();
  const uniqueAnchors = anchors.filter(a => (seenUrl.has(a.abs) ? false : (seenUrl.add(a.abs), true)));
  if (uniqueAnchors.length < 2) return null;

  // 2.5 Filter out anchors that look like agency/agent profile links rather
  // than property detail pages. Many real-estate portals link agency listings
  // alongside actual property listings — we want only the latter.
  const NEGATIVE_KEYWORDS = /(agencija|agencije|agency|agencies|agent|agenti|agents|broker|broker-?id)/i;
  const filteredAnchors = uniqueAnchors.filter(a => {
    let pn = '';
    try { pn = new URL(a.abs).pathname.toLowerCase(); } catch { return false; }
    return !NEGATIVE_KEYWORDS.test(pn);
  });
  if (filteredAnchors.length < 2) return null;

  // 3. For each anchor, walk up to find the closest ancestor with a class that
  //    looks like a listing card (e.g. ".listing-item", ".oglas", ".property-card").
  //    Score class names by how listing-y they sound.
  const cardKeywords = /(listing|oglas|nekretnin|propert|imovin|imobil|estate|stan|kuca|item|card|result|search)/i;

  const findCardAncestor = (el: cheerio.Cheerio<AnyNode>): { selector: string; classNames: string[] } | null => {
    let cur = el.parent();
    let depth = 0;
    while (cur.length && depth < 8) {
      const tag = (cur.get(0) as { tagName?: string } | undefined)?.tagName?.toLowerCase() ?? '';
      const cls = (cur.attr('class') || '').trim();
      if (cls) {
        const classes = cls.split(/\s+/).filter(c => cardKeywords.test(c));
        if (classes.length > 0 && (tag === 'div' || tag === 'article' || tag === 'li' || tag === 'section')) {
          return { selector: `${tag}.${classes[0]}`, classNames: classes };
        }
      }
      cur = cur.parent();
      depth++;
    }
    return null;
  };

  // 4. Tally which selector covers the most anchors → that's the listing card.
  const selectorCounts = new Map<string, number>();
  for (const a of filteredAnchors) {
    const card = findCardAncestor(a.el);
    if (!card) continue;
    selectorCounts.set(card.selector, (selectorCounts.get(card.selector) ?? 0) + 1);
  }

  let listingItemSelector: string | null = null;
  let bestCount = 0;
  for (const [sel, count] of selectorCounts) {
    if (count > bestCount) { bestCount = count; listingItemSelector = sel; }
  }

  // 5. Fallback: if no class-based match, group anchors by their immediate
  //    parent's tag-path (e.g. "div > div > article") and use that.
  if (!listingItemSelector || bestCount < 2) {
    // Try article tag (semantic listings) or li (list-based grids)
    const articleCount = $('article').length;
    const liInUlCount = $('ul li').length;
    if (articleCount >= 2 && articleCount <= 200) {
      listingItemSelector = 'article';
      bestCount = articleCount;
    } else if (liInUlCount >= 2 && liInUlCount <= 200) {
      // Find a UL whose LIs each contain a listing link
      let bestLi = '';
      let bestLiCount = 0;
      $('ul').each((_, ul) => {
        const lis = $(ul).find('> li');
        let count = 0;
        lis.each((__, li) => {
          if ($(li).find('a[href]').filter((___, a) => looksLikeListingPath(new URL($(a).attr('href') || '', pageUrl).pathname || '')).length) count++;
        });
        if (count > bestLiCount) {
          bestLiCount = count;
          const ulCls = ($(ul).attr('class') || '').split(/\s+/)[0];
          bestLi = ulCls ? `ul.${ulCls} > li` : 'ul > li';
        }
      });
      if (bestLi && bestLiCount >= 2) { listingItemSelector = bestLi; bestCount = bestLiCount; }
    }
  }

  if (!listingItemSelector || bestCount < 2) return null;

  // 6. Now figure out per-card child selectors using the first matched card as a probe.
  const firstCard = $(listingItemSelector).first();
  if (!firstCard.length) return null;

  const probeText = (sel: string): string | undefined => {
    const t = firstCard.find(sel).first().text().trim();
    return t || undefined;
  };

  // Title: most prominent heading inside the card
  let titleSel: string | undefined;
  for (const candidate of ['h1', 'h2', 'h3', 'h4', '[class*="title"]', '[class*="name"]', '[class*="naslov"]']) {
    if (probeText(candidate)) { titleSel = candidate; break; }
  }

  // Price: look for currency symbols/keywords in any child element's text
  let priceSel: string | undefined;
  const priceClassCandidates = ['[class*="price"]', '[class*="cijena"]', '[class*="cena"]', '[class*="preis"]'];
  for (const candidate of priceClassCandidates) {
    if (probeText(candidate)) { priceSel = candidate; break; }
  }
  if (!priceSel) {
    // Fall back: find any descendant whose text contains a currency mark
    firstCard.find('*').each((_, el) => {
      if (priceSel) return;
      const text = $(el).contents().filter((__, n) => n.type === 'text').text().trim();
      if (/[€$£]|EUR\b|RSD\b|HRK\b|BAM\b|RON\b|BGN\b|MKD\b|kn\b/i.test(text) && /\d/.test(text)) {
        const cls = ($(el).attr('class') || '').split(/\s+/)[0];
        const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? 'span';
        priceSel = cls ? `${tag}.${cls}` : tag;
      }
    });
  }

  // Image: first <img> inside the card
  const imageSel = firstCard.find('img').first().length ? 'img|attr:src' : undefined;

  // Description: first paragraph or [class*="desc"]
  let descSel: string | undefined;
  for (const candidate of ['[class*="desc"]', '[class*="opis"]', 'p']) {
    if (probeText(candidate)) { descSel = candidate; break; }
  }

  // 7. Build a sample object from the first card so the wizard can show a preview.
  const linkAnchorInCard = firstCard.find('a[href]').filter((_, a) => {
    const href = $(a).attr('href') || '';
    let pn: string;
    try { pn = new URL(href, pageUrl).pathname; } catch { return false; }
    return looksLikeListingPath(pn);
  }).first();
  const linkHref = linkAnchorInCard.attr('href') || '';
  const linkSelector = linkAnchorInCard.is('a') ? `a[href*="${(() => {
    try { return new URL(linkHref, pageUrl).pathname.split('/').filter(Boolean)[0] ?? ''; } catch { return ''; }
  })()}"]|attr:href` : 'a|attr:href';

  const sample: Record<string, unknown> = {
    title: titleSel ? probeText(titleSel) : undefined,
    price: priceSel ? probeText(priceSel) : undefined,
    description: descSel ? probeText(descSel) : undefined,
    image: imageSel ? firstCard.find('img').first().attr('src') : undefined,
    url: linkHref ? new URL(linkHref, pageUrl).toString() : undefined,
  };

  return {
    selectors: {
      listingItem: listingItemSelector,
      link: linkSelector,
      title: titleSel,
      price: priceSel,
      image: imageSel,
      description: descSel,
    },
    sample,
    count: bestCount,
  };
};

/** Try fetching the URL itself as a JSON array/object. */
const probeJsonFeed = async (url: string): Promise<{ items: Record<string, unknown>[]; itemsPath: string } | null> => {
  const data = await tryUrl(url, 'json');
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data) && data.length > 0) {
    const validItems = (data as Record<string, unknown>[]).filter(item => isValidListingItem(item));
    if (validItems.length > 0) return { items: validItems, itemsPath: '$[*]' };
  }
  // Common wrappers: { data: [], items: [], results: [], listings: [] }
  for (const key of ['data', 'items', 'results', 'listings', 'properties', 'nekretnine']) {
    const val = (data as Record<string, unknown>)[key];
    if (Array.isArray(val) && val.length > 0) {
      const validItems = (val as Record<string, unknown>[]).filter(item => isValidListingItem(item));
      if (validItems.length > 0) {
        return { items: validItems, itemsPath: `$.${key}[*]` };
      }
    }
  }
  return null;
};

/** Build a best-effort fieldMap from an RSS item. */
const rssFieldMap = (): Record<string, string> => ({
  title: 'title',
  description: 'content:encoded',
  imageUrl: 'enclosure.url',
  city: 'categories',
});

/** Build a best-effort fieldMap from JSON-LD keys. */
const jsonLdFieldMap = (): Record<string, string> => ({
  title: 'name',
  description: 'description',
  price: 'offers.price',
  imageUrl: 'image',
  address: 'address.streetAddress',
  city: 'address.addressLocality',
  country: 'address.addressCountry',
  lat: 'geo.latitude',
  lng: 'geo.longitude',
  beds: 'numberOfRooms',
  sqft: 'floorSize.value',
});

/** Build a best-effort fieldMap from a WordPress post. */
const wpFieldMap = (): Record<string, string> => ({
  title: 'title.rendered',
  description: 'content.rendered',
  imageUrl: '_embedded.wp:featuredmedia[0].source_url',
  city: '_embedded.wp:term[0][0].name',
});

/** Walk a nested object and return all leaf paths (with values) up to a depth limit. */
const flattenSamplePaths = (
  obj: unknown,
  path = '',
  depth = 0,
  out: Array<{ path: string; key: string; value: unknown }> = []
): Array<{ path: string; key: string; value: unknown }> => {
  if (depth > 3 || obj == null) return out;
  if (typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object') {
      flattenSamplePaths(obj[0], `${path}[0]`, depth + 1, out);
    }
    return out;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    if (val != null && (typeof val !== 'object' || Array.isArray(val))) {
      out.push({ path: childPath, key, value: val });
    }
    if (val !== null && typeof val === 'object') {
      flattenSamplePaths(val, childPath, depth + 1, out);
    }
  }
  return out;
};

/** Build a fieldMap by inspecting the keys of a sample JSON object. */
const buildJsonFieldMap = (sample: Record<string, unknown>): Record<string, string> => {
  const map: Record<string, string> = {};
  const keyHints: Array<[RegExp, string]> = [
    // Core fields
    [/^(title|name|naslov|naziv|listing_title|property_title)$/i, 'title'],
    [/^(description|desc|opis|content|listing_description|property_description|summary)$/i, 'description'],
    [/^(price|cijena|cena|preis|prix|precio|asking_price|listing_price)$/i, 'price'],

    // Images (multiple patterns — higher priority)
    [/^(images|photos|pictures|photos_array|image_array|gallery)$/i, 'images'],
    [/^(image|img|photo|foto|thumbnail|slika|main_image|primary_image|featured_image)$/i, 'imageUrl'],
    [/^(image_url|photo_url|image_link|thumbnail_url)$/i, 'imageUrl'],

    // Location
    [/^(city|grad|stadt|ville|ciudad)$/i, 'city'],
    [/^(address|adresa|adresse|street|ulica|ulice)$/i, 'address'],
    [/^(country|zemlja|drzava|pays|nation)$/i, 'country'],
    [/^(lat|latitude|coords_lat)$/i, 'lat'],
    [/^(lng|lon|longitude|coords_lng|coords_lon)$/i, 'lng'],

    // Specs
    [/^(beds|bedrooms|sobe|zimmer|num_bedrooms|bedroom_count)$/i, 'beds'],
    [/^(baths|bathrooms|kupatila|num_bathrooms|bathroom_count)$/i, 'baths'],
    [/^(sqft|area|povrsina|size|flaeche|square_feet|square_meters|living_area|floor_area)$/i, 'sqft'],
    [/^(rooms|living_rooms|salon|num_rooms)$/i, 'livingRooms'],
    [/^(year_built|year_constructed|godinu_izgradnje|baujahr)$/i, 'yearBuilt'],
    [/^(parking|parking_spaces|garaza|garagen)$/i, 'parking'],
    [/^(floor|floor_number|sprat|etaj)$/i, 'floorNumber'],
    [/^(total_floors|num_floors|ukupno_spratova|stockwerke)$/i, 'totalFloors'],

    // Property details
    [/^(property_type|type|kategorija|kategorie|propertytype)$/i, 'propertyType'],
    [/^(listing_type|transaction_type|tip_oglasa)$/i, 'listingType'],
    [/^(amenities|features|specijalne_karakteristike|ausstattung|facility)$/i, 'amenities'],
    [/^(furnishing|furnish|namesten|moebel|furnished_status)$/i, 'furnishing'],
    [/^(heating|heating_type|grijanje|heizung)$/i, 'heatingType'],
    [/^(condition|stanje|zustand|quality)$/i, 'condition'],
    [/^(view|views|pogled|aussicht|view_type)$/i, 'viewType'],

    // Links
    [/^(url|link|permalink|href|listing_url|property_url|source_url)$/i, 'sourceUrl'],
    [/^(virtual_tour|tour_url|3d_tour|video_url|video)$/i, 'virtualTour360Url'],

    // Identifiers
    [/^(id|_id|uid|listing_id|property_id)$/i, 'id'],
  ];

  // Walk top-level keys first (so they win over nested ones), then nested.
  const paths = flattenSamplePaths(sample);
  // Sort: shallower paths first so top-level keys are preferred over nested.
  paths.sort((a, b) => a.path.split('.').length - b.path.split('.').length);

  for (const { path, key } of paths) {
    for (const [re, prop] of keyHints) {
      if (re.test(key) && !Object.values(map).includes(prop)) {
        map[prop] = path;
        break;
      }
    }
  }
  return map;
};

/**
 * Recursively walk a parsed JSON value looking for the deepest array of
 * objects that has at least one item — that's almost certainly the listings
 * array (e.g. `{ status: 'ok', meta: {...}, data: { listings: [ ... ] } }`).
 */
const findItemsArray = (
  obj: unknown,
  path = '$',
  depth = 0
): { items: Record<string, unknown>[]; path: string } | null => {
  if (obj == null || depth > 6) return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj.every((v) => v && typeof v === 'object' && !Array.isArray(v))) {
      return { items: obj as Record<string, unknown>[], path };
    }
    return null;
  }
  if (typeof obj !== 'object') return null;
  // Prefer named keys that conventionally hold listings.
  const preferredKeys = ['listings', 'items', 'results', 'data', 'records', 'rows', 'properties', 'nekretnine', 'oglasi', 'anunturi', 'ofertas'];
  for (const k of preferredKeys) {
    if (k in (obj as Record<string, unknown>)) {
      const r = findItemsArray((obj as Record<string, unknown>)[k], `${path}.${k}`, depth + 1);
      if (r) return r;
    }
  }
  // Fall back to any nested array.
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const r = findItemsArray(v, `${path}.${k}`, depth + 1);
    if (r) return r;
  }
  return null;
};

/**
 * Analyze a pasted JSON string (single object or array) and build a fieldMap
 * from it. Tolerant of:
 *   - Top-level arrays:                 [{...}, {...}]
 *   - Wrapped arrays:                   { data: [{...}] }, { results: [{...}] }
 *   - Deeply nested arrays:             { response: { meta: {...}, data: { listings: [{...}] } } }
 *   - Single-listing objects:           { title: ..., price: ... }
 *   - Plain objects with metadata only: rejected with a friendly error.
 *
 * Does not make any network requests.
 */
export const detectFromJsonSample = (jsonString: string): DetectResult => {
  const trimmed = jsonString.trim();
  if (!trimmed) {
    throw new Error('Please paste a JSON sample to analyze.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    const msg = (err as Error).message.split('\n')[0];
    throw new Error(`Invalid JSON — ${msg}. Make sure to paste a complete JSON object or array.`);
  }

  let items: Record<string, unknown>[] = [];
  let itemsPath = '$[*]';

  if (Array.isArray(parsed)) {
    items = (parsed as unknown[]).filter((v): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v));
  } else if (parsed && typeof parsed === 'object') {
    // First try a recursive search for the deepest object-array.
    const found = findItemsArray(parsed);
    if (found) {
      items = found.items;
      itemsPath = found.path === '$' ? '$[*]' : `${found.path}[*]`;
    } else {
      // No array found — treat the whole object as a single listing.
      items = [parsed as Record<string, unknown>];
      itemsPath = '$';
    }
  } else {
    throw new Error('JSON must be an object or array of listings, not a primitive value.');
  }

  if (items.length === 0) {
    throw new Error(
      'The JSON parsed correctly, but no listing-shaped objects were found. ' +
      'Make sure your sample is either an array of listings, or an object containing one (e.g. { "data": [ ... ] }).'
    );
  }

  const validItems = items.filter((item) => isValidListingItem(item));
  if (validItems.length === 0) {
    // Provide a helpful summary of what keys are present so the user can adjust.
    const sampleKeys = Object.keys(items[0]).slice(0, 10).join(', ');
    throw new Error(
      `Found ${items.length} object(s), but none look like real-estate listings. ` +
      `A listing should have at least one of: title/name, price, address/city, or property details ` +
      `(beds, area, etc). Keys in your sample: ${sampleKeys || '(none)'}.`
    );
  }

  const sample = validItems[0];
  return {
    adapterType: 'jsonFeed',
    adapterConfig: {
      itemsPath,
      idPath: detectIdPath(sample),
      urlPath: detectUrlPath(sample),
    },
    fieldMap: buildJsonFieldMap(sample),
    sample,
    hint: `JSON sample analyzed — ${validItems.length} valid listing(s) detected out of ${items.length}`,
  };
};

/**
 * Pick a JSONPath to the listing's stable identifier. Walks the sample's
 * top-level keys and matches common id field names. Returns `$.id` as a
 * sensible default when nothing matches (the adapter falls back to a
 * synthetic id if the path resolves to null).
 */
const detectIdPath = (sample: Record<string, unknown>): string => {
  const candidates = ['id', '_id', 'uid', 'uuid', 'listing_id', 'property_id', 'listingId', 'propertyId'];
  for (const key of candidates) {
    if (key in sample) {
      const val = sample[key];
      // Mongo extended JSON: { _id: { $oid: '...' } } — point at $oid so the adapter gets a string.
      if (val && typeof val === 'object' && !Array.isArray(val) && '$oid' in (val as Record<string, unknown>)) {
        return `$.${key}.$oid`;
      }
      return `$.${key}`;
    }
  }
  return '$.id';
};

/** Pick a JSONPath to the listing's canonical URL, falling back to `$.url`. */
const detectUrlPath = (sample: Record<string, unknown>): string => {
  for (const key of ['url', 'link', 'permalink', 'href', 'listing_url', 'property_url', 'sourceUrl', 'source_url']) {
    if (key in sample && typeof sample[key] === 'string') return `$.${key}`;
  }
  return '$.url';
};

/**
 * Probe a URL with optional auth headers and build an adapter config from the
 * response. Used when the user already knows the API endpoint and credentials.
 */
export const detectFeedForUrlWithAuth = async (
  rawUrl: string,
  headers: Record<string, string>
): Promise<DetectResult> => {
  const url = rawUrl.trim();
  let data: unknown;
  try {
    const r = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json, */*', ...headers },
      responseType: 'json',
      validateStatus: (s) => s < 500,
    });
    if (r.status >= 400) {
      throw new Error(`API returned HTTP ${r.status} — check the URL and auth credentials`);
    }
    data = r.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(`API returned HTTP ${err.response.status} — check the URL and auth credentials`);
    }
    throw err;
  }

  let items: Record<string, unknown>[] = [];
  let itemsPath = '$[*]';

  if (Array.isArray(data) && data.length > 0) {
    items = data as Record<string, unknown>[];
  } else if (data && typeof data === 'object') {
    for (const key of ['data', 'items', 'results', 'listings', 'properties', 'nekretnine']) {
      const val = (data as Record<string, unknown>)[key];
      if (Array.isArray(val) && val.length > 0) {
        items = val as Record<string, unknown>[];
        itemsPath = `$.${key}[*]`;
        break;
      }
    }
  }

  if (items.length === 0) {
    throw new Error(
      'API responded but returned no items. Check the URL, auth credentials, and that the endpoint returns a list of listings.'
    );
  }

  // Filter to only items that look like real listings
  const validItems = items.filter(item => isValidListingItem(item));
  if (validItems.length === 0) {
    throw new Error(
      'API returned items but none look like real estate listings. ' +
      'Listings must have at least (title or description) and (price or location/city/country).'
    );
  }

  const sample = validItems[0];
  const authConfig: Record<string, unknown> = {};
  if (Object.keys(headers).length > 0) authConfig.headers = headers;

  return {
    adapterType: 'customApi',
    adapterConfig: {
      url,
      ...authConfig,
      itemsPath,
      idPath: '$.id',
      urlPath: '$.url',
    },
    fieldMap: buildJsonFieldMap(sample),
    sample,
    hint: `Custom API detected — ${validItems.length} valid item(s) detected out of ${items.length}`,
  };
};

export const detectFeedForUrl = async (rawUrl: string): Promise<DetectResult> => {
  const url = rawUrl.trim();

  // ── 1. Probe the URL directly as RSS ────────────────────────────────────────
  const rssItems = await probeRss(url);
  if (rssItems) {
    const sample = rssItems[0];
    return {
      adapterType: 'rss',
      adapterConfig: { feedUrls: [url] },
      fieldMap: rssFieldMap(),
      sample,
      hint: `RSS/Atom feed detected — ${rssItems.length} item(s) found`,
    };
  }

  // ── 2. Fetch the page HTML and look for clues ────────────────────────────────
  const fetched = await fetchPageStrict(url);
  const html = fetched.html;
  // Capture a non-blocking-error reason so we can surface it later if all
  // detection paths fail (instead of silently saying "could not auto-detect").
  const fetchFailureReason = html === null ? (fetched as { reason: string }).reason : null;

  if (html && typeof html === 'string') {
    // 2a. RSS/Atom link in <head>
    const feedLink = findFeedLinkInHtml(html, url);
    if (feedLink) {
      const items = await probeRss(feedLink);
      if (items) {
        return {
          adapterType: 'rss',
          adapterConfig: { feedUrls: [feedLink] },
          fieldMap: rssFieldMap(),
          sample: items[0],
          hint: `RSS/Atom feed found via page <head>: ${feedLink}`,
        };
      }
    }

    // 2b. JSON-LD embedded in page
    if (findJsonLdInHtml(html)) {
      return {
        adapterType: 'jsonLd',
        adapterConfig: { listingUrls: [url] },
        fieldMap: jsonLdFieldMap(),
        hint: 'Schema.org JSON-LD (RealEstateListing) detected on the page',
      };
    }

    // 2c. Embedded SPA state (Next.js, Nuxt, window.__INITIAL_STATE__)
    //     Many modern Balkan portals (cityexpert.rs, indomio.rs, etc.) embed their
    //     entire page data as JSON so we can read it without DOM scraping.
    const spaData = extractEmbeddedSpaListings(html);
    if (spaData) {
      const validItems = spaData.items.filter(i => isValidListingItem(i));
      if (validItems.length >= 2) {
        const sample = validItems[0];
        return {
          adapterType: 'jsonFeed',
          adapterConfig: {
            endpoint: url,
            itemsPath: spaData.itemsPath,
            idPath: '$.id',
            urlPath: '$.url',
          },
          fieldMap: buildJsonFieldMap(sample),
          sample,
          hint: `Embedded ${spaData.source} data detected — ${validItems.length} listing(s) found`,
        };
      }
    }

    // 2d. WordPress indicators → probe WP REST
    if (html.includes('/wp-content/') || html.includes('wp-json')) {
      const wpItems = await probeWordPress(url);
      if (wpItems) {
        return {
          adapterType: 'customApi',
          adapterConfig: {
            url: `${new URL(url).origin}/wp-json/wp/v2/posts`,
            params: { per_page: 20, _embed: true },
            itemsPath: '$[*]',
            idPath: '$.id',
            urlPath: '$.link',
          },
          fieldMap: wpFieldMap(),
          sample: wpItems[0],
          hint: 'WordPress REST API detected',
        };
      }
    }
  }

  // ── 3. Common RSS paths ──────────────────────────────────────────────────────
  const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  for (const path of ['/feed', '/feed/', '/rss.xml', '/atom.xml', '/rss', '/?feed=rss2']) {
    const candidate = `${origin}${path}`;
    const items = await probeRss(candidate);
    if (items) {
      return {
        adapterType: 'rss',
        adapterConfig: { feedUrls: [candidate] },
        fieldMap: rssFieldMap(),
        sample: items[0],
        hint: `RSS feed found at ${candidate}`,
      };
    }
  }

  // ── 4. WordPress REST on origin ──────────────────────────────────────────────
  const wpItems = await probeWordPress(url);
  if (wpItems) {
    return {
      adapterType: 'customApi',
      adapterConfig: {
        url: `${origin}/wp-json/wp/v2/posts`,
        params: { per_page: 20, _embed: true },
        itemsPath: '$[*]',
        idPath: '$.id',
        urlPath: '$.link',
      },
      fieldMap: wpFieldMap(),
      sample: wpItems[0],
      hint: 'WordPress REST API detected',
    };
  }

  // ── 5. URL itself as JSON feed ───────────────────────────────────────────────
  const jsonResult = await probeJsonFeed(url);
  if (jsonResult) {
    const sample = jsonResult.items[0];
    return {
      adapterType: 'jsonFeed',
      adapterConfig: { url, itemsPath: jsonResult.itemsPath, idPath: '$.id', urlPath: '$.url' },
      fieldMap: buildJsonFieldMap(sample),
      sample,
      hint: `JSON feed detected — ${jsonResult.items.length} item(s) in response`,
    };
  }

  // ── 6. Known Balkan portal profile → then generic HTML card detection ────────
  if (html && typeof html === 'string') {
    // 6a. Check against known-site profiles (nekretnine.hr, 4zida.rs, etc.)
    const profile = findSiteProfile(url);
    if (profile) {
      const $ = cheerio.load(html);
      const cardCount = $(profile.listingItem).length;
      if (cardCount >= 2) {
        // Build a sample from the first card
        const firstCard = $(profile.listingItem).first();
        const pickText = (sel?: string) => sel ? firstCard.find(sel.split('|')[0]).first().text().trim() || undefined : undefined;
        const pickAttr = (sel?: string) => {
          if (!sel) return undefined;
          const [css, attr] = sel.split('|attr:');
          if (!attr) return firstCard.find(css).first().text().trim() || undefined;
          return firstCard.find(css).first().attr(attr) || undefined;
        };
        const rawLink = pickAttr(profile.link);
        const sample: Record<string, unknown> = {
          title: pickText(profile.title),
          price: pickText(profile.price),
          location: pickText(profile.location),
          sqft: pickText(profile.sqft),
          image: pickAttr(profile.image),
          url: rawLink ? (() => { try { return new URL(rawLink, url).toString(); } catch { return rawLink; } })() : undefined,
        };
        return {
          adapterType: 'htmlScrape',
          adapterConfig: {
            indexUrl: url,
            selectors: {
              listingItem: profile.listingItem,
              link: profile.link,
              title: profile.title,
              price: profile.price,
              image: profile.image,
              description: undefined,
              ...(profile.location && { location: profile.location }),
              ...(profile.sqft && { sqft: profile.sqft }),
            },
            ...(profile.nextPageSelector && { nextPageSelector: profile.nextPageSelector }),
            ...(profile.pageParam && { pageParam: profile.pageParam }),
            followDetails: true,
            requestDelayMs: 2000,
            respectRobotsTxt: true,
            maxPages: 5,
          },
          fieldMap: {
            title: 'title',
            price: 'price',
            city: 'location',
            sqft: 'sqft',
            imageUrl: 'image',
            sourceUrl: 'url',
          },
          sample,
          hint: `Known site: ${new URL(url).hostname} — ${cardCount} listing card(s) detected`,
        };
      }
    }

    // 6b. Generic heuristic: find listing-like anchors and identify card container
    const scrape = detectHtmlScrape(html, url);
    if (scrape) {
      return {
        adapterType: 'htmlScrape',
        adapterConfig: {
          indexUrl: url,
          selectors: scrape.selectors,
          followDetails: true,
          requestDelayMs: 2000,
          respectRobotsTxt: true,
          maxPages: 5,
        },
        fieldMap: {
          title: 'title',
          price: 'price',
          description: 'description',
          imageUrl: 'image',
          sourceUrl: 'url',
        },
        sample: scrape.sample,
        hint: `HTML listing page — found ${scrape.count} listing card(s) on the page`,
      };
    }
  }

  // ── 7. Sitemap discovery: works even when the page is JS-rendered ───────────
  // Most real-estate portals expose a /sitemap.xml referenced in robots.txt.
  // Fetch the listing detail pages individually and let the JsonLdAdapter parse
  // each one (it already handles JSON-LD + we'll enrich with OpenGraph too).
  const sitemap = await discoverSitemapUrls(url);
  if (sitemap && sitemap.urls.length >= 3) {
    return {
      adapterType: 'jsonLd',
      adapterConfig: {
        listingUrls: sitemap.urls,
        requestDelayMs: 2000,
        respectRobotsTxt: true,
      },
      fieldMap: jsonLdFieldMap(),
      hint: `Sitemap discovered (${sitemap.source}) — ${sitemap.urls.length} listing URL(s) will be fetched`,
    };
  }

  // ── Nothing found ────────────────────────────────────────────────────────────
  if (fetchFailureReason) {
    throw new Error(
      `Could not auto-detect listings: ${fetchFailureReason} ` +
      'Try pasting a direct RSS, JSON, or Atom feed URL, or a JSON sample from the agency portal.'
    );
  }
  throw new Error(
    'Could not auto-detect a supported feed format. The page may render its listings ' +
    'entirely in JavaScript (we don\'t run JS), or the site has no recognizable listing markup. ' +
    'Try pasting a direct RSS, JSON, or Atom feed URL, or a JSON sample from the agency portal.'
  );
};
