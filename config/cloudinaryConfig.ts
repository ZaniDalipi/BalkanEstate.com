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
