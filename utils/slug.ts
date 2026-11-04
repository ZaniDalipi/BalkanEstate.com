/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to slugify
 * @returns A lowercase, hyphen-separated slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove non-word chars (except hyphens)
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}

/**
 * Generate a URL-safe identifier for a property listing.
 * Format: "EncodedId" (just the encoded ID, no slug prefix)
 *
 * Using the ID-only format avoids issues where the encoded ID itself
 * contains underscores, which would break slug-suffix extraction on the backend.
 */
export function generatePropertySlug(property: {
  id: string;
  beds?: number;
  propertyType?: string;
  listingType?: string;
  city?: string;
  country?: string;
  address?: string;
}): string {
  return property.id;
}

/**
 * Generate an SEO-friendly slug for a business listing.
 * Format: "balkanestate-real-estate-law-in-skopje-north-macedonia_EncodedId"
 *
 * The descriptive prefix provides keyword-rich URLs for SEO.
 * The encoded ID after the underscore is used by the backend for lookup.
 * Raw MongoDB ObjectIds are never exposed in the URL.
 */
export function generateBusinessSlug(listing: {
  id: string;
  name: string;
  category?: string;
  city?: string;
  country?: string;
}): string {
  const parts: string[] = [];

  if (listing.name) {
    parts.push(listing.name);
  }

  if (listing.category) {
    parts.push(listing.category.replace(/_/g, '-'));
  }

  if (listing.city) {
    parts.push('in');
    parts.push(listing.city);
  }

  if (listing.country) {
    parts.push(listing.country);
  }

  const slug = slugify(parts.join(' '));

  // Append the encoded ID after underscore (not slugified, preserves case)
  // The backend extracts the ID by splitting on the last underscore
  return `${slug}_${listing.id}`;
}

/** Encoded ids are always 16 base64url characters — and base64url includes "_" and "-". */
const ENCODED_ID = /^[A-Za-z0-9_-]{16}$/;

/**
 * The listing id inside a business URL segment — the inverse of
 * generateBusinessSlug. The id is the LAST 16 characters after the separating
 * "_": splitting on the last underscore instead would cut an id that itself
 * contains one ("…_Ab_qkgXEcz8pju5t" → "qkgXEcz8pju5t", a 404). A segment that
 * is not a slug (a bare id, or the listing's own slug field) is returned as
 * it is, for the API to resolve.
 */
export function businessIdFromSlug(segment: string): string {
  const id = segment.slice(-16);
  if (segment.length > 17 && segment[segment.length - 17] === '_' && ENCODED_ID.test(id)) return id;
  return segment;
}
