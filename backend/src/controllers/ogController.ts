/**
 * OG Controller
 *
 * Handles GET /api/og/property/:slug — the URL the share button sends to
 * social media platforms.  Because /api/* is always proxied nginx → Express,
 * this endpoint is guaranteed to be reached by crawlers, whereas plain
 * /property/:slug routes are served from the static dist/ folder by nginx.
 *
 * Behaviour by caller type:
 *   Social media bot  → 200 HTML with property-specific OG meta tags
 *                       (first property photo, title, price, bed/bath/sqft)
 *   Regular browser   → 302 redirect to the real property page
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Property, { IProperty } from '../models/Property';
import { resolveId, encodeId } from '../utils/idObfuscation';
import { isValidObjectId } from '../utils/validateParams';
import { apiLogger } from '../utils/logger';
import {
  OG_BASE_URL,
  SUPPORTED_LANG_CODES,
  BOT_UA_PATTERNS,
  OG_CACHE_MAX_AGE_SECONDS,
  type SupportedLangCode,
} from '../config/ogConstants';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal property projection used for OG tag generation. */
type PropertyOgProjection = Pick<
  IProperty,
  | 'title'
  | 'price'
  | 'listingType'
  | 'propertyType'
  | 'beds'
  | 'baths'
  | 'sqft'
  | 'city'
  | 'country'
  | 'description'
  | 'imageUrl'
  | 'images'
  | 'isNegotiable'
> & { _id: Types.ObjectId };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSocialMediaBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some(pattern => ua.includes(pattern));
}

function detectLanguage(acceptLanguage: string): SupportedLangCode {
  const code = acceptLanguage.slice(0, 2).toLowerCase();
  return (SUPPORTED_LANG_CODES as readonly string[]).includes(code)
    ? (code as SupportedLangCode)
    : 'en';
}

/**
 * Reconstruct the canonical SEO slug using the same algorithm as the
 * frontend's generatePropertySlug() in utils/slug.ts.
 * Format: "{n}-bed-{type}-for-{sale|rent}-in-{city}-{country}_{encodedId}"
 */
function buildPropertySlug(property: PropertyOgProjection): string {
  const parts: string[] = [];

  if (property.beds > 0) parts.push(`${property.beds}-bed`);
  parts.push(property.propertyType);
  parts.push(property.listingType === 'rent' ? 'for-rent' : 'for-sale');
  parts.push('in', property.city, property.country);

  const slugText = parts
    .join(' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slugText}_${encodeId(property._id.toString())}`;
}

function formatPrice(price: number, isNegotiable = false): string {
  if (isNegotiable || price === 0) return 'Price on request';
  if (price >= 1_000_000) return `€${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `€${Math.round(price / 1_000)}K`;
  return `€${price.toLocaleString('en-US')}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildOgTitle(property: PropertyOgProjection): string {
  if (property.title) {
    return `${property.title} – ${property.city}, ${property.country} | BalkanEstateAI`;
  }

  const bedsPrefix = property.beds > 0 ? `${property.beds}-Bed ` : '';
  const typeLabel =
    property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1);
  const action = property.listingType === 'rent' ? 'for Rent' : 'for Sale';

  return `${bedsPrefix}${typeLabel} ${action} in ${property.city}, ${property.country} | BalkanEstateAI`;
}

function buildOgDescription(property: PropertyOgProjection): string {
  const price = formatPrice(property.price, property.isNegotiable);
  const details = [
    property.beds > 0 ? `${property.beds} bed` : '',
    property.baths > 0 ? `${property.baths} bath` : '',
    property.sqft > 0 ? `${property.sqft} m²` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const excerpt = property.description
    .slice(0, 160)
    .replace(/\n/g, ' ')
    .trim();

  return [price, details, excerpt].filter(Boolean).join(' – ').slice(0, 300);
}

function getOgImageUrl(property: Pick<PropertyOgProjection, 'imageUrl' | 'images'>): string {
  return property.images?.[0]?.url ?? property.imageUrl ?? `${OG_BASE_URL}/og-image.png`;
}

/**
 * Build the minimal HTML page returned to social media crawlers.
 * Contains all required OG / Twitter Card meta tags plus an immediate
 * JS redirect so any regular browser that lands here goes straight to
 * the real property page.
 */
function buildOgHtml(
  property: PropertyOgProjection,
  canonicalUrl: string,
): string {
  const title = buildOgTitle(property);
  const description = buildOgDescription(property);
  const imageUrl = getOgImageUrl(property);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="BalkanEstateAI" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <noscript>
    <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(title)}</a></p>
  </noscript>
</body>
</html>`;
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

const PROPERTY_OG_SELECT =
  'title price isNegotiable listingType propertyType beds baths sqft city country description imageUrl images' as const;

async function fetchPropertyForOg(
  slug: string,
): Promise<PropertyOgProjection | null> {
  const resolvedId = resolveId(slug);
  if (!resolvedId || !isValidObjectId(resolvedId)) return null;

  return Property.findById(resolvedId)
    .select(PROPERTY_OG_SELECT)
    .lean<PropertyOgProjection>();
}

// ─── Route handlers ───────────────────────────────────────────────────────────

/**
 * GET /api/og/property/:slug
 *
 * Primary share endpoint.  /api/* is always proxied nginx → Express, so
 * this is guaranteed to be reached even when nginx serves frontend routes
 * from static files.
 */
export const ogShareHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const slug = req.params.slug as string;

  try {
    const userAgent = req.get('user-agent') ?? '';

    if (!isSocialMediaBot(userAgent)) {
      const lang = detectLanguage(req.get('accept-language') ?? 'en');
      res.redirect(302, `${OG_BASE_URL}/${lang}/property/${slug}`);
      return;
    }

    const property = await fetchPropertyForOg(slug);

    if (!property) {
      res.redirect(302, OG_BASE_URL);
      return;
    }

    const canonicalUrl = `${OG_BASE_URL}/en/property/${buildPropertySlug(property)}`;
    const html = buildOgHtml(property, canonicalUrl);

    res
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', `public, max-age=${OG_CACHE_MAX_AGE_SECONDS}`)
      .status(200)
      .send(html);
  } catch (error) {
    apiLogger.error('OG share handler error for slug:', slug, error);
    res.redirect(302, `${OG_BASE_URL}/en/property/${slug}`);
  }
};

/**
 * Middleware: GET /property/:slug  and  GET /:lang/property/:slug
 *
 * Fallback OG handler for deployments where Express also serves the frontend
 * (single-container or nginx-proxy-all setups).  Bots receive OG HTML;
 * regular browsers pass through to the SPA catch-all.
 */
export const propertyPageOgMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userAgent = req.get('user-agent') ?? '';

  if (!isSocialMediaBot(userAgent)) {
    next();
    return;
  }

  const slug = (req.params.slug as string ?? '').trim();
  if (!slug) {
    next();
    return;
  }

  try {
    const property = await fetchPropertyForOg(slug);

    if (!property) {
      next();
      return;
    }

    const canonicalUrl = `${OG_BASE_URL}/en/property/${buildPropertySlug(property)}`;
    const html = buildOgHtml(property, canonicalUrl);

    res
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', `public, max-age=${OG_CACHE_MAX_AGE_SECONDS}`)
      .status(200)
      .send(html);
  } catch (error) {
    apiLogger.error('OG middleware error for slug:', slug, error);
    next();
  }
};
