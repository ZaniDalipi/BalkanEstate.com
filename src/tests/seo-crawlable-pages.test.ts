/**
 * What crawlers get: server-rendered listing pages, canonical URLs and robots.txt.
 *
 * These guard the fixes behind the AdSense "low value content" review: crawlers
 * used to receive an empty page with a self-redirect for every listing, the SPA
 * declared unprefixed canonicals that only redirect, and robots.txt exempted
 * Googlebot from every Disallow rule.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildOgHtml, buildPropertyPage, isCrawler } from '@/functions/_og-utils';
import { renderPage, buildHead, pageUrl } from '@/scripts/lib/page-shell.mjs';
import { canonicalFor, stripLanguage } from '@/src/components/seo/SEO';

const listing = {
  id: 'AbCdEfGh12345678',
  title: 'Sea-view apartment',
  city: 'Budva',
  country: 'Montenegro',
  price: 185000,
  beds: 2,
  baths: 1,
  sqft: 0,
  propertyType: 'apartment',
  listingType: 'sale',
  status: 'active',
  description: 'Bright two-bedroom flat.\n\nFive minutes from the beach.',
  images: [{ url: 'https://res.cloudinary.com/dh8tbq8wy/image/upload/v1/p/1.jpg' }],
};

describe('server-rendered listing page', () => {
  const html = buildOgHtml(listing, listing.id, 'en');

  it('is a real page, not a redirect', () => {
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).not.toContain('location.replace');
  });

  it('carries the listing content crawlers can read', () => {
    expect(html).toContain('<h1>Sea-view apartment</h1>');
    expect(html).toContain('<p>Five minutes from the beach.</p>');
    expect(html).toContain('€185,000');
    expect(html).toContain('<dt>Bedrooms</dt><dd>2</dd>');
  });

  it('leaves out facts the listing does not have instead of printing zeros', () => {
    expect(html).not.toContain('Living area');
    expect(html).not.toContain('0 m²');
  });

  it('declares the language-prefixed canonical and is indexable', () => {
    expect(html).toContain('<link rel="canonical" href="https://balkanestateai.com/en/property/AbCdEfGh12345678"');
    expect(html).toMatch(/<meta name="robots" content="index, follow/);
  });

  it('keeps imported and off-market listings out of the index', () => {
    const imported = buildPropertyPage({ ...listing, source: 'example-portal' }, listing.id, 'en');
    expect(imported.head).toContain('content="noindex, follow"');
    expect(imported.head).not.toContain('RealEstateListing');
    const sold = buildPropertyPage({ ...listing, status: 'sold' }, listing.id, 'en');
    expect(sold.head).toContain('content="noindex, follow"');
  });

  it('escapes seller-written text', () => {
    const page = buildPropertyPage({ ...listing, description: '<script>alert(1)</script> nice' }, listing.id);
    expect(page.body).not.toContain('<script>alert(1)</script>');
  });
});

describe('crawler detection', () => {
  it('serves rendered pages to Google, including the AdSense crawler', () => {
    expect(isCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isCrawler('Mediapartners-Google')).toBe(true);
    expect(isCrawler('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36')).toBe(false);
  });

  it('serves rendered pages to every Meta link-preview fetcher', () => {
    expect(isCrawler('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    expect(isCrawler('meta-externalfetcher/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)')).toBe(true);
    expect(isCrawler('meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)')).toBe(true);
  });
});

describe('page shell', () => {
  const shell = '<html lang="en"><head><!--page-head:start--><title>x</title><!--page-head:end--></head>'
    + '<body><div id="root"><!--page-body:start--><!--page-body:end--></div></body></html>';

  it('replaces the head and body regions and sets the language', () => {
    const head = buildHead({ lang: 'sq', path: '/guides', title: 'T', description: 'D' });
    const html = renderPage(shell, { lang: 'sq', head, body: '<h1>Hi</h1>' });
    expect(html).toContain('<html lang="sq"');
    expect(html).toContain('<!--page-body:start--><h1>Hi</h1><!--page-body:end-->');
    expect(html).toContain('hreflang="x-default" href="https://balkanestateai.com/en/guides"');
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  });

  it('builds language-prefixed URLs', () => {
    expect(pageUrl('en', '/')).toBe('https://balkanestateai.com/en');
    expect(pageUrl('mk', '/search')).toBe('https://balkanestateai.com/mk/search');
  });
});

describe('canonicalFor', () => {
  it('adds the language prefix an unprefixed canonical is missing', () => {
    expect(canonicalFor('https://balkanestateai.com/property/abc', 'sq')).toBe('https://balkanestateai.com/sq/property/abc');
  });

  it('keeps an explicit language and drops trailing slashes', () => {
    expect(canonicalFor('/en/guides/albania/', 'sr')).toBe('https://balkanestateai.com/en/guides/albania');
  });

  it('strips the language from a path', () => {
    expect(stripLanguage('/el/agents/12')).toBe('/agents/12');
    expect(stripLanguage('/el')).toBe('/');
  });
});

describe('robots.txt', () => {
  const robots = fs.readFileSync(path.resolve(__dirname, '../../public/robots.txt'), 'utf8');

  it('does not give Googlebot a group of its own that would skip the Disallow rules', () => {
    expect(robots).not.toMatch(/^User-agent:\s*Googlebot\s*$/m);
  });

  it('blocks private areas with and without the language prefix', () => {
    expect(robots).toContain('Disallow: /account');
    expect(robots).toContain('Disallow: /*/account');
  });

  it('lets the AdSense crawler read every page and lists both sitemaps', () => {
    expect(robots).toMatch(/User-agent: Mediapartners-Google\nAllow: \//);
    expect(robots).toContain('Sitemap: https://balkanestateai.com/sitemap.xml');
    expect(robots).toContain('Sitemap: https://balkanestateai.com/sitemap-listings.xml');
  });
});
