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
import Article from '../models/Article';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
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

const DEFAULT_OG_IMAGE = `${OG_BASE_URL}/og-image.jpg`;

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
 * Return the canonical property URL segment: just the encoded ID.
 * Matches the frontend's generatePropertySlug() which returns property.id.
 */
function buildPropertySlug(property: PropertyOgProjection): string {
  return encodeId(property._id.toString());
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
  return property.images?.[0]?.url ?? property.imageUrl ?? DEFAULT_OG_IMAGE;
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

// ─── Blog article OG middleware ───────────────────────────────────────────────

function buildArticleOgHtml(
  title: string,
  description: string,
  imageUrl: string,
  canonicalUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="BalkanEstateAI" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="628" />
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

/**
 * Middleware: GET /blog/:slug  and  GET /:lang/blog/:slug
 *
 * Social media bots receive a minimal HTML page with correct og:image for the
 * article's cover photo.  Regular browsers pass through to the SPA catch-all.
 */
export const blogArticleOgMiddleware = async (
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
    const article = await Article.findOne({ slug, status: 'published' })
      .select('title excerpt coverImageUrl slug')
      .lean<{ title: string; excerpt: string; coverImageUrl?: string; slug: string }>();

    if (!article) {
      next();
      return;
    }

    const canonicalUrl = `${OG_BASE_URL}/en/blog/${article.slug}`;
    const imageUrl = article.coverImageUrl ?? DEFAULT_OG_IMAGE;
    const description = (article.excerpt ?? '').slice(0, 300);
    const title = `${article.title} | BalkanEstateAI`;
    const html = buildArticleOgHtml(title, description, imageUrl, canonicalUrl);

    res
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', `public, max-age=${OG_CACHE_MAX_AGE_SECONDS}`)
      .status(200)
      .send(html);
  } catch (error) {
    apiLogger.error('Blog OG middleware error for slug:', slug, error);
    next();
  }
};

// ─── Agent & agency profile OG middleware ─────────────────────────────────────

/**
 * Cloudinary transformation that turns any picture — including a square or
 * portrait profile photo — into the 1200×630 landscape card social networks
 * ask for, without cropping the subject out: the image is scaled to fit and
 * padded onto a white background.
 *
 * Every parameter is core Cloudinary (no add-on or paid-plan feature), so it
 * cannot fail for an account already serving the original URL.
 */
const OG_CARD_TRANSFORM = 'c_pad,w_1200,h_630,b_white,f_jpg,q_auto';

const CLOUDINARY_UPLOAD_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/**
 * An image ready to be advertised as og:image. `sized` says whether we know it
 * really is 1200×630 — only then may we emit og:image:width/height, since
 * dimensions that don't match make Facebook and LinkedIn lay the card out
 * wrong or drop the image entirely.
 */
interface OgImage {
  url: string;
  sized: boolean;
}

/**
 * Is this URL segment an existing Cloudinary transformation (`c_fill,w_200`)
 * rather than a version (`v1699999999`) or a path segment (`avatars/x.jpg`)?
 */
function isTransformSegment(segment: string): boolean {
  if (segment.includes('.')) return false;
  if (/^v\d+$/.test(segment)) return false;
  return /^[a-z]{1,3}_[^/]+$/i.test(segment);
}

/**
 * Append the share-card transformation to a Cloudinary delivery URL, after any
 * transformation the URL already carries so ours is applied last and the
 * result really is 1200×630. Returns null for non-Cloudinary URLs.
 */
function withOgCardTransform(url: string): string | null {
  const match = url.match(CLOUDINARY_UPLOAD_RE);
  if (!match) return null;
  if (url.includes(OG_CARD_TRANSFORM)) return url;

  const [, prefix, rest] = match;
  const segments = rest.split('/');

  let insertAt = 0;
  while (insertAt < segments.length && isTransformSegment(segments[insertAt])) insertAt++;
  segments.splice(insertAt, 0, OG_CARD_TRANSFORM);

  return prefix + segments.join('/');
}

/** Normalize one image candidate, or null if it can't be used as og:image. */
function normalizeOgImage(raw?: string): OgImage | null {
  const url = (raw ?? '').trim();
  if (!url) return null;

  // Inline avatars (DiceBear data URIs) are invisible to crawlers.
  if (url.startsWith('data:')) return null;

  // Site-relative path → absolute; crawlers reject relative og:image values.
  if (url.startsWith('/')) return { url: `${OG_BASE_URL}${url}`, sized: false };

  if (!/^https?:\/\//i.test(url)) return null;

  const card = withOgCardTransform(url);
  if (card) return { url: card, sized: true };

  return { url, sized: false };
}

/** Pick the first usable image, falling back to the site's default OG image. */
function resolveOgImage(...candidates: Array<string | undefined>): OgImage {
  for (const candidate of candidates) {
    const image = normalizeOgImage(candidate);
    if (image) return image;
  }
  return { url: DEFAULT_OG_IMAGE, sized: true };
}

/**
 * Build the crawler HTML for a person/organisation profile.
 *
 * `ogType` is 'profile' for an agent and 'website' for an agency; the image is
 * their profile picture (agent avatar / agency logo).
 */
function buildProfileOgHtml(
  ogType: 'profile' | 'website',
  title: string,
  description: string,
  image: OgImage,
  imageAlt: string,
  canonicalUrl: string,
): string {
  // A picture we couldn't size stays a square thumbnail on Twitter/X; asking
  // for the large card would letterbox it.
  const twitterCard = image.sized ? 'summary_large_image' : 'summary';
  const dimensions = image.sized
    ? `\n  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="BalkanEstateAI" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image.url)}" />${dimensions}
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image.url)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />

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

function sendOgHtml(res: Response, html: string): void {
  res
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', `public, max-age=${OG_CACHE_MAX_AGE_SECONDS}`)
    .status(200)
    .send(html);
}

interface AgentOgProjection {
  agentId?: string;
  bio?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  rating?: number;
  totalReviews?: number;
  activeListings?: number;
  agencyName?: string;
  userId?: { name?: string; avatarUrl?: string; city?: string; country?: string };
  agencyId?: { name?: string; logo?: string; coverImage?: string };
}

/**
 * Middleware: GET /agents/:slug  and  GET /:lang/agents/:slug
 *
 * Social media bots receive a minimal HTML page whose og:image is the agent's
 * own profile picture. Regular browsers pass through to the SPA catch-all.
 */
export const agentPageOgMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userAgent = req.get('user-agent') ?? '';

  if (!isSocialMediaBot(userAgent)) {
    next();
    return;
  }

  const slug = ((req.params.slug as string) ?? '').trim();
  if (!slug) {
    next();
    return;
  }

  try {
    // The URL carries the public agentId; fall back to the ObjectId form.
    const query = isValidObjectId(slug)
      ? { $or: [{ agentId: slug }, { _id: slug }] }
      : { agentId: slug };

    const agent = await Agent.findOne(query)
      .select('agentId bio specializations yearsOfExperience rating totalReviews activeListings agencyName userId agencyId')
      .populate('userId', 'name avatarUrl city country')
      .populate('agencyId', 'name logo coverImage')
      .lean<AgentOgProjection>();

    if (!agent) {
      next();
      return;
    }

    const name = agent.userId?.name?.trim() || 'Real Estate Agent';
    const location = [agent.userId?.city, agent.userId?.country].filter(Boolean).join(', ');
    const agencyName = agent.agencyName || agent.agencyId?.name;

    const title = `${name} – Real Estate Agent${location ? ` in ${location}` : ''} | BalkanEstateAI`;

    const facts = [
      agencyName,
      agent.yearsOfExperience ? `${agent.yearsOfExperience} years of experience` : '',
      agent.activeListings
        ? `${agent.activeListings} active listing${agent.activeListings > 1 ? 's' : ''}`
        : '',
      agent.rating
        ? `${agent.rating.toFixed(1)}★${agent.totalReviews ? ` (${agent.totalReviews} reviews)` : ''}`
        : '',
      (agent.specializations ?? []).slice(0, 3).join(', '),
    ].filter(Boolean).join(' · ');

    const bio = (agent.bio ?? '').replace(/\s+/g, ' ').trim();
    const description = [facts, bio].filter(Boolean).join(' — ').slice(0, 300)
      || `Get in touch with ${name} on BalkanEstateAI.`;

    // The agent's own photo is what makes the link recognisable; the agency's
    // branding only stands in when there is no photo.
    const image = resolveOgImage(
      agent.userId?.avatarUrl,
      agent.agencyId?.logo,
      agent.agencyId?.coverImage,
    );

    const canonicalUrl = `${OG_BASE_URL}/en/agents/${encodeURIComponent(agent.agentId ?? slug)}`;

    sendOgHtml(
      res,
      buildProfileOgHtml('profile', title, description, image, `${name} – profile picture`, canonicalUrl),
    );
  } catch (error) {
    apiLogger.error('Agent OG middleware error for slug:', slug, error);
    next();
  }
};

interface AgencyOgProjection {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  city?: string;
  country?: string;
  totalAgents?: number;
  totalProperties?: number;
}

/**
 * Middleware: GET /agencies/:country/:name, GET /agencies/:slug and their
 * /:lang-prefixed twins.
 *
 * Social media bots receive a minimal HTML page whose og:image is the agency's
 * logo. Regular browsers pass through to the SPA catch-all.
 */
export const agencyPageOgMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userAgent = req.get('user-agent') ?? '';

  if (!isSocialMediaBot(userAgent)) {
    next();
    return;
  }

  // An agency slug is stored as "{country}/{name}", so the URL usually has two
  // segments; older links and id links carry only one.
  const country = ((req.params.country as string) ?? '').trim();
  const nameParam = ((req.params.name as string) ?? '').trim();
  const single = ((req.params.slug as string) ?? '').trim();
  const identifier = country && nameParam ? `${country}/${nameParam}` : single;

  if (!identifier) {
    next();
    return;
  }

  try {
    const select = 'name slug description logo coverImage city country totalAgents totalProperties';
    const slugLower = identifier.toLowerCase();

    let agency = await Agency.findOne({ slug: slugLower })
      .select(select)
      .lean<AgencyOgProjection>();

    // Legacy slug format stored the separator as a comma.
    if (!agency && slugLower.includes('/')) {
      agency = await Agency.findOne({ slug: slugLower.replace('/', ',') })
        .select(select)
        .lean<AgencyOgProjection>();
    }

    if (!agency && isValidObjectId(identifier)) {
      agency = await Agency.findById(identifier).select(select).lean<AgencyOgProjection>();
    }

    if (!agency) {
      next();
      return;
    }

    const name = agency.name?.trim() || 'Real Estate Agency';
    const location = [agency.city, agency.country].filter(Boolean).join(', ');
    const title = `${name} – Real Estate Agency${location ? ` in ${location}` : ''} | BalkanEstateAI`;

    const facts = [
      agency.totalAgents ? `${agency.totalAgents} agent${agency.totalAgents > 1 ? 's' : ''}` : '',
      agency.totalProperties
        ? `${agency.totalProperties} listing${agency.totalProperties > 1 ? 's' : ''}`
        : '',
    ].filter(Boolean).join(' · ');

    const about = (agency.description ?? '').replace(/\s+/g, ' ').trim();
    const description = [facts, about].filter(Boolean).join(' — ').slice(0, 300)
      || `Browse listings from ${name} on BalkanEstateAI.`;

    // The logo is the agency's profile picture and what people recognise in a
    // feed, so it wins over the (usually generic) cover photo.
    const image = resolveOgImage(agency.logo, agency.coverImage);

    const path = (agency.slug ?? identifier)
      .split(/[/,]/)
      .map(encodeURIComponent)
      .join('/');
    const canonicalUrl = `${OG_BASE_URL}/en/agencies/${path}`;

    sendOgHtml(
      res,
      buildProfileOgHtml('website', title, description, image, `${name} logo`, canonicalUrl),
    );
  } catch (error) {
    apiLogger.error('Agency OG middleware error for identifier:', identifier, error);
    next();
  }
};
