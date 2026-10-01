/**
 * Cloudinary configuration for frontend assets
 *
 * City images should have Public IDs in this format:
 * city-{country}-{city}
 *
 * For example:
 * - Durres, Albania → Public ID: "city-albania-durres"
 * - Prishtina, Kosovo → Public ID: "city-kosovo-prishtina"
 * - Skopje, North Macedonia → Public ID: "city-north-macedonia-skopje"
 *
 * To set this in Cloudinary:
 * 1. Click on the image
 * 2. Click "..." menu → Rename
 * 3. Set Public ID to: city-{country}-{city}
 */

import { API_URL } from '../src/shared/api/config';
import {
  PRESET_WIDTHS,
  LQIP_PRESET,
  OG_PRESET,
  widthPresetName,
  boxPresetName,
  snapPresetWidth,
  snapPresetRatio,
} from '../backend/src/config/cloudinaryPresets';

// Cloudinary cloud name
export const CLOUDINARY_CLOUD_NAME = 'dh8tbq8wy';

// Base URL for Cloudinary images
export const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Normalizes a name for use in Cloudinary URLs
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

/**
 * Generates a Cloudinary URL for a city image with optimizations
 * @param cityName - The city name
 * @param options - Optional transformation options including country
 * @returns The full Cloudinary URL for the city image
 */
export const getCityImageUrl = (
  cityName: string,
  options: {
    country?: string;
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
    gravity?: 'auto' | 'center' | 'face' | 'faces';
  } = {}
): string => {
  const { country, width = 800, height = 600 } = options;

  const normalizedCity = normalizeName(cityName);
  const normalizedCountry = country ? normalizeName(country) : 'unknown';

  // Public ID format: city-{country}-{city}. Delivered through a registered
  // box preset (strict-transformations safe); quality/format/crop/gravity are
  // fixed by the preset (q_auto, f_auto, c_fill, g_auto).
  const publicId = `city-${normalizedCountry}-${normalizedCity}`;
  return `${CLOUDINARY_BASE_URL}/${presetSegment(presetFor({ width, height }))}/${publicId}`;
};

/**
 * Generates a low-quality placeholder URL for property images (blur-up / LQIP effect).
 * Returns a tiny (20px wide), heavily blurred version of the image for use as a
 * placeholder while the full-resolution image loads.
 *
 * @param imageUrl - A Cloudinary upload URL (e.g. https://res.cloudinary.com/.../upload/v123/...)
 * @returns Optimized placeholder URL, or empty string for non-Cloudinary URLs
 */
export const getPropertyImagePlaceholder = (imageUrl: string | undefined): string => {
  if (!imageUrl) return '';
  const uploadMatch = imageUrl.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/);
  if (!uploadMatch) return '';
  return `${uploadMatch[1]}${presetSegment(LQIP_PRESET)}/${uploadMatch[2]}`;
};

/**
 * Generates a low-quality placeholder URL for blur-up effect
 * @param cityName - The city name
 * @param country - The country name (optional)
 * @returns The placeholder URL with blur effect
 */
export const getCityImagePlaceholder = (cityName: string, country?: string): string => {
  const normalizedCity = normalizeName(cityName);
  const normalizedCountry = country ? normalizeName(country) : 'unknown';

  const publicId = `city-${normalizedCountry}-${normalizedCity}`;

  return `${CLOUDINARY_BASE_URL}/${presetSegment(LQIP_PRESET)}/${publicId}`;
};

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
 * When adding new city images to Cloudinary, use these normalized names
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
// Property Image Optimization (Cloudinary Upload Transforms)
// ============================================================================

/**
 * Strips Cloudinary transform segments from the path portion of an upload URL.
 * Handles both versioned URLs (v1234/...) and unversioned URLs with baked-in
 * transforms (c_fill,ar_16:9/my_image.jpg).
 *
 * Cloudinary transform tokens always follow the pattern: shortKey_value
 * e.g. c_fill, w_1200, g_auto, ar_16:9, e_blur:500
 * Real path segments (folders, filenames) do not match this pattern.
 */
