/**
 * Helpers for our own photo URLs on the server (R2 media CDN).
 */

import { parseMediaUrl, mediaFileUrl, MEDIA_MASTER_FILE } from '../config/mediaVariants';

/**
 * The master (`{photoKey}/original.jpg`) of one of our R2 photos, given any of
 * its size URLs, or null when the URL isn't on our media domain.
 */
export const originalMediaUrl = (url: string, mediaBaseUrl: string | null = process.env.R2_PUBLIC_URL || null): string | null => {
  const parsed = parseMediaUrl(url, mediaBaseUrl);
  return parsed && mediaBaseUrl ? mediaFileUrl(mediaBaseUrl, parsed.photoKey, MEDIA_MASTER_FILE) : null;
};
