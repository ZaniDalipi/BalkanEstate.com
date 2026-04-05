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
import { resolveId, encodeId } from './idObfuscation';
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

/**
 * Build the same SEO slug the frontend generates:
 * "{n}-bed-{type}-for-{sale|rent}-in-{city}-{country}_{encodedId}"
 */
function buildPropertySlug(property: any): string {
  const parts: string[] = [];
  if (property.beds && property.beds > 0) parts.push(`${property.beds}-bed`);
  if (property.propertyType) parts.push(property.propertyType);
  parts.push(property.listingType === 'rent' ? 'for-rent' : 'for-sale');
  if (property.city) { parts.push('in'); parts.push(property.city); }
  if (property.country) parts.push(property.country);

  const slugText = parts.join(' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

  const encodedId = encodeId(String(property._id));
  return `${slugText}_${encodedId}`;
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
 * Fetch a property by slug and return OG-enriched HTML.
 * Used by both route handlers below.
 */
async function servePropertyOgHtml(slug: string, res: Response, next: () => void): Promise<void> {
  const resolvedId = resolveId(slug);
  if (!resolvedId || !isValidObjectId(resolvedId)) return next();

  // Cast to any: we only need a handful of fields and the lean() type is too strict
  const p: any = await Property.findById(resolvedId)
    .select('title price currency listingType propertyType beds baths sqft city country description images')
    .lean();

  if (!p) return next();

  const action = p.listingType === 'rent' ? 'for Rent' : 'for Sale';
  const typeLabel = (p.propertyType || 'property').charAt(0).toUpperCase() + (p.propertyType || 'property').slice(1);
  const bedsLabel = p.beds && p.beds > 0 ? `${p.beds}-Bed ` : '';

  const title = p.title
    ? `${p.title} – ${p.city}, ${p.country} | BalkanEstateAI`
    : `${bedsLabel}${typeLabel} ${action} in ${p.city}, ${p.country} | BalkanEstateAI`;

  const price = formatPrice(p.price, p.currency || 'EUR');
  const sqft = p.sqft ? `${p.sqft} m²` : '';
  const beds = p.beds != null ? `${p.beds} bed` : '';
  const baths = p.baths != null ? `${p.baths} bath` : '';
  const details = [beds, baths, sqft].filter(Boolean).join(' · ');

  const descriptionText = p.description
    ? p.description.slice(0, 160).replace(/\n/g, ' ').trim()
    : '';
  const description = [price, details, descriptionText].filter(Boolean).join(' – ').slice(0, 300);

  // Use the first property image; fall back to the generic OG image
  const imageUrl = p.images?.[0]?.url || `${BASE_URL}/og-image.png`;

  const propertySlug = buildPropertySlug(p);
  const canonicalUrl = `${BASE_URL}/en/property/${propertySlug}`;

  const html = `<!DOCTYPE html>
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
  <meta property="product:price:amount" content="${p.price || 0}" />
  <meta property="product:price:currency" content="${p.currency || 'EUR'}" />

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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(html);
}

// ─── Route handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/og/property/:slug  (primary share endpoint)
 *
 * This is the URL the share button puts in the message.
 * Because /api/* is always proxied nginx → Express, this endpoint is
 * guaranteed to be reached by social media crawlers even when nginx
 * serves frontend routes from static files.
 *
 *  - Social media bots  → 200 OG HTML  (property photo, title, price)
 *  - Regular browsers   → 302 redirect to the real /en/property/:slug page
 */
export async function propertyOgShareHandler(req: Request, res: Response, next: () => void): Promise<void> {
  try {
    const rawSlug = req.params.slug;
    const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug || '').trim();
    if (!slug) return next();

    const userAgent = req.get('user-agent') || '';

    if (!isSocialMediaBot(userAgent)) {
      // Regular browser: redirect to the real property page using the visitor's language
      const acceptLang = (req.get('accept-language') || 'en').slice(0, 2).toLowerCase();
      const supported = ['en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el'];
      const lang = supported.includes(acceptLang) ? acceptLang : 'en';
      res.redirect(302, `${BASE_URL}/${lang}/property/${slug}`);
      return;
    }

    await servePropertyOgHtml(slug, res, next);
  } catch {
    next();
  }
}

/**
 * GET /property/:slug  and  GET /:lang/property/:slug  (fallback OG handler)
 *
 * Only fires when the Express server is also serving the frontend
 * (i.e. single-container deployment or nginx proxying everything to Express).
 * Regular browsers get passed through to the SPA catch-all; bots get OG HTML.
 */
export async function propertyOgHandler(req: Request, res: Response, next: () => void): Promise<void> {
  const userAgent = req.get('user-agent') || '';
  if (!isSocialMediaBot(userAgent)) return next();

  try {
    const rawSlug = req.params.slug || req.params[0];
    const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug || '').trim();
    if (!slug) return next();

    await servePropertyOgHtml(slug, res, next);
  } catch {
    next();
  }
}
