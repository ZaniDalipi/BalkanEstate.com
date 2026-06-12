/**
 * Shared OG (Open Graph) utilities for Cloudflare Pages Functions.
 *
 * Used by both /property/[id] and /[lang]/property/[id] route handlers
 * to generate rich link previews for social media crawlers.
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
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

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
