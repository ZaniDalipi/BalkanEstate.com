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
