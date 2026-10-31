/**
 * Share-card image resolution for the OG middleware.
 *
 * Photos on our R2 media CDN are advertised by their JPEG master
 * (`original.jpg`, ≤1920px — crawlers want JPEG and crop it themselves);
 * anything else is advertised as is.
 * Mirrors functions/_og-utils.ts (the Pages Functions copy) — keep in step.
 */

import { OG_BASE_URL } from '../config/ogConstants';
import { parseMediaUrl, mediaFileUrl, MEDIA_MASTER_FILE } from '../config/mediaVariants';

export const DEFAULT_OG_IMAGE = `${OG_BASE_URL}/og-image.jpg`;

/**
 * An image ready to be advertised as og:image. `sized` says whether we know it
 * really is 1200×630 — only then may og:image:width/height be emitted, since
 * dimensions that don't match make Facebook and LinkedIn lay the card out
 * wrong or drop the image entirely.
 */
export interface OgImage {
  url: string;
  sized: boolean;
}

/** Normalize one image candidate, or null if it can't be used as og:image. */
function normalizeOgImage(raw?: string): OgImage | null {
  const url = (raw ?? '').trim();
  if (!url) return null;

  // Site-relative path → absolute; crawlers reject relative og:image values.
  if (url.startsWith('/')) return { url: `${OG_BASE_URL}${url}`, sized: false };

  // Only http(s): rejects data: (inline DiceBear avatars, which crawlers can't
  // fetch anyway), javascript:, and anything else.
  if (!/^https?:\/\//i.test(url)) return null;

  // Reject embedded newlines / control characters before the URL reaches a
  // meta tag.
  if (/[\u0000-\u001f\u007f]/.test(url)) return null;

  // R2 photos: the JPEG master, whatever size the stored URL pointed at.
  const mediaBase = process.env.R2_PUBLIC_URL || null;
  const media = parseMediaUrl(url, mediaBase);
  if (media && mediaBase) {
    return { url: mediaFileUrl(mediaBase, media.photoKey, MEDIA_MASTER_FILE), sized: false };
  }

  // Google OAuth avatars carry their own size parameter.
  if (url.includes('googleusercontent.com')) {
    return { url: `${url.replace(/=s\d+(-c)?$/, '')}=s512`, sized: false };
  }

  return { url, sized: false };
}

/**
 * Pick the first usable image from a priority list, falling back to the site's
 * default OG image.
 */
export function resolveOgImage(...candidates: Array<string | undefined>): OgImage {
  for (const candidate of candidates) {
    const image = normalizeOgImage(candidate);
    if (image) return image;
  }
  return { url: DEFAULT_OG_IMAGE, sized: true };
}
