/**
 * Cloudflare Pages Function for property OG meta tags
 *
 * Social media crawlers (Facebook, Twitter, LinkedIn, etc.) don't execute JavaScript,
 * so they can't see the React Helmet-injected OG tags. This function intercepts
 * property page requests from crawlers and serves HTML with proper OG meta tags.
 *
 * For normal users, it falls through to the SPA (index.html).
 */

const CRAWLER_USER_AGENTS = [
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

const API_BASE = 'https://api.balkanestateai.com/api';
const SITE_URL = 'https://balkanestateai.com';
const SITE_NAME = 'BalkanEstateAI';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface PropertyData {
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
}

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

function buildOgHtml(property: PropertyData, propertyId: string): string {
  const title = property.title
    || `${property.address || 'Property'}, ${property.city || ''} - €${(property.price || 0).toLocaleString()}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  // Build a rich description with property details
  const parts: string[] = [];
  if (property.beds) parts.push(`${property.beds} bedroom${property.beds > 1 ? 's' : ''}`);
  if (property.baths) parts.push(`${property.baths} bathroom${property.baths > 1 ? 's' : ''}`);
  if (property.propertyType) parts.push(property.propertyType);
  if (property.city && property.country) parts.push(`in ${property.city}, ${property.country}`);
  if (property.sqft) parts.push(`${property.sqft}m²`);
  if (property.price) {
    const listingLabel = property.listingType === 'rent' ? '/month' : '';
    parts.push(`€${property.price.toLocaleString()}${listingLabel}`);
  }

  const description = parts.length > 0
    ? parts.join(' · ') + (property.description ? `. ${property.description.slice(0, 150)}` : '')
    : property.description?.slice(0, 200) || 'Find your dream property in the Balkans with BalkanEstateAI.';

  // Use property's first image, fall back to default OG image
  const image = property.imageUrl || DEFAULT_IMAGE;
  const url = `${SITE_URL}/property/${propertyId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- Redirect to the SPA for actual rendering -->
  <meta http-equiv="refresh" content="0;url=${url}" />
  <link rel="canonical" href="${url}" />
</head>
<body>
  <p>Redirecting to <a href="${url}">${escapeHtml(fullTitle)}</a>...</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequest = async (context: any) => {
  const { request, params } = context;
  const userAgent = request.headers.get('user-agent') || '';

  // Only intercept for social media crawlers
  if (!isCrawler(userAgent)) {
    // Serve the normal SPA for regular users
    return context.env.ASSETS.fetch(request);
  }

  const propertyId = params.id as string;

  try {
    // Fetch property data from backend API
    const response = await fetch(`${API_BASE}/properties/${propertyId}`);

    if (!response.ok) {
      // If property not found, serve default OG tags
      return context.env.ASSETS.fetch(request);
    }

    const data = await response.json() as { data?: PropertyData; property?: PropertyData };
    const property = data.data || data.property || (data as unknown as PropertyData);

    if (!property) {
      return context.env.ASSETS.fetch(request);
    }

    const html = buildOgHtml(property, propertyId);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch {
    // On any error, fall back to serving the SPA
    return context.env.ASSETS.fetch(request);
  }
};
