import express, { Request, Response } from 'express';
import Property from '../models/Property';
import Agency from '../models/Agency';
import Article from '../models/Article';
import { encodeId } from '../utils/idObfuscation';
import { apiLogger } from '../utils/logger';

const router = express.Router();

const BASE_URL = process.env.FRONTEND_URL || 'https://balkanestateai.com';

/** Pages are served under a language prefix; English is the default. */
const LANG = 'en';

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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
 * Sitemap of the database-backed pages: listings, agency profiles and blog
 * articles. The static pages (home, guides, legal, tools) are in the
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
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const [properties, agencies, articles] = await Promise.all([
      Property.find({
        status: 'active',
        $or: [{ source: { $exists: false } }, { source: null }, { source: '' }],
        description: { $exists: true, $ne: '' },
      })
        .select('_id updatedAt')
        .sort({ updatedAt: -1 })
        .limit(45000)
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
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

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
