/**
 * Image delivery configuration for the frontend.
 *
 * Images are stored on Bunny Edge Storage and served through a pull zone with
 * Bunny Optimizer enabled, which resizes and re-encodes at the edge from query
 * parameters:
 *
 *   https://cdn.example.net/balkan-estate/users/1/a.webp?width=800&quality=82
 *
 * The parameter names and the quality ladder mirror `backend/src/utils/bunnyUrl.ts`
 * — the backend builds the URLs it stores, this builds the ones the browser
 * requests, and the two must agree.
 *
 * City images have storage paths in this format:
 *   balkan-estate/cities/city-{country}-{city}.jpg
 * For example:
 * - Durres, Albania → balkan-estate/cities/city-albania-durres.jpg
 * - Skopje, North Macedonia → balkan-estate/cities/city-north-macedonia-skopje.jpg
 */

/** CDN hostname images are served from, without scheme. */
export const CDN_HOST: string = (import.meta.env.VITE_CDN_HOST || '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

/** Base URL for CDN images. */
export const CDN_BASE_URL = `https://${CDN_HOST}`;

/** Folder holding the curated one-per-city photo library. */
export const CITY_IMAGE_FOLDER = 'balkan-estate/cities';

/**
 * Normalizes a name for use in image paths
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
 * Quality presets. Must match QUALITY_PRESETS in backend/src/utils/bunnyUrl.ts.
 *
 * Every rung sits at or below the stored master's own quality, because the
 * master is already a lossy WebP: asking the edge for more than it holds
 * cannot recover detail, it only ships bytes reproducing the first encode's
 * artifacts. Since the CDN bills per GB delivered, these numbers are the
 * largest single lever on the hosting bill.
 */
const QUALITY_PRESETS: Record<string, number> = {
  auto: 75,
  'auto:low': 45,
  'auto:eco': 58,
  'auto:good': 70,
  'auto:best': 82,
};

export type ImageQuality = 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: ImageQuality | number;
  /** `auto` omits the parameter — Bunny negotiates WebP/AVIF from `Accept`. */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'fill' | 'scale' | 'fit' | 'limit' | 'thumb' | 'pad';
  /**
   * Accepted for call-site compatibility and intentionally ignored: Bunny
   * always crops from the centre, and there is no `g_auto` equivalent to
   * pick a subject. Kept in the signature so the many callers that pass it
   * do not each need a special case.
   */
  gravity?: 'auto' | 'center';
  /** Gaussian blur, 0–100. Used for the LQIP placeholders. */
  blur?: number;
  /** Fill colour for `crop: 'pad'`, as `RRGGBB` (no leading `#`). */
  background?: string;
}

/** Query parameters that are ours to rewrite when re-optimizing a URL. */
const TRANSFORM_PARAMS = [
  'width',
  'height',
  'aspect_ratio',
  'quality',
  'format',
  'blur',
  'background',
] as const;

/**
 * Clamp to a sane range. A value below the minimum is dropped rather than
 * raised to it — `width: 0` means "no width", and clamping it up to 1 would
 * render a one-pixel image. Mirrors `clamp` in backend/src/utils/bunnyUrl.ts.
 */
const clamp = (value: number | undefined, min: number, max: number): number | undefined => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value < min) return undefined;
  return Math.min(Math.round(value), max);
};

const resolveQuality = (quality: ImageQuality | number | undefined): number | undefined => {
  if (quality === undefined) return undefined;
  if (typeof quality === 'number') return clamp(quality, 1, 100);
  return QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.auto;
};

/**
 * Apply transform options to a `URLSearchParams`, replacing any already there.
 *
 * Shared by every builder below so a URL that has been through this once — as
 * stored URLs have — comes back out with exactly the transforms just asked for,
 * rather than the union of both. That is the query-string equivalent of the old
 * transform-stripping the Cloudinary version had to do, and it exists for
 * the same reason: an
 * already-cropped URL being cropped again silently produced the wrong picture.
 */
const applyTransforms = (params: URLSearchParams, options: ImageTransformOptions): void => {
  TRANSFORM_PARAMS.forEach(key => params.delete(key));

  const width = clamp(options.width, 1, 4096);
  const height = clamp(options.height, 1, 4096);
  const quality = resolveQuality(options.quality);
  const blur = clamp(options.blur, 0, 100);

  // `fill`/`thumb` crop to exactly the requested box. Bunny letterboxes when
  // given both dimensions, so the ratio is requested explicitly instead.
  const cropsToBox = options.crop === 'fill' || options.crop === 'thumb';

  if (cropsToBox && width && height) {
    params.set('aspect_ratio', `${width}:${height}`);
    params.set('width', String(width));
  } else {
    if (width) params.set('width', String(width));
    if (height) params.set('height', String(height));
  }

  if (quality !== undefined) params.set('quality', String(quality));
  if (blur) params.set('blur', String(blur));

  if (options.format && options.format !== 'auto') {
    params.set('format', options.format === 'jpg' ? 'jpeg' : options.format);
  }

  if (options.crop === 'pad' && options.background && /^[0-9a-f]{6}$/i.test(options.background)) {
    params.set('background', options.background.toLowerCase());
  }
};

