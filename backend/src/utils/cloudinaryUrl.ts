/**
 * Helpers for stored-image URLs on the server (Cloudinary and R2).
 */

import { parseMediaUrl, mediaFileUrl, MEDIA_MASTER_FILE } from '../config/mediaVariants';

export const CLOUDINARY_UPLOAD_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/**
 * Strip the transformation segments a Cloudinary URL carries, leaving the
 * versioned public id. Transform tokens look like `key_value` with a 1–3
 * character key (`c_fill`, `w_1200`, `t_be_w480`); folders and filenames don't.
 */
export const stripCloudinaryTransforms = (rest: string): string => {
  const parts = rest.split('/');

  const versionIdx = parts.findIndex((part) => /^v\d+$/.test(part));
  if (versionIdx !== -1) return parts.slice(versionIdx).join('/');

  const firstNonTransform = parts.findIndex(
    (part) => !part.split(',').every((token) => /^[a-z]{1,3}_/.test(token))
  );
  return firstNonTransform !== -1 ? parts.slice(firstNonTransform).join('/') : rest;
};

/**
 * The untransformed original of a Cloudinary image URL. Fetching the original
 * is always allowed — even with "Strict transformations" on — and costs no
 * transformation credit. Returns null for anything that isn't a Cloudinary
 * image upload URL.
 */
export const originalCloudinaryUrl = (url: string): string | null => {
  const match = url.split(/[?#]/)[0].match(CLOUDINARY_UPLOAD_RE);
  if (!match) return null;
  const [, base, rest] = match;
  return `${base}${stripCloudinaryTransforms(rest)}`;
};

/**
 * The master of one of our R2 photos (`{photoKey}/original.jpg`), given any
 * of its variant URLs, or null when the URL isn't on our media domain.
 */
export const originalR2Url = (url: string, mediaBaseUrl: string | null = process.env.R2_PUBLIC_URL || null): string | null => {
  const parsed = parseMediaUrl(url, mediaBaseUrl);
  return parsed && mediaBaseUrl ? mediaFileUrl(mediaBaseUrl, parsed.photoKey, MEDIA_MASTER_FILE) : null;
};

/** The unresized original of a stored photo — R2 or Cloudinary — or null. */
export const originalStoredImageUrl = (url: string): string | null => originalR2Url(url) ?? originalCloudinaryUrl(url);
