/**
 * Server-rendered head and content for detail pages, shared by the Cloudflare
 * Pages Functions for /property/:id, /blog/:slug, /agents/:slug and
 * /agencies/:country/:name (plus their /:lang-prefixed twins).
 *
 * Why this exists: the app is a client-rendered SPA, so the HTML a crawler
 * downloads for a listing is the same empty shell for every URL. For crawlers
 * (search engines, Google's ad crawler, social link previews, AI search) these
 * functions fetch the record from the API and return the SPA shell with:
 *
 *  - the page's real title, description, canonical, hreflang, Open Graph and
 *    JSON-LD in <head>, and
 *  - the page's actual content (facts, description, photos, links) inside
 *    #root, which React replaces on mount.
 *
 * It is the same document a person gets — the shell plus the app — with the
 * content that the app would render filled in up front, and the right status
 * code: 404 for a listing or profile that does not exist.
 *
 * This replaced an older handler that answered every crawler (Googlebot
 * included) with an empty page holding only a meta-refresh and a JavaScript
 * redirect to the language-prefixed URL. On the prefixed URL that redirect
 * pointed at itself, so search engines saw listings, articles and profiles as
 * empty pages in a redirect loop.
 *
 * Ordinary visitors are passed straight to the static SPA, so the API call
 * (which also counts a listing view) never slows down or skews a human visit.
 */

import { optimizeImageUrl, MEDIA_CDN_URL } from '../config/mediaConfig';
import { isCloudinaryPhotoUrl } from '../config/legacyCloudinary';
import { parseMediaUrl, mediaFileUrl, MEDIA_MASTER_FILE } from '../backend/src/config/mediaVariants';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_IMAGE,
  ROBOTS_INDEX,
  ROBOTS_NOINDEX,
  buildHead,
  renderPage,
  escapeHtml,
  pageUrl,
  plainText,
  truncate,
} from '../scripts/lib/page-shell.mjs';

export { escapeHtml, DEFAULT_IMAGE, SITE_URL, SITE_NAME };
export const CRAWLER_USER_AGENTS = [
  // Search engines and Google's own crawlers (incl. the AdSense crawler)
  'Googlebot',
  'Google-InspectionTool',
  'GoogleOther',
  'Mediapartners-Google',
  'AdsBot-Google',
  'Storebot-Google',
  'bingbot',
  'DuckDuckBot',
  'YandexBot',
  'Applebot',
  'Baiduspider',
  // AI search
  'OAI-SearchBot',
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  // Link previews
  'facebookexternalhit',
  'Facebot',
  // Meta's newer fetchers: meta-externalfetcher fetches a link a person shares
  // (the Facebook/Instagram/Threads composer preview), meta-externalagent
  // crawls. Without them the preview falls back to the generic site card.
  'meta-externalfetcher',
  'meta-externalagent',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Pinterestbot',
  'vkShare',
  'Viber',
  'Snapchat',
  'redditbot',
];

export const API_BASE = 'https://api.balkanestateai.com/api';

export function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

// ─── Request plumbing ─────────────────────────────────────────────────────────

/** The slice of the Cloudflare Pages Function context these handlers use. */
export interface PagesContext {
  request: Request;
  env: {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    /**
     * Public origin of the R2 media bucket (same value as the backend's
     * R2_PUBLIC_URL). Set it in Cloudflare → Pages → Settings → Variables:
     * Pages Functions don't see the Vite build's VITE_MEDIA_CDN_URL.
     */
    MEDIA_CDN_URL?: string;
  };
}

/** Media origin for this deployment; set from the Pages env by each handler. */
let mediaCdnUrl = MEDIA_CDN_URL;

/** Read the media origin from the Pages Function env (constant per deployment). */
export function configureOgMedia(env: { MEDIA_CDN_URL?: string } | undefined): void {
  const fromEnv = env?.MEDIA_CDN_URL?.trim().replace(/\/+$/, '');
  if (fromEnv) mediaCdnUrl = fromEnv;
}