/** True when `url` is served by our pull zone (host-exact, never a suffix match). */
export const isCdnUrl = (url: string): boolean => {
  if (!CDN_HOST) return false;
  try {
    return new URL(url).hostname.toLowerCase() === CDN_HOST.toLowerCase();
  } catch {
    return false;
  }
};

/**
 * Build a CDN URL for a storage path.
 */
export const buildCdnUrl = (storagePath: string, options: ImageTransformOptions = {}): string => {
  const params = new URLSearchParams();
  applyTransforms(params, options);
  const qs = params.toString();
  return `${CDN_BASE_URL}/${storagePath.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
};

/**
 * Generates a CDN URL for a city image with optimizations
 * @param cityName - The city name
 * @param options - Optional transformation options including country
 * @returns The full CDN URL for the city image
 */
export const getCityImageUrl = (
  cityName: string,
  options: {
    country?: string;
    width?: number;
    height?: number;
    quality?: ImageQuality | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
    gravity?: 'auto' | 'center' | 'face' | 'faces';
  } = {}
): string => {
  const {
    country,
    width = 800,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  const normalizedCity = normalizeName(cityName);
  const normalizedCountry = country ? normalizeName(country) : 'unknown';
  const storagePath = `${CITY_IMAGE_FOLDER}/city-${normalizedCountry}-${normalizedCity}.jpg`;

  return buildCdnUrl(storagePath, { width, height, quality, format, crop });
};

/**
 * Optimizes an image URL by setting Bunny Optimizer parameters.
 *
 * For URLs not on our CDN, returns the original URL unchanged.
 * For Google user content URLs (avatars), appends a size parameter.
 */
export const optimizeImageUrl = (
  url: string | undefined,
  options: ImageTransformOptions = {}
): string => {
  if (!url || typeof url !== 'string') return '';

  // Security: Only allow http/https URLs, reject data:, javascript:, etc.
  if (!/^https?:\/\//i.test(url)) return '';

  // Security: Reject URLs with embedded newlines or control characters
  if (/[\r\n\x00-\x1f]/.test(url)) return '';

  if (isCdnUrl(url)) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return url;
    }

    // A signed URL's token covers its query string, so changing the transforms
    // would invalidate the signature and the CDN would refuse it outright.
    // These are the private document URLs, which are never rendered responsively.
    if (parsed.searchParams.has('token')) return url;

    applyTransforms(parsed.searchParams, options);
    return parsed.toString();
  }

  // Handle Google user content URLs (avatars) - resize via URL param
  if (url.includes('googleusercontent.com')) {
    const size = clamp(options.width, 1, 512) || 96;
    // Remove any existing size suffix and add our own
    const cleaned = url.replace(/=s\d+-c$/, '').replace(/=s\d+$/, '');
    return `${cleaned}=s${size}`;
  }

  return url;
};

/**
 * Generates a low-quality placeholder URL for property images (blur-up / LQIP effect).
 * Returns a tiny, heavily blurred version of the image for use as a placeholder
 * while the full-resolution image loads.
 *
 * @param imageUrl - A CDN image URL
 * @returns Optimized placeholder URL, or empty string for non-CDN URLs
 */
export const getPropertyImagePlaceholder = (imageUrl: string | undefined): string => {
  if (!imageUrl || !isCdnUrl(imageUrl)) return '';
  return optimizeImageUrl(imageUrl, { width: 20, crop: 'fill', quality: 10, blur: 80 });
};

/**
 * Generates a low-quality placeholder URL for blur-up effect
 * @param cityName - The city name
 * @param country - The country name (optional)
 * @returns The placeholder URL with blur effect
 */
export const getCityImagePlaceholder = (cityName: string, country?: string): string => {
  return getCityImageUrl(cityName, {
    country,
    width: 50,
    height: 38,
    crop: 'fill',
    quality: 10,
  }).concat('&blur=90');
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
 * Generates a srcSet string for responsive CDN images.
 * Returns an empty string for non-CDN URLs.
 */
export const imageSrcSet = (
  url: string | undefined,
  widths: number[] = [400, 640, 800, 1200, 1920],
  options: Omit<ImageTransformOptions, 'width'> = {}
): string => {
  if (!url || typeof url !== 'string') return '';
  if (!/^https?:\/\//i.test(url)) return '';
  if (!isCdnUrl(url)) return '';

  return widths
    .map((w) => `${optimizeImageUrl(url, { ...options, width: w })} ${w}w`)
    .join(', ');
};

/**
 * List of all supported cities for reference
 * When adding new city images, use these normalized names
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
// Pre-defined Asset URLs
//
// These point at Unsplash and use Unsplash's own optimization parameters
// (w, h, q, fm, fit). They were never hosted by us, and routing them through
// our CDN would mean paying to store and serve images Unsplash already serves
// optimized for free.
// ============================================================================

/**
 * Onboarding page images
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
 * Hero/Background images
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
 * Fallback/Placeholder images
 */
export const FALLBACK_IMAGES = {
  // Default property image when no images are uploaded
  property: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&h=375&fit=crop&q=80&fm=webp',
};
