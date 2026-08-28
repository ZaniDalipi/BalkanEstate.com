import express, { Request, Response } from 'express';
import Property from '../models/Property';
import Agency from '../models/Agency';
import { apiLogger } from '../utils/logger';

const router = express.Router();

const BASE_URL = process.env.FRONTEND_URL || 'https://balkanestateai.com';

/**
 * URLs per sitemap file.
 *
 * The sitemap protocol caps a single file at 50,000 URLs / 50 MB uncompressed,
 * and search engines reject the whole file past that — so a site that grows
 * beyond 50k active listings silently loses its sitemap coverage entirely.
 * 25,000 leaves room for the file to stay well inside the byte limit too.
 */
const URLS_PER_SITEMAP = 25_000;

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      default: return '&quot;';
    }
  });

const isoDate = (value?: Date | string | null): string =>
  new Date(value ?? Date.now()).toISOString().split('T')[0];

const urlEntry = (loc: string, lastmod: string, changefreq: string, priority: string): string =>
  `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;

const sendXml = (res: Response, xml: string, maxAgeSeconds: number): void => {
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}`);
  res.send(xml);
};

const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/search', priority: '0.9', changefreq: 'daily' },
  { url: '/agents', priority: '0.8', changefreq: 'weekly' },
  { url: '/agencies', priority: '0.8', changefreq: 'weekly' },
  { url: '/explore-cities', priority: '0.7', changefreq: 'weekly' },
];

/** Zero-based page number from `?page=`, clamped to something sane. */
const pageParam = (req: Request): number => {
  const parsed = Number(req.query.page);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.trunc(parsed), 10_000);
};

/**
 * Sitemap index — the entry point search engines fetch.
 *
 * Previously `/sitemap.xml` loaded every active listing and concatenated one
 * <url> block per listing into a single string: at 100k listings that is a
 * ~20 MB response built in memory, on a full collection scan, for every
 * crawler hit — and rejected by search engines for exceeding 50,000 URLs.
 * Now it lists the chunked sitemaps instead, and each chunk is fetched
 * separately with its own bounded query.
 */
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const [propertyCount, agencyCount] = await Promise.all([
      Property.countDocuments({ status: 'active' }),
      Agency.countDocuments({ isActive: true }),
    ]);

    const propertyPages = Math.max(1, Math.ceil(propertyCount / URLS_PER_SITEMAP));
    const agencyPages = Math.max(1, Math.ceil(agencyCount / URLS_PER_SITEMAP));
    const lastmod = isoDate();

    const entries = [`${BASE_URL}/sitemap-static.xml`];
    for (let page = 0; page < propertyPages; page++) {
      entries.push(`${BASE_URL}/sitemap-properties.xml?page=${page}`);
    }
    for (let page = 0; page < agencyPages; page++) {
      entries.push(`${BASE_URL}/sitemap-agencies.xml?page=${page}`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(loc => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    sendXml(res, xml, 3600);
  } catch (error) {
    apiLogger.error('Error generating sitemap index:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/** Alias kept for anything already pointing at the old index URL. */
router.get('/sitemap-index.xml', (_req: Request, res: Response) => {
  res.redirect(301, '/sitemap.xml');
});

/** Static, rarely-changing pages. */
router.get('/sitemap-static.xml', (_req: Request, res: Response) => {
  const lastmod = isoDate();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(page => urlEntry(`${BASE_URL}${page.url}`, lastmod, page.changefreq, page.priority)).join('')}</urlset>`;

  sendXml(res, xml, 86400);
});

/**
 * One page of listing URLs.
 *
 * Sorted by _id so paging is stable and index-served: sorting by updatedAt (as
 * this did) has no supporting index, which meant a blocking in-memory sort of
 * every active listing.
 */
router.get('/sitemap-properties.xml', async (req: Request, res: Response) => {
  try {
    const page = pageParam(req);

    const properties = await Property.find({ status: 'active' })
      .select('_id updatedAt')
      .sort({ _id: 1 })
      .skip(page * URLS_PER_SITEMAP)
      .limit(URLS_PER_SITEMAP)
      .lean();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${properties.map(property =>
  urlEntry(`${BASE_URL}/property/${property._id}`, isoDate(property.updatedAt), 'weekly', '0.8')
).join('')}</urlset>`;

    sendXml(res, xml, 3600);
  } catch (error) {
    apiLogger.error('Error generating property sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/** One page of agency URLs. */
router.get('/sitemap-agencies.xml', async (req: Request, res: Response) => {
  try {
    const page = pageParam(req);

    const agencies = await Agency.find({ isActive: true })
      .select('slug updatedAt')
      .sort({ _id: 1 })
      .skip(page * URLS_PER_SITEMAP)
      .limit(URLS_PER_SITEMAP)
      .lean();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${agencies
  .filter(agency => agency.slug)
  .map(agency => urlEntry(`${BASE_URL}/agencies/${agency.slug}`, isoDate(agency.updatedAt), 'weekly', '0.7'))
  .join('')}</urlset>`;

    sendXml(res, xml, 3600);
  } catch (error) {
    apiLogger.error('Error generating agency sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Robots.txt endpoint (alternative to static file)
 */
router.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsTxt = `# Robots.txt for Balkan Estate
# ${BASE_URL}

User-agent: *
Allow: /
Allow: /property/
Allow: /agencies/
Allow: /agents
Allow: /search

# Disallow private areas
Disallow: /account
Disallow: /inbox
Disallow: /admin
Disallow: /saved-properties
Disallow: /saved-searches
Disallow: /create-listing
Disallow: /payment/

# Crawl-delay for polite crawling
Crawl-delay: 1

# Sitemap location
Sitemap: ${BASE_URL}/sitemap.xml

# Google specific
User-agent: Googlebot
Allow: /
Crawl-delay: 0

# Bing specific
User-agent: Bingbot
Allow: /
Crawl-delay: 1
`;

  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.send(robotsTxt);
});

export default router;