/**
 * The JPEG master (`original.jpg`, ≤1920px) of a photo on our R2 media CDN —
 * what link previews advertise (crawlers want JPEG and crop it themselves) —
 * or null for anything else.
 */
export function mediaOgCardUrl(url: string | undefined): string | null {
  const media = parseMediaUrl(url, mediaCdnUrl);
  return media ? mediaFileUrl(mediaCdnUrl, media.photoKey, MEDIA_MASTER_FILE) : null;
}

/**
 * Longest URL identifier we'll look up. Comfortably above any real agent id or
 * agency slug, and short enough that a junk path never reaches the API.
 */
const MAX_SLUG_LENGTH = 128;

/**
 * Reject identifiers that cannot name a record before spending an API call:
 * over-long input, control characters, and the `.`/`..` segments that would
 * otherwise be pasted into the API path verbatim.
 */
export function isUsableSlug(slug: string): boolean {
  if (!slug || slug.length > MAX_SLUG_LENGTH) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(slug)) return false;
  return slug.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}

/** Percent-encode each segment while keeping the `/` between them. */
export function encodeSlugPath(slug: string): string {
  return slug.split('/').map(encodeURIComponent).join('/');
}

/**
 * Crawlers give up after a few seconds and cache whatever they got, so a slow
 * API must fail fast enough for us to fall back to the SPA while they're still
 * listening.
 */
const API_TIMEOUT_MS = 4000;

type ApiResult<T> = { status: 'ok'; data: T } | { status: 'not-found' } | { status: 'error' };

async function fetchApi<T>(url: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      headers: {
        accept: 'application/json',
        // Lets the API leave this request out of listing view counts.
        'x-be-prerender': '1',
      },
    });
    // 400 is what the API answers for an id that cannot exist (malformed).
    if (response.status === 400 || response.status === 404 || response.status === 410) return { status: 'not-found' };
    if (!response.ok) return { status: 'error' };
    return { status: 'ok', data: (await response.json()) as T };
  } catch {
    return { status: 'error' };
  }
}

/** The plain SPA, untouched — what humans get, and the fallback on any error. */
function passThrough(context: PagesContext): Promise<Response> {
  return context.env.ASSETS.fetch(context.request);
}

/**
 * Minimal shell for unit tests and for the unlikely case the deployed
 * index.html cannot be read. Same markers as index.html.
 */
const FALLBACK_SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!--page-head:start--><title>${SITE_NAME}</title><!--page-head:end-->
</head>
<body>
  <div id="root"><!--page-body:start--><!--page-body:end--></div>
</body>
</html>`;

/** The deployed SPA shell (dist/index.html), with its page-head/page-body markers. */
async function loadShell(context: PagesContext): Promise<string | null> {
  try {
    const url = new URL('/', context.request.url).toString();
    const response = await context.env.ASSETS.fetch(new Request(url, { headers: { accept: 'text/html' } }));
    if (!response.ok) return null;
    const html = await response.text();
    return html.includes('<!--page-head:start-->') ? html : null;
  } catch {
    return null;
  }
}

export interface RenderedPage {
  lang: string;
  head: string;
  body: string;
  status?: number;
}

async function respond(context: PagesContext, page: RenderedPage): Promise<Response> {
  const shell = (await loadShell(context)) ?? FALLBACK_SHELL;
  return new Response(renderPage(shell, page), {
    status: page.status ?? 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': page.status && page.status >= 400 ? 'no-store' : 'public, max-age=3600',
      Vary: 'User-Agent',
    },
  });
}

// ─── Shared HTML fragments ────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  en: 'Home', sq: 'Kryefaqja', sr: 'Početna', bg: 'Начало', hr: 'Početna',
  bs: 'Početna', mk: 'Почетна', me: 'Početna', ro: 'Acasă', el: 'Αρχική',
};

function link(lang: string, path: string, text: string, rel?: string): string {
  return `<a href="${escapeHtml(pageUrl(lang, path))}"${rel ? ` rel="${rel}"` : ''}>${escapeHtml(text)}</a>`;
}

/** Paragraphs from user-written text: blank lines split paragraphs, tags removed. */
function paragraphs(text: string | undefined, maxChars = 6000): string {
  const clean = String(text ?? '').replace(/\r/g, '').slice(0, maxChars);
  return clean
    .split(/\n\s*\n/)
    .map((block) => plainText(block))
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block)}</p>`)
    .join('\n');
}

