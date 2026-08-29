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
  const {
    country,
    width = 800,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = options;

  const normalizedCity = normalizeName(cityName);
  const normalizedCountry = country ? normalizeName(country) : 'unknown';

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `g_${gravity}`,
    `q_${quality}`,
    `f_${format}`,
  ].join(',');

  // Public ID format: city-{country}-{city}
  const publicId = `city-${normalizedCountry}-${normalizedCity}`;

  return `${CLOUDINARY_BASE_URL}/${transformations}/${publicId}`;
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
  return `${uploadMatch[1]}w_20,c_fill,q_10,e_blur:500,f_auto/${uploadMatch[2]}`;
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

  return `${CLOUDINARY_BASE_URL}/w_50,h_38,c_fill,g_auto,q_10,e_blur:1000,f_auto/${publicId}`;
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

/**
 * Optimizes a Cloudinary-uploaded image URL by injecting transformation parameters.
 *
 * Cloudinary upload URLs follow this format:
 *   https://res.cloudinary.com/{cloud}/image/upload/v{version}/{path}.jpg
 *
 * We inject transforms between `/upload/` and the version/path:
 *   https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto,w_800/v{version}/{path}.jpg
 *
 * For non-Cloudinary URLs, returns the original URL unchanged.
 *
 * For Google user content URLs (avatars), appends size parameter.
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

  const {
    width: rawWidth,
    height: rawHeight,
    quality = 'auto',
    format = 'auto',
    crop,
    gravity,
    background,
  } = options;

  const width = clampDimension(rawWidth, 4096);
  const height = clampDimension(rawHeight, 4096);

  // Security: the background goes straight into the URL's transform segment,
  // so only accept a colour name or an explicit rgb:hex value.
  const safeBackground =
    background && /^(?:[a-z]{3,20}|rgb:[0-9a-f]{3,8})$/i.test(background) ? background : undefined;

  // Handle Cloudinary upload URLs — including those with existing transforms baked in.
  // We find the version segment (v{digits}) to separate any pre-existing transforms
  // from the versioned public ID, then rebuild the URL with only the requested options.
  // This prevents pre-existing crops (e.g. c_fill,ar_16:9) from silently cropping images.
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    const uploadBaseMatch = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
    if (uploadBaseMatch) {
      const [, base, rest] = uploadBaseMatch;
      const cleanPath = stripCloudinaryTransforms(rest);

      const transforms: string[] = [`f_${format}`, `q_${quality}`];
      if (width) transforms.push(`w_${width}`);
      if (height) transforms.push(`h_${height}`);
      if (crop) transforms.push(`c_${crop}`);
      if (gravity) transforms.push(`g_${gravity}`);
      if (safeBackground) transforms.push(`b_${safeBackground}`);
      return `${base}${transforms.join(',')}/${cleanPath}`;
    }
    return url;
  }

  // Handle Google user content URLs (avatars) - resize via URL param
  if (url.includes('lh3.googleusercontent.com') || url.includes('googleusercontent.com')) {
    const size = clampDimension(rawWidth, 512) || 96;
    // Remove any existing size suffix and add our own
    const cleaned = url.replace(/=s\d+-c$/, '').replace(/=s\d+$/, '');
    return `${cleaned}=s${size}`;
  }

  return url;
};

/**
 * Generates a srcSet string for responsive Cloudinary images.
 * Returns an empty string for non-Cloudinary URLs.
 */
export const cloudinarySrcSet = (
  url: string | undefined,
  widths: number[] = [400, 640, 800, 1200, 1920],
  options: {
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best';
    format?: 'auto' | 'webp';
    crop?: 'fill' | 'scale' | 'fit' | 'limit';
    /** Spread into optimizeCloudinaryUrl below; it was reaching the URL at
     *  runtime but was missing here, so callers setting it failed to compile. */
    gravity?: 'auto' | 'center';
  } = {}
): string => {
  if (!url || typeof url !== 'string') return '';

  // Security: Only allow http/https URLs
  if (!/^https?:\/\//i.test(url)) return '';

  // Only generate srcSet for Cloudinary upload URLs
  const uploadMatch = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+$/);
  if (!uploadMatch) return '';

  return widths
    .map((w) => {
      const optimized = optimizeCloudinaryUrl(url, { ...options, width: w });
      return `${optimized} ${w}w`;
    })
    .join(', ');
};

// ============================================================================
// External Image Optimization (Cloudinary Fetch)
// ============================================================================

/**
 * Cloudinary fetch base URL for optimizing external images
 * This fetches, caches, and optimizes images from external URLs
 */
export const CLOUDINARY_FETCH_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch`;

/**
 * Optimizes an external image URL using Cloudinary's fetch feature
 * Benefits:
 * - Automatic format conversion (WebP for supported browsers)
 * - Compression and quality optimization
 * - CDN caching for faster global delivery
 * - Responsive image sizing
 *
 * @param externalUrl - The external image URL (e.g., Unsplash, Pexels)
 * @param options - Transformation options
 * @returns Optimized Cloudinary fetch URL
 */
export const getOptimizedExternalImage = (
  externalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'scale' | 'fit' | 'thumb' | 'limit';
    gravity?: 'auto' | 'center' | 'face' | 'faces';
  } = {}
): string => {
  // Security: Validate URL
  if (!externalUrl || typeof externalUrl !== 'string' || !/^https?:\/\//i.test(externalUrl)) {
    return '';
  }

  const {
    width,
    height,
    quality = 'auto:good',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = options;

  // Build transformation string
  const transformations: string[] = [];

  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (gravity) transformations.push(`g_${gravity}`);
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);

  const transformString = transformations.join(',');

  // Encode the external URL
  const encodedUrl = encodeURIComponent(externalUrl);

  return `${CLOUDINARY_FETCH_URL}/${transformString}/${encodedUrl}`;
};

/**
 * Generates srcSet for responsive external images
 * @param externalUrl - The external image URL
 * @param sizes - Array of widths for srcSet (default: [300, 400, 500, 600])
 * @returns srcSet string
 */
export const getOptimizedExternalImageSrcSet = (
  externalUrl: string,
  sizes: number[] = [300, 400, 500, 600],
  height?: number
): string => {
  return sizes
    .map((width) => {
      const url = getOptimizedExternalImage(externalUrl, {
        width,
        height: height ? Math.round(height * (width / sizes[sizes.length - 1])) : undefined,
        quality: 'auto:good',
        format: 'auto',
        crop: 'fill',
        gravity: 'auto',
      });
      return `${url} ${width}w`;
    })
    .join(', ');
};

// ============================================================================
// Pre-defined Optimized Asset URLs
// These are commonly used images cached via Cloudinary fetch for faster loading
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
