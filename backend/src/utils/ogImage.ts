/**
 * Share-card image resolution for the OG middleware.
 *
 * This mirrors the frontend's `optimizeImageUrl` (config/imageConfig.ts):
 * same security checks, same "replace the transforms already on the URL"
 * behaviour, so a picture already cropped square doesn't get cropped a second
 * time on its way into a share card. It is a separate copy only because the
 * backend is its own package — `tsconfig.rootDir` is `backend/src`, so it
 * cannot import from the frontend tree. Keep the two in step.
 */

import { OG_BASE_URL } from '../config/ogConstants';
import { BUNNY_PULL_ZONE_HOST } from '../config/bunny';

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

/**
 * Delivery options for a share card: any picture is rendered to exactly
 * 1200×630 so `sized` can be honestly true.
 *
 * `format=jpeg` rather than letting the CDN negotiate: crawlers send no useful
 * Accept header, and a WebP some of them can't render means no preview at all.
 *
 * One deliberate behaviour change from the Cloudinary version, which used
 * `c_pad,b_white` to scale a picture *into* the frame and fill the rest with
 * white. Bunny Optimizer has no pad-with-background mode — `width` + `height`
 * together fit within the box and return something smaller than 1200×630,
 * which is exactly the mismatch that makes Facebook and LinkedIn lay the card
 * out wrong. `aspect_ratio` crops to the frame instead, which guarantees the
 * dimensions. The cost is that a portrait photo loses its top and bottom
 * rather than being letterboxed; property photos, which are almost always
 * landscape, are unaffected.
 */
const OG_CARD_PARAMS: Readonly<Record<string, string>> = {
  aspect_ratio: '1200:630',
  format: 'jpeg',
  quality: '82',
  width: '1200',
};

/**
 * Rebuild a CDN URL with only the share-card transforms.
 *
 * Replacing the whole query string rather than merging is what stops a picture
 * already cropped square from being cropped a second time on its way into a
 * card.
 */
function toOgCardUrl(url: URL): string {
  const params = new URLSearchParams(OG_CARD_PARAMS);
  return `${url.origin}${url.pathname}?${params.toString()}`;
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

  // Images on our own CDN can be rendered to the exact card frame.
  if (BUNNY_PULL_ZONE_HOST) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.toLowerCase() === BUNNY_PULL_ZONE_HOST.toLowerCase()) {
        return { url: toOgCardUrl(parsed), sized: true };
      }
    } catch {
      // Not parseable as a URL — fall through to the untouched-URL case.
    }
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
