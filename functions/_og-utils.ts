/**
 * Shared OG (Open Graph) utilities for Cloudflare Pages Functions.
 *
 * Used by the /property/[id], /blog/[slug], /agents/[slug] and
 * /agencies/[country]/[name] route handlers (plus their /[lang]-prefixed
 * twins) to generate rich link previews for social media crawlers.
 */

export const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Pinterestbot',
  'vkShare',
  'Viber',
  'Snapchat',
  'redditbot',
];

export const API_BASE = 'https://api.balkanestateai.com/api';
export const SITE_URL = 'https://balkanestateai.com';
export const SITE_NAME = 'BalkanEstateAI';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

export interface PropertyData {
  _id: string;
  title?: string;
  address?: string;
  city?: string;
  country?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  description?: string;
  imageUrl?: string;
  images?: Array<{ url: string; tag?: string }>;
  listingType?: string;
  isNegotiable?: boolean;
}

export function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Profile picture → share card image ───────────────────────────────────────

/**
 * An image ready to be advertised as og:image.
 *
 * `sized` says whether we know the image really is 1200×630. Only then may we
 * emit og:image:width/height — declaring dimensions that don't match makes
 * Facebook and LinkedIn lay the card out wrong (or drop the image entirely).
 */
export interface OgImage {
  url: string;
  sized: boolean;
}

/**
 * Cloudinary transformation that turns any picture — including a square or
 * portrait profile photo — into the 1200×630 landscape card the social
 * networks ask for, without cropping the subject out: the image is scaled to
 * fit and padded onto a white background.
 *
 * Every parameter here is core Cloudinary (no add-on or paid-plan feature), so
 * it cannot fail for an account that is already serving the original URL.
 */
export const OG_CARD_TRANSFORM = 'c_pad,w_1200,h_630,b_white,f_jpg,q_auto';

