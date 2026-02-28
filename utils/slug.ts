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
 * Generate an SEO-friendly slug for a property listing.
 * Format: "3-bed-apartment-for-sale-in-budva-montenegro_EncodedId"
 *
 * The descriptive prefix provides keyword-rich URLs for SEO.
 * The encoded ID after the underscore is used by the backend for lookup.
 * Raw MongoDB ObjectIds are never exposed in the URL.
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
  const parts: string[] = [];

  if (property.beds && property.beds > 0) {
    parts.push(`${property.beds}-bed`);
  }

  if (property.propertyType) {
    parts.push(property.propertyType);
  }

  const action = property.listingType === 'rent' ? 'for-rent' : 'for-sale';
  parts.push(action);

  if (property.city) {
    parts.push('in');
    parts.push(property.city);
  }

  if (property.country) {
    parts.push(property.country);
  }

  const slug = slugify(parts.join(' '));

  // Append the full encoded ID after underscore (not slugified, preserves case)
  // The backend extracts the ID by splitting on the last underscore
  return `${slug}_${property.id}`;
}
