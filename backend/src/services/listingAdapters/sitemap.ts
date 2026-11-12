import axios from 'axios';
import { looksLikeListingPath } from '../listingDetectorService';
import { looksLikeIndexPath } from './htmlScrape/indexPages';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const LOCALE_RE = /^([a-z]{2}|[a-z]{2}-[a-z]{2})$/i;

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
const SITEMAP_MAX_TOTAL_URLS = 50_000;
const SITEMAP_MAX_INDEX_CHILDREN = 60;
const SITEMAP_RETURN_LIMIT = 5_000;

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

export const discoverSitemapUrls = async (pageUrl: string): Promise<{
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

  // Multilingual sites list every property once per language: keep the
  // language of the pasted page (e.g. /en/), and never the category pages.
  const locale = scopedPath.split('/').filter(Boolean)[0];
  const sameLocale = (path: string) => !locale || !LOCALE_RE.test(locale) || path.split('/').filter(Boolean)[0] === locale;
  const isListingLoc = (loc: string): boolean => {
    try {
      const { pathname, origin: locOrigin } = new URL(loc);
      return locOrigin === origin && looksLikeListingPath(pathname) && !looksLikeIndexPath(pathname) && sameLocale(pathname);
    } catch {
      return false;
    }
  };

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
            if (isListingLoc(loc)) allListingUrls.push(loc);
          } catch {/* ignore */}
          if (allListingUrls.length >= SITEMAP_RETURN_LIMIT) break;
        }
      }
    } else {
      // Direct urlset
      for (const loc of parsed.locs) {
        try {
          if (isListingLoc(loc)) allListingUrls.push(loc);
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

