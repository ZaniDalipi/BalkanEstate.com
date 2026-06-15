import express, { Request, Response } from 'express';
import Property from '../models/Property';
import Agency from '../models/Agency';
import { apiLogger } from '../utils/logger';

const router = express.Router();

const BASE_URL = process.env.FRONTEND_URL || 'https://balkanestateai.com';

/**
 * Generate XML Sitemap for SEO
 * Includes:
 * - Static pages (home, search, agents, agencies)
 * - Dynamic property listings (active only)
 * - Agency pages
 */
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    // Fetch active properties
    const properties = await Property.find({ status: 'active' })
      .select('_id updatedAt city country price')
      .sort({ updatedAt: -1 })
      .lean();

    // Fetch agencies
    const agencies = await Agency.find({ isActive: true })
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const currentDate = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/search', priority: '0.9', changefreq: 'daily' },
      { url: '/agents', priority: '0.8', changefreq: 'weekly' },
      { url: '/agencies', priority: '0.8', changefreq: 'weekly' },
      { url: '/explore-cities', priority: '0.7', changefreq: 'weekly' },
    ];

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add property pages
    for (const property of properties) {
      const lastmod = property.updatedAt
        ? new Date(property.updatedAt).toISOString().split('T')[0]
        : currentDate;

      xml += `  <url>
    <loc>${BASE_URL}/property/${property._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Add agency pages
    for (const agency of agencies) {
      const lastmod = agency.updatedAt
        ? new Date(agency.updatedAt).toISOString().split('T')[0]
        : currentDate;

      xml += `  <url>
    <loc>${BASE_URL}/agencies/${agency.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
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