const CLOUDINARY_UPLOAD_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

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
export function withOgCardTransform(url: string): string | null {
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
  const url = (raw || '').trim();
  if (!url) return null;

  // Inline avatars (DiceBear data URIs) are invisible to crawlers.
  if (url.startsWith('data:')) return null;

  // Site-relative path → absolute; crawlers reject relative og:image values.
  if (url.startsWith('/')) return { url: `${SITE_URL}${url}`, sized: false };

  if (!/^https?:\/\//i.test(url)) return null;

  const card = withOgCardTransform(url);
  if (card) return { url: card, sized: true };

  return { url, sized: false };
}

/**
 * Pick the first usable image from a priority list, falling back to the site's
 * default OG image.
 */
export function resolveOgImage(...candidates: Array<string | undefined>): OgImage {
  for (const candidate of candidates) {
    const image = normalizeOgImage(candidate);
    if (image) return image;
  }
  return { url: DEFAULT_IMAGE, sized: true };
}

/**
 * The image meta tags shared by every card type.
 * `alt` describes the picture for screen readers on the social platforms.
 */
function imageMetaTags(image: OgImage, alt: string): string {
  const dimensions = image.sized
    ? `\n  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />`
    : '';

  return `<meta property="og:image" content="${escapeHtml(image.url)}" />${dimensions}
  <meta property="og:image:alt" content="${escapeHtml(alt)}" />`;
}

/**
 * A profile picture we couldn't size stays a square thumbnail on Twitter/X;
 * asking for the large card would letterbox it.
 */
function twitterCardType(image: OgImage): string {
  return image.sized ? 'summary_large_image' : 'summary';
}

/**
 * Get the best available property image.
 * Priority: first image from images array > imageUrl > default OG image.
 */
export function getPropertyImage(property: PropertyData): string {
  return property.images?.[0]?.url || property.imageUrl || DEFAULT_IMAGE;
}

function formatPrice(price: number, listingType?: string, isNegotiable?: boolean): string {
  if (isNegotiable || price === 0) return 'Price on request';
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (price >= 1_000_000) return `€${(price / 1_000_000).toFixed(1)}M${suffix}`;
  if (price >= 1_000) return `€${Math.round(price / 1_000).toLocaleString('en-US')}K${suffix}`;
  return `€${price.toLocaleString('en-US')}${suffix}`;
}

export function buildOgHtml(property: PropertyData, slug: string, lang = 'en'): string {
  // Build a compelling title
  const bedsPrefix = property.beds && property.beds > 0 ? `${property.beds}-Bed ` : '';
  const typeLabel = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : 'Property';
  const action = property.listingType === 'rent' ? 'for Rent' : 'for Sale';
  const location = [property.city, property.country].filter(Boolean).join(', ');

  const title = property.title
    ? `${property.title} – ${location}`
    : `${bedsPrefix}${typeLabel} ${action} in ${location}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  // Build a rich, enticing description
  const price = property.price
    ? formatPrice(property.price, property.listingType, property.isNegotiable)
    : '';
  const details = [
    property.beds ? `${property.beds} bed${property.beds > 1 ? 's' : ''}` : '',
    property.baths ? `${property.baths} bath${property.baths > 1 ? 's' : ''}` : '',
    property.sqft ? `${property.sqft} m²` : '',
  ].filter(Boolean).join(' · ');

  const excerpt = property.description
    ? property.description.slice(0, 160).replace(/\n/g, ' ').trim()
    : '';

  const description = [price, details, excerpt].filter(Boolean).join(' – ').slice(0, 300)
    || 'Find your dream property in the Balkans with BalkanEstateAI.';

  // Use the actual property photo, not the default
  const image = getPropertyImage(property);

  const canonicalUrl = `${SITE_URL}/${lang}/property/${slug}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:locale" content="en_US" />
  ${property.price ? `<meta property="product:price:amount" content="${property.price}" />
  <meta property="product:price:currency" content="EUR" />` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <noscript>
    <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(fullTitle)}</a></p>
  </noscript>
</body>
</html>`;
}

// ─── Blog article OG ──────────────────────────────────────────────────────────

export interface ArticleData {
  title?: string;
  excerpt?: string;
  coverImageUrl?: string;
  slug?: string;
  publishedAt?: string;
  tags?: string[];
}

/**
 * Get the best available article image.
 * Priority: article cover image > default OG image.
 */
export function getArticleImage(article: ArticleData): string {
  return article.coverImageUrl || DEFAULT_IMAGE;
}

export function buildArticleOgHtml(article: ArticleData, slug: string, lang = 'en'): string {
  const title = article.title ? `${article.title} | ${SITE_NAME}` : SITE_NAME;
  const description = (article.excerpt || '')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 300)
    || 'Read the latest property insights from the Balkans on BalkanEstateAI.';
  const image = getArticleImage(article);
  const canonicalUrl = `${SITE_URL}/${lang}/blog/${slug}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="628" />
  <meta property="og:image:alt" content="${escapeHtml(article.title || SITE_NAME)}" />
  <meta property="og:locale" content="en_US" />
  ${article.publishedAt ? `<meta property="article:published_time" content="${escapeHtml(article.publishedAt)}" />` : ''}
  ${(article.tags || []).map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}" />`).join('\n  ')}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(article.title || SITE_NAME)}" />

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
 * Fetch article data from the backend API and return OG HTML response.
 * Shared handler used by both blog route functions.
 */
export async function handleArticleOgRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  slug: string,
  lang = 'en',
): Promise<Response> {
  const userAgent = context.request.headers.get('user-agent') || '';

  // Only intercept for social media crawlers
  if (!isCrawler(userAgent)) {
    return context.env.ASSETS.fetch(context.request);
  }

  try {
    const response = await fetch(`${API_BASE}/articles/${slug}`);

    if (!response.ok) {
      return context.env.ASSETS.fetch(context.request);
    }

    const data = await response.json() as { article?: ArticleData; data?: ArticleData };
    const article = data.article || data.data || (data as unknown as ArticleData);

    if (!article || !article.title) {
      return context.env.ASSETS.fetch(context.request);
    }

    const html = buildArticleOgHtml(article, slug, lang);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return context.env.ASSETS.fetch(context.request);
  }
}

// ─── Agent profile OG ─────────────────────────────────────────────────────────

export interface AgentData {
  agentId?: string;
  bio?: string;
  specializations?: string[];
  serviceAreas?: string[];
  yearsOfExperience?: number;
  rating?: number;
  totalReviews?: number;
  activeListings?: number;
  totalSales?: number;
  agencyName?: string;
  /** Populated by the API: the user account behind the agent profile. */
  userId?: {
    name?: string;
    avatarUrl?: string;
    city?: string;
    country?: string;
  };
  /** Populated by the API: the agency the agent belongs to. */
  agencyId?: {
    name?: string;
    logo?: string;
    coverImage?: string;
  };
}

/**
 * The agent's own profile picture is what makes the shared link recognisable,
 * so it wins; the agency's branding only stands in when there is no photo.
 */
export function getAgentImage(agent: AgentData): OgImage {
  return resolveOgImage(
    agent.userId?.avatarUrl,
    agent.agencyId?.logo,
    agent.agencyId?.coverImage,
  );
}

export function buildAgentOgHtml(agent: AgentData, slug: string, lang = 'en'): string {
  const name = agent.userId?.name?.trim() || 'Real Estate Agent';
  const location = [agent.userId?.city, agent.userId?.country].filter(Boolean).join(', ');
  const agencyName = agent.agencyName || agent.agencyId?.name;

  const title = location ? `${name} – Real Estate Agent in ${location}` : `${name} – Real Estate Agent`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const facts = [
    agencyName,
    agent.yearsOfExperience ? `${agent.yearsOfExperience} years of experience` : '',
    agent.activeListings ? `${agent.activeListings} active listing${agent.activeListings > 1 ? 's' : ''}` : '',
    agent.rating
      ? `${agent.rating.toFixed(1)}★${agent.totalReviews ? ` (${agent.totalReviews} reviews)` : ''}`
      : '',
    (agent.specializations || []).slice(0, 3).join(', '),
  ].filter(Boolean).join(' · ');

  const bio = (agent.bio || '').replace(/\s+/g, ' ').trim();

  const description = [facts, bio].filter(Boolean).join(' — ').slice(0, 300)
    || `Get in touch with ${name} on ${SITE_NAME}.`;

  const image = getAgentImage(agent);
  const canonicalUrl = `${SITE_URL}/${lang}/agents/${encodeURIComponent(slug)}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${imageMetaTags(image, `${name} – profile picture`)}
  <meta property="og:locale" content="en_US" />
  ${agent.agentId ? `<meta property="profile:username" content="${escapeHtml(agent.agentId)}" />` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCardType(image)}" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image.url)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(`${name} – profile picture`)}" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <noscript>
    <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(fullTitle)}</a></p>
  </noscript>
</body>
</html>`;
}

// ─── Agency profile OG ────────────────────────────────────────────────────────

export interface AgencyData {
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
 * The logo is an agency's profile picture and the thing people recognise in a
 * feed, so it wins over the (usually generic) cover photo.
 */
export function getAgencyImage(agency: AgencyData): OgImage {
  return resolveOgImage(agency.logo, agency.coverImage);
}

export function buildAgencyOgHtml(agency: AgencyData, slug: string, lang = 'en'): string {
  const name = agency.name?.trim() || 'Real Estate Agency';
  const location = [agency.city, agency.country].filter(Boolean).join(', ');

  const title = location ? `${name} – Real Estate Agency in ${location}` : `${name} – Real Estate Agency`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const facts = [
    agency.totalAgents ? `${agency.totalAgents} agent${agency.totalAgents > 1 ? 's' : ''}` : '',
    agency.totalProperties ? `${agency.totalProperties} listing${agency.totalProperties > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const about = (agency.description || '').replace(/\s+/g, ' ').trim();

  const description = [facts, about].filter(Boolean).join(' — ').slice(0, 300)
    || `Browse listings from ${name} on ${SITE_NAME}.`;

  const image = getAgencyImage(agency);
  const path = slug.split('/').map(encodeURIComponent).join('/');
  const canonicalUrl = `${SITE_URL}/${lang}/agencies/${path}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  ${imageMetaTags(image, `${name} logo`)}
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCardType(image)}" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image.url)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(`${name} logo`)}" />

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <noscript>
    <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(fullTitle)}</a></p>
  </noscript>
</body>
</html>`;
}

/**
 * Fetch agent data from the backend API and return OG HTML response.
 * Shared handler used by /agents/[slug] and /[lang]/agents/[slug].
 */
export async function handleAgentOgRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  slug: string,
  lang = 'en',
): Promise<Response> {
  const userAgent = context.request.headers.get('user-agent') || '';

  // Only intercept for social media crawlers
  if (!isCrawler(userAgent)) {
    return context.env.ASSETS.fetch(context.request);
  }

  try {
    const response = await fetch(`${API_BASE}/agents/${encodeURIComponent(slug)}`);

    if (!response.ok) {
      return context.env.ASSETS.fetch(context.request);
    }

    const data = await response.json() as { agent?: AgentData; data?: AgentData };
    const agent = data.agent || data.data;

    if (!agent) {
      return context.env.ASSETS.fetch(context.request);
    }

    return new Response(buildAgentOgHtml(agent, slug, lang), {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return context.env.ASSETS.fetch(context.request);
  }
}

/**
 * Fetch agency data from the backend API and return OG HTML response.
 *
 * `slug` is the agency's URL identifier — either the two-segment
 * "albania/erikson-real-estate" form or a single-segment slug / id.
 */
export async function handleAgencyOgRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  slug: string,
  lang = 'en',
): Promise<Response> {
  const userAgent = context.request.headers.get('user-agent') || '';

  // Only intercept for social media crawlers
  if (!isCrawler(userAgent)) {
    return context.env.ASSETS.fetch(context.request);
  }

  try {
    const path = slug.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${API_BASE}/agencies/${path}`);

    if (!response.ok) {
      return context.env.ASSETS.fetch(context.request);
    }

    const data = await response.json() as { agency?: AgencyData; data?: AgencyData };
    const agency = data.agency || data.data;

    if (!agency || !agency.name) {
      return context.env.ASSETS.fetch(context.request);
    }

    return new Response(buildAgencyOgHtml(agency, slug, lang), {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return context.env.ASSETS.fetch(context.request);
  }
}

/**
 * Fetch property data from the backend API and return OG HTML response.
 * Shared handler used by both route functions.
 */
export async function handlePropertyOgRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  slug: string,
  lang = 'en',
): Promise<Response> {
  const userAgent = context.request.headers.get('user-agent') || '';

  // Only intercept for social media crawlers
  if (!isCrawler(userAgent)) {
    return context.env.ASSETS.fetch(context.request);
  }

  try {
    const response = await fetch(`${API_BASE}/properties/${slug}`);

    if (!response.ok) {
      return context.env.ASSETS.fetch(context.request);
    }

    const data = await response.json() as { data?: PropertyData; property?: PropertyData };
    const property = data.data || data.property || (data as unknown as PropertyData);

    if (!property) {
      return context.env.ASSETS.fetch(context.request);
    }

    const html = buildOgHtml(property, slug, lang);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return context.env.ASSETS.fetch(context.request);
  }
}