function breadcrumb(lang: string, items: Array<{ name: string; path?: string }>): { html: string; jsonLd: object } {
  const all = [{ name: LANG_NAMES[lang] || 'Home', path: '/' }, ...items];
  const html = `<nav aria-label="Breadcrumb"><ol>${all
    .map((c) => `<li>${c.path ? link(lang, c.path, c.name) : escapeHtml(c.name)}</li>`)
    .join('')}</ol></nav>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: pageUrl(lang, c.path) } : {}),
    })),
  };
  return { html, jsonLd };
}

/** Site-wide navigation for the bottom of every server-rendered page. */
function siteLinks(lang: string): string {
  return `<nav aria-label="${SITE_NAME}"><ul>
      <li>${link(lang, '/search', 'Property for sale')}</li>
      <li>${link(lang, '/rentals', 'Property for rent')}</li>
      <li>${link(lang, '/guides', 'Buying guides')}</li>
      <li>${link(lang, '/agents', 'Real estate agents')}</li>
      <li>${link(lang, '/agencies', 'Agencies')}</li>
      <li>${link(lang, '/about', 'About')}</li>
      <li>${link(lang, '/contact', 'Contact')}</li>
      <li>${link(lang, '/privacy', 'Privacy Policy')}</li>
    </ul></nav>`;
}

function notFoundPage(lang: string, what: string, backPath: string, backText: string): RenderedPage {
  const title = `${what} not found | ${SITE_NAME}`;
  return {
    lang,
    status: 404,
    head: buildHead({ lang, title, description: `This ${what.toLowerCase()} is no longer available on ${SITE_NAME}.`, robots: 'noindex' }),
    body: `<main id="prerendered-content"><h1>${escapeHtml(what)} not found</h1>
      <p>This ${escapeHtml(what.toLowerCase())} has been removed or the link is wrong.</p>
      <p>${link(lang, backPath, backText)}</p>${siteLinks(lang)}</main>`,
  };
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
 * Share-card delivery options: any picture — including a square or portrait
 * profile photo — becomes the 1200×630 landscape card the social networks ask
 * for, without cropping the subject out. The image is scaled to fit and padded
 * onto a white background.
 *
 * `f_jpg` rather than the usual `f_auto`: crawlers send no useful Accept
 * header, and a WebP some of them can't render means no preview at all.
 */
export const OG_CARD_OPTIONS = {
  width: 1200,
  height: 630,
  crop: 'pad',
  background: 'white',
  format: 'jpg',
  quality: 'auto',
} as const;

/** Normalize one image candidate, or null if it can't be used as og:image. */
function normalizeOgImage(raw?: string): OgImage | null {
  const url = (raw || '').trim();
  if (!url) return null;

  // Site-relative path → absolute; crawlers reject relative og:image values.
  // (Inline DiceBear data: URIs, which crawlers cannot fetch, are rejected by
  // optimizeImageUrl's http(s)-only check below.)
  if (url.startsWith('/')) return { url: `${SITE_URL}${url}`, sized: false };

  // R2 photos: their JPEG master (size varies, so no width/height tags).
  const card = mediaOgCardUrl(url);
  if (card) return { url: card, sized: false };

  // Shared helper: rejects non-http(s) and control-character URLs, strips any
  // transformation already baked into the URL so an existing crop can't shrink
  // the card, and sizes Google OAuth avatars via their own =s{n} parameter.
  const delivered = optimizeImageUrl(url, OG_CARD_OPTIONS);
  if (!delivered) return null;

  // Images still on Cloudinary come back at 1200×630 (its `t_be_og` preset);
  // nothing else is guaranteed to.
  return { url: delivered, sized: isCloudinaryPhotoUrl(url) };
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

/** A photo URL for an <img> in the crawler content (not the share card). */
function contentImage(url: string | undefined, width = 800): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return optimizeImageUrl(url, { width }) || null;
}

// ─── Property listing ─────────────────────────────────────────────────────────

export interface PropertyData {
  _id?: string;
  id?: string;
  title?: string;
  address?: string;
  city?: string;
  country?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  livingRooms?: number;
  yearBuilt?: number;
  floorNumber?: number;
  totalFloors?: number;
  parking?: number;
  propertyType?: string;
  description?: string;
  imageUrl?: string;
  images?: Array<{ url: string; tag?: string }>;
  listingType?: string;
  rentPeriod?: string;
  isNegotiable?: boolean;
  status?: string;
  source?: string;
  sourceUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRenewed?: string;
  amenities?: unknown;
  specialFeatures?: string[];
  hasVirtualTour360?: boolean;
  floorPlanUrl?: string;
  sellerId?: { name?: string; agencyName?: string; role?: string } | string;
}

/**
 * Get the best available property image.
 * Priority: first image from images array > imageUrl > default OG image.
 */
export function getPropertyImage(property: PropertyData): string {
  const url = property.images?.[0]?.url || property.imageUrl;
  return mediaOgCardUrl(url) || url || DEFAULT_IMAGE;
}

function formatPrice(price: number | undefined, listingType?: string, isNegotiable?: boolean): string {
  if (!price || isNegotiable) return 'Price on request';
  const suffix = listingType === 'rent' ? ' / month' : '';
  return `€${Math.round(price).toLocaleString('en-US')}${suffix}`;
}

function capitalize(text: string | undefined): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/[-_]/g, ' ');
}

/** Title, description, head and content for one listing. */
export function buildPropertyPage(property: PropertyData, slug: string, lang = 'en'): RenderedPage {
  const id = property.id || slug;
  const path = `/property/${encodeURIComponent(id)}`;
  const location = [property.city, property.country].filter(Boolean).join(', ');
  const typeLabel = capitalize(property.propertyType) || 'Property';
  const action = property.listingType === 'rent' ? 'for rent' : 'for sale';
  const beds = property.beds && property.beds > 0 ? property.beds : 0;

  const heading = property.title?.trim()
    || `${beds ? `${beds}-bedroom ` : ''}${typeLabel} ${action}${location ? ` in ${location}` : ''}`;
  const title = `${heading}${property.title && location ? ` – ${location}` : ''} | ${SITE_NAME}`;
  const price = formatPrice(property.price, property.listingType, property.isNegotiable);

  const facts: Array<[string, string]> = [
    ['Price', price],
    ['Type', `${typeLabel} ${action}`],
    location ? ['Location', [property.address, location].filter(Boolean).join(', ')] : null,
    beds ? ['Bedrooms', String(beds)] : null,
    property.baths && property.baths > 0 ? ['Bathrooms', String(property.baths)] : null,
    property.sqft && property.sqft > 0 ? ['Living area', `${property.sqft} m²`] : null,
    property.floorNumber != null && property.totalFloors ? ['Floor', `${property.floorNumber} of ${property.totalFloors}`] : null,
    property.yearBuilt && property.yearBuilt > 1800 ? ['Year built', String(property.yearBuilt)] : null,
    property.parking && property.parking > 0 ? ['Parking spaces', String(property.parking)] : null,
  ].filter((f): f is [string, string] => !!f);

  const summary = facts.filter(([k]) => k !== 'Type' && k !== 'Location').map(([, v]) => v).join(' · ');
  const descText = plainText(property.description);
  const description = truncate(
    [`${typeLabel} ${action}${location ? ` in ${location}` : ''}.`, summary, descText].filter(Boolean).join(' '),
    300,
  );

  const seller = typeof property.sellerId === 'object' ? property.sellerId : undefined;
  const sellerName = seller?.agencyName || seller?.name;
  const imported = !!property.source;
  const offMarket = !!property.status && property.status !== 'active';

  const photos = (property.images ?? [])
    .map((img) => img?.url)
    .filter(Boolean)
    .slice(0, 8)
    .map((url, i) => {
      const src = contentImage(url);
      return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(`${heading} — photo ${i + 1}`)}" loading="lazy" width="800" />` : '';
    })
    .filter(Boolean)
    .join('\n');

  const features = (property.specialFeatures ?? []).filter((f) => typeof f === 'string' && f.trim()).slice(0, 20);

  const crumbs = breadcrumb(lang, [
    ...(property.country ? [{ name: property.country, path: `/search?country=${encodeURIComponent(property.country)}` }] : []),
    ...(property.city && property.country
      ? [{ name: property.city, path: `/explore-cities/${encodeURIComponent(property.city)}/${encodeURIComponent(property.country)}` }]
      : []),
    { name: heading },
  ]);

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <article>
        <h1>${escapeHtml(heading)}</h1>
        <p><strong>${escapeHtml(price)}</strong>${location ? ` — ${escapeHtml(location)}` : ''}</p>
        <dl>${facts.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>
        ${descText ? `<section><h2>Description</h2>${paragraphs(property.description)}</section>` : ''}
        ${features.length ? `<section><h2>Features</h2><ul>${features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></section>` : ''}
        ${photos ? `<section><h2>Photos</h2>${photos}</section>` : ''}
        ${property.hasVirtualTour360 ? '<p>This listing includes a 360° virtual tour.</p>' : ''}
        ${sellerName ? `<p>Listed by ${escapeHtml(sellerName)}.</p>` : ''}
        ${imported ? `<p>Imported listing — original source: ${
          property.sourceUrl ? `<a href="${escapeHtml(property.sourceUrl)}" rel="nofollow noopener">${escapeHtml(property.source)}</a>` : escapeHtml(property.source)
        }.</p>` : ''}
        ${offMarket ? `<p>This property is no longer on the market (${escapeHtml(property.status)}).</p>` : ''}
        <p>Listing details are provided by the seller. ${link(lang, `/contact?topic=report&listing=${encodeURIComponent(pageUrl(lang, path))}`, 'Report this listing', 'nofollow')}.</p>
      </article>
      <nav aria-label="More property"><ul>
        ${property.city ? `<li>${link(lang, `/search?city=${encodeURIComponent(property.city)}`, `More property in ${property.city}`)}</li>` : ''}
        <li>${link(lang, '/mortgage-calculator', 'Mortgage calculator')}</li>
      </ul></nav>
      ${siteLinks(lang)}
    </main>`;

  const image = resolveOgImage(getPropertyImage(property));
  const jsonLd: object[] = [crumbs.jsonLd];
  if (!imported && !offMarket) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: heading,
      description,
      url: pageUrl(lang, path),
      inLanguage: lang,
      image: (property.images ?? []).map((i) => i.url).filter(Boolean).slice(0, 8),
      ...(property.createdAt ? { datePosted: property.createdAt } : {}),
      ...(property.price && !property.isNegotiable
        ? { offers: { '@type': 'Offer', price: property.price, priceCurrency: 'EUR' } }
        : {}),
    });
  }

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title,
      description,
      robots: imported || offMarket ? ROBOTS_NOINDEX : ROBOTS_INDEX,
      alternates: !imported && !offMarket,
      image: image.url,
      imageSized: image.sized,
      imageAlt: heading,
      ogType: 'product',
      extraMeta: property.price && !property.isNegotiable
        ? [
            `<meta property="product:price:amount" content="${property.price}" data-rh="true" />`,
            '<meta property="product:price:currency" content="EUR" data-rh="true" />',
          ]
        : [],
      jsonLd,
    }),
    body,
  };
}

/** Kept for callers/tests: the listing page as a standalone document. */
export function buildOgHtml(property: PropertyData, slug: string, lang = 'en'): string {
  return renderPage(FALLBACK_SHELL, buildPropertyPage(property, slug, lang));
}

export async function handlePropertyOgRequest(context: PagesContext, slug: string, lang = 'en'): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  if (!isUsableSlug(slug)) return passThrough(context);

  const result = await fetchApi<{ data?: PropertyData; property?: PropertyData }>(
    `${API_BASE}/properties/${encodeURIComponent(slug)}`,
  );
  if (result.status === 'not-found') {
    return respond(context, notFoundPage(lang, 'Listing', '/search', 'Search all property'));
  }
  if (result.status === 'error') return passThrough(context);
  const property = result.data.property || result.data.data;
  if (!property) return passThrough(context);
  return respond(context, buildPropertyPage(property, slug, lang));
}

// ─── Blog article ─────────────────────────────────────────────────────────────

export interface ArticleData {
  title?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  slug?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  category?: string;
  country?: string;
  author?: { name?: string } | string;
}

/**
 * Get the best available article image.
 * Priority: article cover image > default OG image.
 */
export function getArticleImage(article: ArticleData): string {
  return mediaOgCardUrl(article.coverImageUrl) || article.coverImageUrl || DEFAULT_IMAGE;
}

/** Markdown or HTML article content → headings and paragraphs, as plain text. */
function articleBody(content: string | undefined): string {
  const blocks = String(content ?? '')
    .replace(/\r/g, '')
    .replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, '\n\n')
    .split(/\n\s*\n/)
    .slice(0, 200);
  return blocks
    .map((raw) => {
      const block = raw.trim();
      if (!block) return '';
      const heading = block.match(/^#{1,6}\s+(.*)$/) || block.match(/^<h[1-6][^>]*>([\s\S]*)$/i);
      const text = plainText((heading ? heading[1] : block).replace(/[*_`>#]/g, ''));
      if (!text) return '';
      return heading ? `<h2>${escapeHtml(text)}</h2>` : `<p>${escapeHtml(text)}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

export function buildArticlePage(article: ArticleData, slug: string, lang = 'en'): RenderedPage {
  const path = `/blog/${encodeURIComponent(slug)}`;
  const heading = article.title?.trim() || SITE_NAME;
  const title = `${heading} | ${SITE_NAME}`;
  const description = truncate(plainText(article.excerpt) || plainText(article.content), 300)
    || `Property insights from the Balkans on ${SITE_NAME}.`;
  const authorName = typeof article.author === 'object' ? article.author?.name : undefined;
  const image = resolveOgImage(getArticleImage(article));
  const crumbs = breadcrumb(lang, [{ name: 'Blog', path: '/blog' }, { name: heading }]);
  const published = article.publishedAt ? String(article.publishedAt) : '';

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <article>
        <h1>${escapeHtml(heading)}</h1>
        <p>${authorName ? `By ${escapeHtml(authorName)}` : `By ${SITE_NAME}`}${
          published ? ` · <time datetime="${escapeHtml(published)}">${escapeHtml(published.slice(0, 10))}</time>` : ''
        }</p>
        ${article.excerpt ? `<p><strong>${escapeHtml(plainText(article.excerpt))}</strong></p>` : ''}
        ${articleBody(article.content)}
      </article>
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title,
      description,
      image: image.url,
      imageSized: image.sized,
      imageAlt: heading,
      ogType: 'article',
      extraMeta: [
        published ? `<meta property="article:published_time" content="${escapeHtml(published)}" data-rh="true" />` : '',
        ...(article.tags || []).map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}" data-rh="true" />`),
      ].filter(Boolean),
      jsonLd: [
        crumbs.jsonLd,
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: heading,
          description,
          url: pageUrl(lang, path),
          image: image.url,
          ...(published ? { datePublished: published } : {}),
          ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
          author: authorName ? { '@type': 'Person', name: authorName } : { '@type': 'Organization', name: SITE_NAME },
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        },
      ],
    }),
    body,
  };
}

