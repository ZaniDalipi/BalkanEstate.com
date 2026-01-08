/**
 * Cloudinary configuration for frontend assets
 *
 * City images should be uploaded to Cloudinary in the folder:
 * balkan-estate/city-images/{city-name-normalized}
 *
 * For example:
 * - Tirana → balkan-estate/city-images/tirana
 * - Pristina → balkan-estate/city-images/pristina
 * - Skopje → balkan-estate/city-images/skopje
 *
 * Upload images with the exact city name (lowercase, spaces replaced with hyphens)
 */

// Cloudinary cloud name - update this with your actual cloud name
export const CLOUDINARY_CLOUD_NAME = 'balkanestate';

// Base URL for Cloudinary images
export const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Folder path for city images in Cloudinary
export const CITY_IMAGES_FOLDER = 'balkan-estate/city-images';

/**
 * Normalizes a city name for use in Cloudinary URLs
 * @param cityName - The city name (e.g., "Tirana", "Novi Sad")
 * @returns Normalized city name (e.g., "tirana", "novi-sad")
 */
export const normalizeCityName = (cityName: string): string => {
  return cityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ''); // Remove special characters
};

/**
 * Generates a Cloudinary URL for a city image with optimizations
 * @param cityName - The city name
 * @param options - Optional transformation options
 * @returns The full Cloudinary URL for the city image
 */
export const getCityImageUrl = (
  cityName: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
    gravity?: 'auto' | 'center' | 'face' | 'faces';
  } = {}
): string => {
  const {
    width = 800,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = options;

  const normalizedName = normalizeCityName(cityName);

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `g_${gravity}`,
    `q_${quality}`,
    `f_${format}`,
  ].join(',');

  return `${CLOUDINARY_BASE_URL}/${transformations}/${CITY_IMAGES_FOLDER}/${normalizedName}`;
};

/**
 * Generates a low-quality placeholder URL for blur-up effect
 * @param cityName - The city name
 * @returns The placeholder URL with blur effect
 */
export const getCityImagePlaceholder = (cityName: string): string => {
  const normalizedName = normalizeCityName(cityName);

  return `${CLOUDINARY_BASE_URL}/w_50,h_38,c_fill,g_auto,q_10,e_blur:1000,f_auto/${CITY_IMAGES_FOLDER}/${normalizedName}`;
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
  // Slovenia
  'ljubljana', 'maribor', 'celje', 'kranj', 'koper',
  // Greece
  'thessaloniki', 'athens', 'patras', 'larissa', 'volos',
  // Bulgaria
  'sofia', 'plovdiv', 'varna', 'burgas', 'ruse',
] as const;
