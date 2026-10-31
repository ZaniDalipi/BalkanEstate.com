/**
 * /sitemap-listings.xml — listings, agency profiles and blog articles.
 *
 * The API builds this sitemap from the database (backend/src/routes/
 * sitemapRoutes.ts); this function serves it from the site's own host, where
 * robots.txt points to it, so search engines accept the URLs in it without a
 * cross-host sitemap verification.
 */

const API_SITEMAP = 'https://api.balkanestateai.com/sitemap.xml';

export const onRequest = async (): Promise<Response> => {
  try {
    const response = await fetch(API_SITEMAP, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response('Sitemap temporarily unavailable', { status: 503 });
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Sitemap temporarily unavailable', { status: 503 });
  }
};
