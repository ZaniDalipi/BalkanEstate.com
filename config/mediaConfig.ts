/**
 * Image URLs for display — photos on our R2 media CDN, plus external images.
 *
 * Every photo uploaded through the app lives in one folder on the media CDN
 * with all its display sizes pre-generated at upload (see
 * backend/src/config/mediaVariants.ts, which this file shares with the
 * backend so URLs and stored files can't drift):
 *
 *   {MEDIA_CDN_URL}/users/{name}_{id}/listings/{title}_{id}/photos/{photoId}/w640.webp
 *
 * The database stores the master (`…/original.jpg`); the helpers below swap
 * in the right size. Nothing is resized on request.
 *
 * Images uploaded before R2 stay on Cloudinary and are shown from there as
 * before, through its named presets (config/legacyCloudinary.ts). Other
 * external images (listing feeds) go through our resizing proxy.
 */

import { API_URL } from '../src/shared/api/config';
import {
  parseMediaUrl,
  parseR2PhotoUrl,
  mediaFileUrl,
  pickVariantFile,
  snapMediaWidth,
  MEDIA_WIDTHS,
  sizeCapOf,
  MEDIA_MASTER_FILE,
  MEDIA_LQIP_FILE,
  CITY_CONVENTION_FOLDER,
} from '../backend/src/config/mediaVariants';
import {
  cloudinaryPresetUrl,
  cloudinaryCityImageUrl,
  originalCloudinaryUrl,
  isCloudinaryUrl,
  isCloudinaryPhotoUrl,
  snapCloudinaryWidth,
} from './legacyCloudinary';

/**
 * Public origin of the R2 media bucket, e.g. https://media.balkanestateai.com
 * (VITE_MEDIA_CDN_URL; must match the backend's R2_PUBLIC_URL). Read
 * defensively: Pages Functions bundle this file without Vite's import.meta.env.
 */
const PRODUCTION_MEDIA_CDN_URL = 'https://media.balkanestateai.com';

/** A usable origin from the env value — tolerates a missing scheme or a trailing slash. */
const normalizeMediaOrigin = (raw: string | undefined): string => {
  const value = (raw || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export const MEDIA_CDN_URL: string =
  normalizeMediaOrigin(import.meta.env?.VITE_MEDIA_CDN_URL) ||
  // A production build without the variable (e.g. it wasn't set where the
  // build runs) must still recognise our own photos.
  (import.meta.env?.PROD ? PRODUCTION_MEDIA_CDN_URL : '');

/** Photo key + file of a URL on our media CDN, or null. */
const mediaCdnHost = ((): string | null => {
  try {
    return MEDIA_CDN_URL ? new URL(MEDIA_CDN_URL).hostname : null;
  } catch {
    return null;
  }
})();

/**
 * Bucket origin, photo key and file of one of our R2 photos, or null: on the
 * configured media CDN, or on an R2 public bucket address (`*.r2.dev`, e.g. a
 * photo stored before the custom domain) with our folder layout.
 */
export const parseMediaCdnUrl = (
  url: string | undefined | null
): { origin: string; photoKey: string; file: string } | null => {
  const media = parseMediaUrl(url, MEDIA_CDN_URL);
  if (media) return { origin: MEDIA_CDN_URL, ...media };
  return parseR2PhotoUrl(url, mediaCdnHost);
};

/** True for a photo stored in our R2 media buckets. */
export const isMediaCdnUrl = (url: string | undefined | null): boolean => parseMediaCdnUrl(url) !== null;

/** Widths stored for every photo. Requests are rounded *up* to the next one. */
export const IMAGE_WIDTH_BUCKETS = MEDIA_WIDTHS;

/** Largest width ever requested — matches the stored master's max edge. */
export const IMAGE_MAX_WIDTH = MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];

/** Round a requested width up to the nearest stored width (capped at the max). */
export const snapImageWidth = snapMediaWidth;

// ============================================================================
// City photos
// ============================================================================

/**
 * Normalizes a name for use in photo keys
 * @param name - The name (e.g., "Tirana", "Novi Sad", "North Macedonia")
 * @returns Normalized name (e.g., "tirana", "novi-sad", "north-macedonia")
 */
export const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ''); // Remove special characters
};

// Alias for backward compatibility
export const normalizeCityName = normalizeName;

const cityPublicId = (cityName: string, country?: string): string =>
  `city-${country ? normalizeName(country) : 'unknown'}-${normalizeName(cityName)}`;

/**
 * The curated photo of a city, sized for the request: the existing one on
 * Cloudinary (public id `city-{country}-{city}`), as before R2.
 */
