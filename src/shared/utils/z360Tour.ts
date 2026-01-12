/**
 * Z360 Virtual Tour Integration Utilities
 *
 * Helps integrate Z360 virtual tours (z360-virtual-tour.vercel.app)
 * with BalkanEstate property listings.
 */

// Z360 base URL configuration
export const Z360_CONFIG = {
  baseUrl: 'https://z360-virtual-tour.vercel.app',
  embedPath: '/tour',
  defaultWidth: '100%',
  defaultHeight: '100%',
};

/**
 * Check if a URL is a Z360 tour URL
 */
export function isZ360TourUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'z360-virtual-tour.vercel.app' ||
      parsed.hostname.includes('z360')
    );
  } catch {
    return false;
  }
}

/**
 * Extract tour ID from a Z360 URL
 * Supports formats:
 * - https://z360-virtual-tour.vercel.app/tour/abc123
 * - https://z360-virtual-tour.vercel.app/view/abc123
 * - https://z360-virtual-tour.vercel.app/abc123
 */
export function extractZ360TourId(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Handle /tour/ID or /view/ID format
    const pathMatch = parsed.pathname.match(/\/(tour|view)\/([^/?]+)/);
    if (pathMatch) {
      return pathMatch[2];
    }

    // Handle /ID format (direct ID in path)
    const directMatch = parsed.pathname.match(/^\/([a-zA-Z0-9_-]+)$/);
    if (directMatch && directMatch[1] !== 'tour' && directMatch[1] !== 'view') {
      return directMatch[1];
    }

    // Handle ?id=ID format
    const idParam = parsed.searchParams.get('id');
    if (idParam) {
      return idParam;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a Z360 embed URL from a tour ID
 */
export function generateZ360EmbedUrl(tourId: string, options?: {
  autoplay?: boolean;
  controls?: boolean;
  fullscreen?: boolean;
}): string {
  const params = new URLSearchParams();

  if (options?.autoplay) params.set('autoplay', '1');
  if (options?.controls === false) params.set('controls', '0');
  if (options?.fullscreen === false) params.set('fullscreen', '0');

  const queryString = params.toString();
  const base = `${Z360_CONFIG.baseUrl}/tour/${tourId}`;

  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Generate a Z360 embed URL from any Z360 URL
 */
export function normalizeZ360Url(url: string): string {
  const tourId = extractZ360TourId(url);
  if (tourId) {
    return generateZ360EmbedUrl(tourId);
  }
  // Return original URL if we can't parse it
  return url;
}

/**
 * Validate a Z360 tour URL format
 */
export function validateZ360Url(url: string): {
  isValid: boolean;
  tourId: string | null;
  normalizedUrl: string | null;
  error?: string;
} {
  if (!url) {
    return { isValid: false, tourId: null, normalizedUrl: null, error: 'URL is required' };
  }

  if (!isZ360TourUrl(url)) {
    return {
      isValid: false,
      tourId: null,
      normalizedUrl: null,
      error: 'URL must be from z360-virtual-tour.vercel.app',
    };
  }

  const tourId = extractZ360TourId(url);
  if (!tourId) {
    return {
      isValid: false,
      tourId: null,
      normalizedUrl: null,
      error: 'Could not extract tour ID from URL',
    };
  }

  return {
    isValid: true,
    tourId,
    normalizedUrl: generateZ360EmbedUrl(tourId),
  };
}

/**
 * Generate iframe HTML for embedding a Z360 tour
 */
export function generateZ360IframeHtml(tourIdOrUrl: string, options?: {
  width?: string | number;
  height?: string | number;
  title?: string;
}): string {
  const url = isZ360TourUrl(tourIdOrUrl)
    ? normalizeZ360Url(tourIdOrUrl)
    : generateZ360EmbedUrl(tourIdOrUrl);

  const width = options?.width || Z360_CONFIG.defaultWidth;
  const height = options?.height || Z360_CONFIG.defaultHeight;
  const title = options?.title || 'Z360 Virtual Tour';

  return `<iframe
  src="${url}"
  width="${width}"
  height="${height}"
  title="${title}"
  frameborder="0"
  allowfullscreen
  allow="xr-spatial-tracking; gyroscope; accelerometer"
  loading="lazy"
></iframe>`;
}

/**
 * Check if any URL is a supported 360 tour provider
 */
export function is360TourUrl(url: string): {
  isValid: boolean;
  provider: 'z360' | 'matterport' | 'kuula' | 'zillow' | 'other' | null;
} {
  if (!url) return { isValid: false, provider: null };

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes('z360') || hostname === 'z360-virtual-tour.vercel.app') {
      return { isValid: true, provider: 'z360' };
    }
    if (hostname.includes('matterport') || hostname.includes('my.matterport.com')) {
      return { isValid: true, provider: 'matterport' };
    }
    if (hostname.includes('kuula')) {
      return { isValid: true, provider: 'kuula' };
    }
    if (hostname.includes('zillow') && parsed.pathname.includes('3d-home')) {
      return { isValid: true, provider: 'zillow' };
    }

    // Accept other URLs that might be 360 tours
    return { isValid: true, provider: 'other' };
  } catch {
    return { isValid: false, provider: null };
  }
}

export default {
  Z360_CONFIG,
  isZ360TourUrl,
  extractZ360TourId,
  generateZ360EmbedUrl,
  normalizeZ360Url,
  validateZ360Url,
  generateZ360IframeHtml,
  is360TourUrl,
};
