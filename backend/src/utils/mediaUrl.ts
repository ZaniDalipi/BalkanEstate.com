/**
 * Helpers for our own photo URLs on the server (R2 media CDN).
 */

import { parseMediaUrl, parseR2PhotoUrl, mediaFileUrl, MEDIA_MASTER_FILE } from '../config/mediaVariants';

/**
 * The master (`{photoKey}/original.jpg`) of one of our R2 photos, given any of
 * its size URLs, or null when the URL isn't on our media domain.
 */
export const originalMediaUrl = (url: string, mediaBaseUrl: string | null = process.env.R2_PUBLIC_URL || null): string | null => {
  const parsed = parseMediaUrl(url, mediaBaseUrl);
  return parsed && mediaBaseUrl ? mediaFileUrl(mediaBaseUrl, parsed.photoKey, MEDIA_MASTER_FILE) : null;
};

/**
 * The master of a photo in any of our R2 buckets — our media domain or an R2
 * public bucket address (`*.r2.dev`) — given any of its size URLs, or null.
 * Only R2 hosts qualify, so it can't be pointed at an arbitrary server.
 */
export const originalR2PhotoUrl = (url: string, mediaBaseUrl: string | null = process.env.R2_PUBLIC_URL || null): string | null => {
  let mediaHost: string | null = null;
  try {
    mediaHost = mediaBaseUrl ? new URL(mediaBaseUrl).hostname : null;
  } catch {
    mediaHost = null;
  }
  const photo = parseR2PhotoUrl(url, mediaHost);
  return photo ? mediaFileUrl(photo.origin, photo.photoKey, MEDIA_MASTER_FILE) : null;
};