export const getCityImageUrl = (
  cityName: string,
  options: {
    country?: string;
    width?: number;
    height?: number;
    /** Accepted for compatibility; sizes are pre-generated. */
    quality?: string | number;
    format?: string;
    crop?: string;
    gravity?: string;
  } = {}
): string => {
  const { country, width = 800, height = 600 } = options;
  return cloudinaryCityImageUrl(cityPublicId(cityName, country), { width, height });
};

/**
 * A city's curated photo seeded on R2 since the move
 * (`cities/convention/city-{country}-{city}`, written by seedCityImages) —
 * tried after the Cloudinary one. Empty while the media CDN isn't configured.
 */
export const getMediaCdnCityImageUrl = (
  cityName: string,
  options: { country?: string; width?: number; height?: number } = {}
): string => {
  if (!MEDIA_CDN_URL) return '';
  const { country, width = 800, height = 600 } = options;
  return mediaFileUrl(MEDIA_CDN_URL, `${CITY_CONVENTION_FOLDER}/${cityPublicId(cityName, country)}`, pickVariantFile({ width, height }));
};

/** Blurred placeholder of a city's curated photo (on Cloudinary). */
export const getCityImagePlaceholder = (cityName: string, country?: string): string =>
  cloudinaryCityImageUrl(cityPublicId(cityName, country), { blur: true });

/**
 * Default fallback gradient for cities without images
 * Returns a CSS gradient based on the city name (for consistent colors)
 */
export const getCityFallbackGradient = (cityName: string): string => {
  // Generate a consistent color based on city name
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;

  return `linear-gradient(135deg, hsl(${hue1}, 60%, 45%) 0%, hsl(${hue2}, 50%, 35%) 100%)`;
};

/**
 * List of all supported cities for reference
 * Normalized names, as used by the city photo library (seedCityImages)
 */
export const SUPPORTED_CITIES = [
  // Albania
  'tirana', 'durres', 'vlore', 'shkoder', 'elbasan', 'fier', 'korce', 'berat', 'sarande',
  // Kosovo
  'pristina', 'prizren', 'peja', 'gjakova', 'mitrovica', 'gjilan', 'ferizaj',
  // North Macedonia
  'skopje', 'bitola', 'ohrid', 'tetovo', 'kumanovo', 'prilep', 'strumica',
  // Montenegro
  'podgorica', 'niksic', 'budva', 'kotor', 'herceg-novi', 'bar', 'tivat', 'ulcinj',
  // Serbia
  'belgrade', 'novi-sad', 'nis', 'kragujevac', 'subotica', 'zrenjanin', 'pancevo',
  // Bosnia and Herzegovina
  'sarajevo', 'banja-luka', 'mostar', 'tuzla', 'zenica', 'bijeljina',
  // Croatia
  'zagreb', 'split', 'rijeka', 'dubrovnik', 'osijek', 'zadar', 'pula',
  // Greece
  'thessaloniki', 'athens', 'patras', 'larissa', 'volos',
  // Bulgaria
  'sofia', 'plovdiv', 'varna', 'burgas', 'ruse',
] as const;

// ============================================================================
// Photo sizes and fallbacks
// ============================================================================

/**
 * Blurred 32px placeholder (blur-up / LQIP) of a photo on our media CDN or on
 * Cloudinary, or an empty string for any other URL.
 */
export const getPropertyImagePlaceholder = (imageUrl: string | undefined): string => {
  const media = parseMediaCdnUrl(imageUrl);
  if (media) return mediaFileUrl(media.origin, media.photoKey, MEDIA_LQIP_FILE);
  return (imageUrl && isCloudinaryPhotoUrl(imageUrl) && cloudinaryPresetUrl(imageUrl, { blur: true })) || '';
};

/**
 * The external image a resizing-proxy URL (`{API_URL}/image-proxy?url=…`)
 * wraps, or null. Only http(s) sources are returned.
 */
export const originalProxiedUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined);
    if (!parsed.pathname.endsWith('/image-proxy')) return null;
    const source = parsed.searchParams.get('url');
    return source && /^https?:\/\//i.test(source) ? source : null;
  } catch {
    return null;
  }
};

/** The master (`original.jpg`) of a photo on our media CDN, or null. */
export const originalMediaCdnUrl = (url: string | undefined | null): string | null => {
  const media = parseMediaCdnUrl(url);
  return media ? mediaFileUrl(media.origin, media.photoKey, MEDIA_MASTER_FILE) : null;
};

