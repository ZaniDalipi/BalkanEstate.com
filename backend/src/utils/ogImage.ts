/**
 * Share-card image resolution for the OG middleware.
 *
 * This mirrors the frontend's `optimizeCloudinaryUrl` (config/cloudinaryConfig.ts):
 * same security checks, same "strip transforms already baked into the URL"
 * behaviour, so a picture already cropped square doesn't get cropped a second
 * time on its way into a share card. It is a separate copy only because the
 * backend is its own package — `tsconfig.rootDir` is `backend/src`, so it
 * cannot import from the frontend tree. Keep the two in step.
 */

import { OG_BASE_URL } from '../config/ogConstants';

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
 * Cloudinary delivery options for a share card: any picture — including a
 * square or portrait profile photo — is scaled to fit 1200×630 and padded onto
 * white, so the subject is never cropped out.
 *
 * `f_jpg` rather than the usual `f_auto`: crawlers send no useful Accept
 * header, and a WebP some of them can't render means no preview at all. Every
 * parameter is core Cloudinary — no add-on or paid-plan feature.
 */
const OG_CARD_TRANSFORM = 'f_jpg,q_auto,w_1200,h_630,c_pad,b_white';

const CLOUDINARY_UPLOAD_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/**
 * Strip the transformation segments a Cloudinary URL already carries, leaving
 * the versioned public id. Transform tokens always look like `key_value` with a
 * 1–3 character key (`c_fill`, `w_1200`, `ar_16:9`); folders and filenames
 * don't.
 */
function stripCloudinaryTransforms(rest: string): string {
  const parts = rest.split('/');

  const versionIdx = parts.findIndex(part => /^v\d+$/.test(part));
  if (versionIdx !== -1) return parts.slice(versionIdx).join('/');

  const firstNonTransform = parts.findIndex(
    part => !part.split(',').every(token => /^[a-z]{1,3}_/.test(token)),
  );
  return firstNonTransform !== -1 ? parts.slice(firstNonTransform).join('/') : rest;
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

  const match = url.match(CLOUDINARY_UPLOAD_RE);
  if (match) {
    const [, base, rest] = match;
    return { url: `${base}${OG_CARD_TRANSFORM}/${stripCloudinaryTransforms(rest)}`, sized: true };
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
