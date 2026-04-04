/**
 * Social Media OG Tag Handler
 *
 * Detects social media crawler bots and generates property-specific HTML
 * with Open Graph meta tags so that sharing property links on Facebook,
 * WhatsApp, Telegram, Twitter, LinkedIn, etc. shows the correct preview
 * (property image, title, price, location) instead of the homepage.
 */

import { Request, Response } from 'express';
import Property from '../models/Property';
import { resolveId } from './idObfuscation';
import { isValidObjectId } from './validateParams';

const BASE_URL = process.env.FRONTEND_URL || 'https://balkanestateai.com';

/** User-agent substrings for known social media / link-preview crawlers */
const BOT_UA_PATTERNS = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'discordbot',
  'vkshare',
  'skypeuripreview',
  'pinterest',
  'applebot',
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'ia_archiver',
  'semrushbot',
  'ahrefs',
  'mj12bot',
  'rogerbot',
  'screaming frog',
  'preview',
  'crawler',
  'spider',
];

export function isSocialMediaBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some(pattern => ua.includes(pattern));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatPrice(price: number, currency = 'EUR'): string {
  if (!price || price === 0) return 'Price on request';
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  if (price >= 1_000_000) return `${symbol}${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${symbol}${(price / 1_000).toFixed(0)}K`;
  return `${symbol}${price.toLocaleString()}`;
}

/**
 * Build a minimal HTML page with property-specific Open Graph meta tags.
 * Includes an immediate JS redirect so regular browsers that somehow hit
 * this route are bounced to the SPA immediately.
 */
function buildPropertyOgHtml(property: any, canonicalUrl: string): string {
  const title = property.title
    ? `${property.title} – ${property.city}, ${property.country} | BalkanEstateAI`
    : `${property.bedrooms ? property.bedrooms + '-Bed ' : ''}${property.propertyType || 'Property'} for ${property.listingType === 'rent' ? 'Rent' : 'Sale'} in ${property.city}, ${property.country} | BalkanEstateAI`;

  const price = formatPrice(property.price, property.currency || 'EUR');
  const sqft = property.sqft ? `${property.sqft} m²` : '';
  const beds = property.bedrooms != null ? `${property.bedrooms} bed` : '';
  const baths = property.bathrooms != null ? `${property.bathrooms} bath` : '';
  const details = [beds, baths, sqft].filter(Boolean).join(' · ');

  const description = property.description
    ? property.description.slice(0, 200).replace(/\n/g, ' ')
    : `${details ? details + ' – ' : ''}${price} – ${property.city}, ${property.country}`;

  const imageUrl = property.images?.[0]?.url || `${BASE_URL}/og-image.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="BalkanEstateAI" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:locale" content="en_US" />

  <!-- Product-specific OG -->
  <meta property="product:price:amount" content="${property.price || 0}" />
  <meta property="product:price:currency" content="${property.currency || 'EUR'}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

  <!-- Canonical -->
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(title)}</a>…</p>
</body>
</html>`;
}

/**
 * Express route handler for property pages.
 * Only responds to social media bots – passes through otherwise.
 * Handles both /property/:slug and /:lang/property/:slug URL patterns.
 */
export async function propertyOgHandler(req: Request, res: Response, next: () => void): Promise<void> {
  const userAgent = req.get('user-agent') || '';
  if (!isSocialMediaBot(userAgent)) {
    return next();
  }

  try {
    // Support both /property/:slug and /:lang/property/:slug
    const rawSlug = req.params.slug || req.params[0];
    const slug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug || '').trim();
    if (!slug) return next();

    // Resolve slug/encoded-id to a MongoDB ObjectId
    const resolvedId = resolveId(slug);
    if (!resolvedId || !isValidObjectId(resolvedId)) return next();

    const property = await Property.findById(resolvedId)
      .select('title price currency listingType propertyType bedrooms bathrooms sqft city country description images slug')
      .lean();

    if (!property) return next();

    const propertySlug = (property as any).slug || slug;
    const canonicalUrl = `${BASE_URL}/en/property/${propertySlug}`;
    const html = buildPropertyOgHtml(property, canonicalUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache for bot responses
    res.status(200).send(html);
  } catch {
    next();
  }
}