/** The unresized original behind a media CDN size, Cloudinary preset or proxy URL, or null. */
export const originalImageUrl = (url: string | undefined | null): string | null =>
  originalMediaCdnUrl(url) ?? originalCloudinaryUrl(url) ?? originalProxiedUrl(url);

/**
 * `onError` for a resized <img>: retry once with the original image. Returns
 * false when there is nothing left to try, so the caller can show its own
 * fallback.
 */
export const retryWithOriginalImage = (img: HTMLImageElement): boolean => {
  if (img.dataset.cdnFallback === 'original') return false;
  // A size may be missing (or a browser can't show WebP); the proxy may be
  // down or refuse the host. Either way the original is still worth a try.
  const original = originalImageUrl(img.currentSrc || img.src);
  if (!original || original === img.src) return false;
  img.dataset.cdnFallback = 'original';
  img.removeAttribute('srcset');
  img.src = original;
  return true;
};

// ============================================================================
// External images → our resizing proxy
// ============================================================================

/**
 * Hosts served directly: they have their own CDN/resizing and are allowed by
 * the CSP. Everything else external (listing feeds, scraped sites) goes
 * through `/api/image-proxy`, which resizes to WebP and caches on our server.
 */
const DIRECT_IMAGE_HOSTS = new Set(['images.unsplash.com', 'upload.wikimedia.org']);

const isOwnSiteUrl = (url: URL): boolean =>
  typeof window !== 'undefined' && url.host === window.location.host;

/** Proxy URL for an external image at a bucketed width. */
export const buildImageProxyUrl = (url: string, width?: number): string => {
  const params = new URLSearchParams({ url });
  if (width) params.set('w', String(snapImageWidth(width)));
  return `${API_URL}/image-proxy?${params.toString()}`;
};

/** True for http(s) images we should resize through the proxy. */
export const shouldProxyImage = (rawUrl: string): boolean => {
  // Only in the browser. Server contexts (Pages Functions building share
  // cards) have no API origin to point at and keep the source URL.
  if (typeof window === 'undefined') return false;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  if (host.endsWith('googleusercontent.com')) return false;
  if (isMediaCdnUrl(rawUrl) || isCloudinaryUrl(rawUrl)) return false;
  if (DIRECT_IMAGE_HOSTS.has(host) || isOwnSiteUrl(url)) return false;
  if (rawUrl.startsWith(`${API_URL}/image-proxy`)) return false;
  // SVGs are never proxied (the proxy rejects them — they can carry script).
  if (/\.svg(?:$|\?)/i.test(url.pathname)) return false;
  return true;
};

/**
 * Size an image URL for display.
 *
 *  - Our media CDN (R2): the pre-generated file for the request, e.g.
 *      {MEDIA_CDN_URL}/users/{u}/listings/{p}/photos/{id}/w640.webp
 *    width×height → a width covering the box, blur → lqip, jpg → original.jpg.
 *  - Cloudinary (images from before R2): its named preset for the request, e.g.
 *      {cloudinary}/image/upload/t_be_w800/v{version}/{path}.jpg
 *  - Google avatars: size parameter.
 *  - Other external images: our resizing proxy.
 *
 * `quality`, `crop`, `gravity` and `background` are accepted for
 * compatibility; the stored sizes fix them.
 */