/** Kept for callers/tests: the article page as a standalone document. */
export function buildArticleOgHtml(article: ArticleData, slug: string, lang = 'en'): string {
  return renderPage(FALLBACK_SHELL, buildArticlePage(article, slug, lang));
}

/**
 * Fetch article data from the backend API and return OG HTML response.
 * Shared handler used by both blog route functions.
 */
export async function handleArticleOgRequest(context: PagesContext, slug: string, lang = 'en'): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  if (!isUsableSlug(slug)) return passThrough(context);

  const result = await fetchApi<{ article?: ArticleData; data?: ArticleData }>(
    `${API_BASE}/articles/${encodeURIComponent(slug)}`,
  );
  if (result.status === 'not-found') {
    return respond(context, notFoundPage(lang, 'Article', '/blog', 'All articles'));
  }
  if (result.status === 'error') return passThrough(context);
  const article = result.data.article || result.data.data;
  if (!article?.title) return passThrough(context);
  return respond(context, buildArticlePage(article, slug, lang));
}

// ─── Agent profile ────────────────────────────────────────────────────────────

export interface AgentData {
  agentId?: string;
  bio?: string;
  specializations?: string[];
  serviceAreas?: string[];
  languages?: string[];
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
    slug?: string;
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

export function buildAgentPage(agent: AgentData, slug: string, lang = 'en'): RenderedPage {
  const name = agent.userId?.name?.trim() || 'Real Estate Agent';
  const location = [agent.userId?.city, agent.userId?.country].filter(Boolean).join(', ');
  const agencyName = agent.agencyName || agent.agencyId?.name;
  const path = `/agents/${encodeURIComponent(slug)}`;

  const heading = location ? `${name} – Real Estate Agent in ${location}` : `${name} – Real Estate Agent`;
  const fullTitle = `${heading} | ${SITE_NAME}`;

  const facts = [
    agencyName,
    agent.yearsOfExperience ? `${agent.yearsOfExperience} years of experience` : '',
    agent.activeListings ? `${agent.activeListings} active listing${agent.activeListings > 1 ? 's' : ''}` : '',
    agent.rating
      ? `${agent.rating.toFixed(1)}★${agent.totalReviews ? ` (${agent.totalReviews} reviews)` : ''}`
      : '',
    (agent.specializations || []).slice(0, 3).join(', '),
  ].filter(Boolean).join(' · ');

  const bio = plainText(agent.bio);
  const description = truncate([facts, bio].filter(Boolean).join(' — '), 300)
    || `Get in touch with ${name} on ${SITE_NAME}.`;
  const image = getAgentImage(agent);
  const crumbs = breadcrumb(lang, [{ name: 'Agents', path: '/agents' }, { name }]);

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <article>
        <h1>${escapeHtml(heading)}</h1>
        ${facts ? `<p>${escapeHtml(facts)}</p>` : ''}
        ${bio ? `<section><h2>About ${escapeHtml(name)}</h2>${paragraphs(agent.bio)}</section>` : ''}
        ${agent.serviceAreas?.length ? `<p>Service areas: ${escapeHtml(agent.serviceAreas.join(', '))}</p>` : ''}
        ${agent.languages?.length ? `<p>Languages: ${escapeHtml(agent.languages.join(', '))}</p>` : ''}
      </article>
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title: fullTitle,
      description,
      // A profile with nothing on it but a name is not worth an index entry.
      robots: bio || agent.activeListings ? ROBOTS_INDEX : ROBOTS_NOINDEX,
      image: image.url,
      imageSized: image.sized,
      imageAlt: `${name} – profile picture`,
      ogType: 'profile',
      extraMeta: agent.agentId
        ? [`<meta property="profile:username" content="${escapeHtml(agent.agentId)}" data-rh="true" />`]
        : [],
      jsonLd: [
        crumbs.jsonLd,
        {
          '@context': 'https://schema.org',
          '@type': 'RealEstateAgent',
          name,
          url: pageUrl(lang, path),
          ...(bio ? { description: truncate(bio, 500) } : {}),
          ...(agencyName ? { worksFor: { '@type': 'Organization', name: agencyName } } : {}),
        },
      ],
    }),
    body,
  };
}