const stripCloudinaryTransforms = (rest: string): string => {
  const parts = rest.split('/');
  const versionIdx = parts.findIndex(p => /^v\d+$/.test(p));
  if (versionIdx !== -1) {
    return parts.slice(versionIdx).join('/');
  }
  // No version segment — strip any leading transform segments.
  // A transform segment has all comma-separated tokens matching key_value (1-3 char key).
  const firstNonTransform = parts.findIndex(
    p => !p.split(',').every(token => /^[a-z]{1,3}_/.test(token))
  );
  return firstNonTransform !== -1 ? parts.slice(firstNonTransform).join('/') : rest;
};

// ============================================================================
// Delivery presets (strict-transformations safe)
// ============================================================================
//
// Cloudinary bills every *distinct* derived image as a transformation, and
// with "Strict transformations" on it refuses any ad-hoc `w_480,c_limit,…`
// URL outright. So every image the app shows uses one of a fixed set of
// named transformations (`t_be_w480`, `t_be_r4x3_w320`, `t_be_lqip`,
// `t_be_og`) defined in backend/src/config/cloudinaryPresets.ts — the same
// file the backend uses to register them with Cloudinary at startup.
//
// Requests are snapped onto that set: widths round UP to the next bucket,
// width×height boxes snap to the nearest preset aspect ratio. Masters are
// stored at ≤1920px, so nothing larger is ever requested.

/** Widths a delivery URL may use. Requests are rounded *up* to the next one. */
export const CLOUDINARY_WIDTH_BUCKETS = PRESET_WIDTHS;

/** Largest width ever requested — matches the stored master's max edge. */
export const CLOUDINARY_MAX_WIDTH = PRESET_WIDTHS[PRESET_WIDTHS.length - 1];

/** Round a requested width up to the nearest bucket (capped at the max). */
export const snapCloudinaryWidth = snapPresetWidth;

/**
 * The untransformed original of a Cloudinary image URL, or null. Delivering
 * the original is always allowed — even with strict transformations — so it
 * is the safe fallback when a preset URL fails to load.
 */
