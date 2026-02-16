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
 * Format: "3-bed-apartment-for-sale-in-budva-montenegro-{id}"
 * The MongoDB ID is appended for uniqueness, while the descriptive
 * prefix provides keyword-rich URLs that search engines prefer.
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

  // Append short ID for uniqueness (last 6 chars of MongoDB ObjectId)
  const shortId = property.id.length > 6 ? property.id.slice(-6) : property.id;
  parts.push(shortId);

  return slugify(parts.join(' '));
}
