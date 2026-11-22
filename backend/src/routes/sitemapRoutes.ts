import express, { Request, Response } from 'express';
import Property from '../models/Property';
import Agency from '../models/Agency';
import Article from '../models/Article';
import { encodeId } from '../utils/idObfuscation';
import { apiLogger } from '../utils/logger';
import { xmlEscape } from '../utils/xml';
import { INDEXABLE_LISTING_FILTER } from '../utils/indexableListing';
import { MARKET_DEALS } from '../services/marketPages/marketPlaces';
import { loadMarketTree } from '../services/marketPages/marketPageService';
import { indexableMarketPaths, marketSitemapEntries } from '../services/marketPages/marketSitemap';

const router = express.Router();

const BASE_URL = process.env.FRONTEND_URL || 'https://balkanestateai.com';

/** Pages are served under a language prefix; English is the default. */
const LANG = 'en';

const day = (date?: Date | string | null): string =>
  (date ? new Date(date) : new Date()).toISOString().split('T')[0];

const urlEntry = (path: string, lastmod: string, changefreq: string, priority: string): string =>
  `  <url>
    <loc>${xmlEscape(`${BASE_URL}/${LANG}${path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;

/**
 * Sitemap of the database-backed pages: listings, agency profiles, blog
 * articles, and the "property for sale / for rent in {country | city}" pages
 * that have enough of our own listings to be indexed (in every language, with
 * hreflang alternates). The static pages (home, guides, legal, tools) are in the
 * frontend's own /sitemap.xml, generated at build time; this one is served on
 * the site's host as /sitemap-listings.xml by a Cloudflare Pages Function.
 *
 * Only canonical, indexable URLs belong here, which rules out:
 *  - listings that are not active (sold, rented, draft, pending),
 *  - listings imported from other websites (their text and photos belong to
 *    the source, and their pages are marked noindex),
 *  - listings with no description — a page with nothing but a price says
 *    nothing a search result should point to.
 * Listing URLs use the encoded id, exactly as the site links to them.
 */
/**
 * A sitemap holds at most 50,000 URLs: 43,000 listings + 2,000 agencies +
 * 2,000 articles + 300 market pages × 10 languages = 50,000.
 */
const MAX_LISTINGS = 43_000;
const MAX_MARKET_PATHS = 300;

router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const [properties, agencies, articles, marketPaths] = await Promise.all([
      Property.find(INDEXABLE_LISTING_FILTER)
        .select('_id updatedAt')
        .sort({ updatedAt: -1 })
        .limit(MAX_LISTINGS)
        .lean(),
      Agency.find({ slug: { $exists: true, $ne: '' } })
        .select('slug updatedAt')
        .sort({ updatedAt: -1 })
        .limit(2000)
        .lean(),
      Article.find({ status: 'published' })
        .select('slug updatedAt publishedAt')
        .sort({ publishedAt: -1 })
        .limit(2000)
        .lean(),
      // A failure here must not take the listings out of the sitemap.
      Promise.all(MARKET_DEALS.map(async (deal) => indexableMarketPaths(deal, await loadMarketTree(deal))))
        // Overviews and countries before cities, so a cut never drops a whole country.
        .then((perDeal) => perDeal.flat().sort((a, b) => a.split('/').length - b.split('/').length).slice(0, MAX_MARKET_PATHS))
        .catch((error) => {
          apiLogger.error('Sitemap: market pages left out:', error);
          return [] as string[];
        }),
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    xml += marketSitemapEntries(marketPaths, BASE_URL, day());

    for (const property of properties) {
      xml += urlEntry(`/property/${encodeId(String(property._id))}`, day(property.updatedAt), 'weekly', '0.8');
    }

    for (const agency of agencies) {
      const slug = String(agency.slug)
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
      xml += urlEntry(`/agencies/${slug}`, day(agency.updatedAt), 'weekly', '0.6');
    }

    for (const article of articles) {
      xml += urlEntry(`/blog/${encodeURIComponent(article.slug)}`, day(article.updatedAt || article.publishedAt), 'monthly', '0.6');
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    apiLogger.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Robots.txt endpoint (alternative to static file)
 */
router.get('/robots.txt', (_req: Request, res: Response) => {
  // This is the API host's robots.txt. The website's own robots.txt is a static
  // file served by the frontend; nothing on this host is a page to index.
  const robotsTxt = `User-agent: *
Disallow: /api/
Allow: /sitemap.xml
`;

  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.send(robotsTxt);
});

/**
 * Sitemap index for large sites (future scalability)
 * Useful when you have >50,000 URLs
 */
router.get('/sitemap-index.xml', async (_req: Request, res: Response) => {
  const currentDate = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

export default router;