export const originalCloudinaryUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  const match = url.split(/[?#]/)[0].match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!match) return null;
  return `${match[1]}${stripCloudinaryTransforms(match[2])}`;
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

/** The unresized original behind a Cloudinary preset or proxy URL, or null. */
export const originalImageUrl = (url: string | undefined | null): string | null =>
  originalCloudinaryUrl(url) ?? originalProxiedUrl(url);

/**
 * `onError` for a resized <img>: retry once with the original image. Returns
 * false when there is nothing left to try, so the caller can show its own
 * fallback.
 */
export const retryWithOriginalImage = (img: HTMLImageElement): boolean => {
  if (img.dataset.cdnFallback === 'original') return false;
  // A preset may be missing (or a CDN error cached); the proxy may be down or
  // refuse the host. Either way the source image itself is still worth a try.
  const original = originalImageUrl(img.currentSrc || img.src);
  if (!original || original === img.src) return false;
  img.dataset.cdnFallback = 'original';
  img.removeAttribute('srcset');
  img.src = original;
  return true;
};

/** `t_<preset>` — the URL segment for a named transformation. */
const presetSegment = (name: string): string => `t_${name}`;

/**
 * The preset for a request.
 *  - blur        → blurred 32px placeholder
 *  - format jpg  → 1200×630 share card (only share cards force JPEG)
 *  - width×height→ cropped box at the nearest preset ratio
 *  - width       → width bucket, shrink-only
 */
const presetFor = (req: { width?: number; height?: number; format?: string; blur?: boolean }): string => {
  if (req.blur) return LQIP_PRESET;
  if (req.format === 'jpg') return OG_PRESET;
  if (req.width && req.height) return boxPresetName(snapPresetRatio(req.width, req.height), snapPresetWidth(req.width));
  return widthPresetName(snapPresetWidth(req.width ?? CLOUDINARY_MAX_WIDTH));
};

// ============================================================================
// External images → our resizing proxy (zero Cloudinary credits)
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
  if (width) params.set('w', String(snapCloudinaryWidth(width)));
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
  if (host === 'res.cloudinary.com' || host.endsWith('googleusercontent.com')) return false;
  if (DIRECT_IMAGE_HOSTS.has(host) || isOwnSiteUrl(url)) return false;
  if (rawUrl.startsWith(`${API_URL}/image-proxy`)) return false;
  // SVGs are never proxied (the proxy rejects them — they can carry script).
  if (/\.svg(?:$|\?)/i.test(url.pathname)) return false;
  return true;
};

/**
 * Size an image URL for display.
 *
 *  - Cloudinary: rebuilt onto a registered preset, e.g.
 *      https://res.cloudinary.com/{cloud}/image/upload/t_be_w800/v{version}/{path}.jpg
 *    Any transforms already in the URL are stripped first. `quality`, `crop`,
 *    `gravity` and `background` are accepted for compatibility but fixed by
 *    the preset (q_auto/f_auto; c_limit for widths, c_fill+g_auto for boxes).
 *  - Google avatars: size parameter.
 *  - Other external images: our resizing proxy.
 */
export const optimizeCloudinaryUrl = (
  url: string | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best';
    /**
     * 'jpg' forces a concrete format — needed for social-media share cards,
     * where `f_auto` can hand a crawler a WebP it won't render.
     */
    format?: 'auto' | 'webp' | 'avif' | 'jpg';
    crop?: 'fill' | 'scale' | 'fit' | 'limit' | 'thumb' | 'pad';
    gravity?: 'auto' | 'center';
    /** Fill colour for `crop: 'pad'` — a CSS colour name or `rgb:RRGGBB`. */
    background?: string;
    /**
     * Gaussian blur radius (`e_blur`), 1–2000, applied after the resize.
     *
     * This is what a blur-up placeholder wants. A photo asked for at a few
     * dozen pixels wide arrives as visible blocks, and a browser painting it
     * across a full panel enlarges the blocks rather than hiding them — the
     * result reads as a broken image, not as a photo on its way. Blurring the
     * downscale turns the same bytes into a soft colour wash.
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

  // Handle Cloudinary upload URLs — including those with transforms baked in.
  // The transforms are stripped (so an earlier crop never stacks with ours)
  // and replaced by exactly one registered preset.
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    const uploadBaseMatch = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
    if (uploadBaseMatch) {
      const [, base, rest] = uploadBaseMatch;
      const cleanPath = stripCloudinaryTransforms(rest);
      const wantsBlur = typeof blur === 'number' && Number.isFinite(blur) && blur >= 1;
      const preset = presetFor({ width: requestedWidth, height: requestedHeight, format, blur: wantsBlur });
      return `${base}${presetSegment(preset)}/${cleanPath}`;
    }
    return url;
  }

  // Handle Google user content URLs (avatars) - resize via URL param
  if (url.includes('lh3.googleusercontent.com') || url.includes('googleusercontent.com')) {
    const size = clampDimension(requestedWidth, 512) || 96;
    // Remove any existing size suffix and add our own
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
 * Generates a srcSet string for responsive Cloudinary images.
 * Returns an empty string for non-Cloudinary URLs.
 */
export const cloudinarySrcSet = (
  url: string | undefined,
  widths: number[] = [480, 800, 1280, 1920],
  options: {
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best';
    format?: 'auto' | 'webp';
    crop?: 'fill' | 'scale' | 'fit' | 'limit';
  } = {}
): string => {
  if (!url || typeof url !== 'string') return '';

  // Security: Only allow http/https URLs
  if (!/^https?:\/\//i.test(url)) return '';

  // Only generate srcSet for Cloudinary upload URLs
  const uploadMatch = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+$/);
  if (!uploadMatch) return '';

  // Widths are snapped to buckets, so two candidates can collapse into one —
  // describe each by its real width and list it once.
  const seen = new Set<number>();
  return widths
    .map(snapCloudinaryWidth)
    .filter((w) => (seen.has(w) ? false : (seen.add(w), true)))
    .map((w) => `${optimizeCloudinaryUrl(url, { ...options, width: w })} ${w}w`)
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