export function buildAgentOgHtml(agent: AgentData, slug: string, lang = 'en'): string {
  return renderPage(FALLBACK_SHELL, buildAgentPage(agent, slug, lang));
}

export async function handleAgentOgRequest(context: PagesContext, slug: string, lang = 'en'): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  if (!isUsableSlug(slug)) return passThrough(context);

  const result = await fetchApi<{ agent?: AgentData; data?: AgentData }>(`${API_BASE}/agents/${encodeURIComponent(slug)}`);
  if (result.status === 'not-found') {
    return respond(context, notFoundPage(lang, 'Agent', '/agents', 'All agents'));
  }
  if (result.status === 'error') return passThrough(context);
  const agent = result.data.agent || result.data.data;
  if (!agent) return passThrough(context);
  return respond(context, buildAgentPage(agent, slug, lang));
}

// ─── Agency profile ───────────────────────────────────────────────────────────

export interface AgencyData {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  city?: string;
  country?: string;
  address?: string;
  website?: string;
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

export function buildAgencyPage(agency: AgencyData, slug: string, lang = 'en'): RenderedPage {
  const name = agency.name?.trim() || 'Real Estate Agency';
  const location = [agency.city, agency.country].filter(Boolean).join(', ');
  const path = `/agencies/${encodeSlugPath(slug)}`;

  const heading = location ? `${name} – Real Estate Agency in ${location}` : `${name} – Real Estate Agency`;
  const fullTitle = `${heading} | ${SITE_NAME}`;

  const facts = [
    agency.totalAgents ? `${agency.totalAgents} agent${agency.totalAgents > 1 ? 's' : ''}` : '',
    agency.totalProperties ? `${agency.totalProperties} listing${agency.totalProperties > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const about = plainText(agency.description);
  const description = truncate([facts, about].filter(Boolean).join(' — '), 300)
    || `Browse listings from ${name} on ${SITE_NAME}.`;
  const image = getAgencyImage(agency);
  const crumbs = breadcrumb(lang, [{ name: 'Agencies', path: '/agencies' }, { name }]);

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <article>
        <h1>${escapeHtml(heading)}</h1>
        ${facts ? `<p>${escapeHtml(facts)}</p>` : ''}
        ${about ? `<section><h2>About ${escapeHtml(name)}</h2>${paragraphs(agency.description)}</section>` : ''}
        ${agency.address ? `<p>Address: ${escapeHtml(agency.address)}</p>` : ''}
      </article>
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title: fullTitle,
      description,
      robots: about || agency.totalProperties ? ROBOTS_INDEX : ROBOTS_NOINDEX,
      image: image.url,
      imageSized: image.sized,
      imageAlt: `${name} logo`,
      ogType: 'website',
      jsonLd: [
        crumbs.jsonLd,
        {
          '@context': 'https://schema.org',
          '@type': 'RealEstateAgent',
          name,
          url: pageUrl(lang, path),
          ...(about ? { description: truncate(about, 500) } : {}),
          ...(agency.address || location
            ? { address: { '@type': 'PostalAddress', streetAddress: agency.address, addressLocality: agency.city, addressCountry: agency.country } }
            : {}),
        },
      ],
    }),
    body,
  };
}

export function buildAgencyOgHtml(agency: AgencyData, slug: string, lang = 'en'): string {
  return renderPage(FALLBACK_SHELL, buildAgencyPage(agency, slug, lang));
}

export async function handleAgencyOgRequest(context: PagesContext, slug: string, lang = 'en'): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  if (!isUsableSlug(slug)) return passThrough(context);

  const result = await fetchApi<{ agency?: AgencyData; data?: AgencyData }>(`${API_BASE}/agencies/${encodeSlugPath(slug)}`);
  if (result.status === 'not-found') {
    return respond(context, notFoundPage(lang, 'Agency', '/agencies', 'All agencies'));
  }
  if (result.status === 'error') return passThrough(context);
  const agency = result.data.agency || result.data.data;
  if (!agency?.name) return passThrough(context);
  return respond(context, buildAgencyPage(agency, slug, lang));
}