export const optimizeImageUrl = (
  url: string | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best';
    /** 'jpg' asks for the 1200×630 JPEG share card (crawlers want JPEG). */
    format?: 'auto' | 'webp' | 'avif' | 'jpg';
    crop?: 'fill' | 'scale' | 'fit' | 'limit' | 'thumb' | 'pad';
    gravity?: 'auto' | 'center';
    background?: string;
    /**
     * Any blur ≥ 1 asks for the blurred placeholder — what a blur-up wants: a
     * tiny photo stretched across a panel reads as broken blocks, a blurred
     * one as a photo on its way.
     */
    blur?: number;
  } = {}
): string => {
  if (!url || typeof url !== 'string') return '';

  // Security: Only allow http/https URLs, reject data:, javascript:, etc.
  if (!/^https?:\/\//i.test(url)) return '';

  // Security: Reject URLs with embedded newlines or control characters
  if (/[\r\n\x00-\x1f]/.test(url)) return '';

  // Clamp dimensions to reasonable values to prevent abuse
  const clampDimension = (val: number | undefined, max: number): number | undefined => {
    if (val === undefined) return undefined;
    return Math.max(1, Math.min(Math.round(val), max));
  };

  const { width: rawWidth, height: rawHeight, format = 'auto', blur } = options;
  const requestedWidth = clampDimension(rawWidth, 4096);
  const requestedHeight = clampDimension(rawHeight, 4096);

  // Our media CDN: pick the pre-generated size (see mediaVariants.ts).
  const media = parseMediaCdnUrl(url);
  if (media) {
    const wantsBlur = typeof blur === 'number' && Number.isFinite(blur) && blur >= 1;
    const file = pickVariantFile({ width: requestedWidth, height: requestedHeight, format, blur: wantsBlur }, media.photoKey);
    return mediaFileUrl(media.origin, media.photoKey, file);
  }

  // Cloudinary (images from before R2): onto one registered preset.
  if (isCloudinaryUrl(url)) {
    const wantsBlur = typeof blur === 'number' && Number.isFinite(blur) && blur >= 1;
    return cloudinaryPresetUrl(url, { width: requestedWidth, height: requestedHeight, format, blur: wantsBlur }) ?? url;
  }

  // Google user content URLs (avatars) - resize via URL param
  if (url.includes('googleusercontent.com')) {
    const size = clampDimension(requestedWidth, 512) || 96;
    const cleaned = url.replace(/=s\d+-c$/, '').replace(/=s\d+$/, '');
    return `${cleaned}=s${size}`;
  }

  // Other external images (listing feeds): resized + cached by our proxy.
  if (shouldProxyImage(url)) {
    return buildImageProxyUrl(url, requestedWidth);
  }

  return url;
};

/**
 * A srcSet for a photo on our media CDN (one candidate per stored width) or on
 * Cloudinary (one per preset width). Empty for any other URL.
 */
export const imageSrcSet = (
  url: string | undefined,
  widths: number[] = [480, 800, 1280, 1920],
  _options: Record<string, unknown> = {}
): string => {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return '';
  if (isCloudinaryPhotoUrl(url)) {
    const seenPreset = new Set<number>();
    return widths
      .map(snapCloudinaryWidth)
      .filter((w) => (seenPreset.has(w) ? false : (seenPreset.add(w), true)))
      .map((w) => `${optimizeImageUrl(url, { width: w })} ${w}w`)
      .join(', ');
  }
  const media = parseMediaCdnUrl(url);
  if (!media) return '';
  // Widths are snapped to the sizes this photo has, so candidates can collapse
  // into one — describe each by its real width and list it once.
  const cap = sizeCapOf(media.photoKey);
  const seen = new Set<number>();
  return widths
    .map((w) => Math.min(snapImageWidth(w), cap))
    .filter((w) => (seen.has(w) ? false : (seen.add(w), true)))
    .map((w) => `${optimizeImageUrl(url, { width: w })} ${w}w`)
    .join(', ');
};

// ============================================================================
// Pre-defined Optimized Asset URLs
// Served straight from Unsplash's CDN with its own resizing parameters
// ============================================================================

/**
 * Onboarding page images - using Unsplash's built-in optimization
 * Unsplash supports URL parameters for resizing and quality:
 * - w=width, h=height, q=quality (1-100), fm=format (webp, jpg)
 * - fit=crop for aspect ratio fitting
 */
export const ONBOARDING_IMAGES = {
  // "Looking to Buy" card - couple looking at new home
  buyCard: {
    src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&q=80&fm=webp',
    srcSet: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=225&fit=crop&q=80&fm=webp 300w',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&q=80&fm=webp 400w',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=375&fit=crop&q=80&fm=webp 500w',
    ].join(', '),
    preload: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&q=80&fm=webp',
    alt: 'A couple looking at a new home',
  },
  // "Want to Sell" card - modern house exterior
  sellCard: {
    src: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop&q=80&fm=webp',
    srcSet: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=300&h=225&fit=crop&q=80&fm=webp 300w',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop&q=80&fm=webp 400w',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500&h=375&fit=crop&q=80&fm=webp 500w',
    ].join(', '),
    alt: 'A modern house exterior',
  },
};

/**
 * Hero/Background images - using Unsplash's built-in optimization
 */
export const HERO_IMAGES = {
  // Agents page hero background
  agentsHero: {
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&h=400&fit=crop&q=70&fm=webp',
    srcSet: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=200&fit=crop&q=70&fm=webp 800w',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=300&fit=crop&q=70&fm=webp 1200w',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&h=400&fit=crop&q=70&fm=webp 1600w',
    ].join(', '),
  },
};

/**
 * Fallback/Placeholder images - using Unsplash's built-in optimization
 */
export const FALLBACK_IMAGES = {
  // Default property image when no images are uploaded
  property: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&h=375&fit=crop&q=80&fm=webp',
};
