/**
 * `getPropertyImagePlaceholder` used to build its URL from a regex that
 * required the path after `/upload/` to start `v<digits>/`. Plenty of real
 * Cloudinary URLs do not: an upload into a folder carries no version segment,
 * and a URL that already has transforms carries them first. Every one of those
 * returned '' — no placeholder.
 *
 * That is not a cosmetic loss. Callers fall back to the full-size photo, so
 * the blurred backdrop behind a contained photo became a full-resolution copy
 * of it, cover-cropped and scaled up: on a 208px thumbnail the card reads as
 * one zoomed, soft image instead of a photo shown whole against a wash.
 *
 * These tests pin that every shape of Cloudinary upload URL produces a real
 * placeholder, and that nothing else is ever passed off as one.
 */

import { describe, it, expect } from 'vitest';
import {
  getPropertyImagePlaceholder,
  isCloudinaryUploadUrl,
  LQIP_WIDTH,
  LQIP_BLUR,
} from '@/config/cloudinaryConfig';

const BASE = 'https://res.cloudinary.com/dh8tbq8wy/image/upload';

/** Every shape a listing photo actually arrives in. */
const UPLOAD_URLS: Array<[string, string]> = [
  ['version + file', `${BASE}/v1700000000/room.jpg`],
  ['version + folder', `${BASE}/v1700000000/listing/room.jpg`],
  ['no version, folder', `${BASE}/balkan/properties/abc123.jpg`],
  ['no version, bare file', `${BASE}/abc123.jpg`],
  ['transforms + version', `${BASE}/c_fill,w_1200,g_auto/v1700000000/listing/room.jpg`],
  ['transforms, no version', `${BASE}/f_auto,q_auto/balkan/properties/abc123.jpg`],
  ['http rather than https', `${BASE.replace('https', 'http')}/v1700000000/room.jpg`],
];

describe('getPropertyImagePlaceholder', () => {
  it.each(UPLOAD_URLS)('derives a placeholder from a URL with %s', (_label, url) => {
    const lqip = getPropertyImagePlaceholder(url);

    expect(lqip).not.toBe('');
    // It has to be small and blurred on the CDN. A placeholder that is merely
    // the photo again is what turned the backdrop into a zoomed second copy.
    expect(lqip).toContain(`w_${LQIP_WIDTH}`);
    expect(lqip).toContain(`e_blur:${LQIP_BLUR}`);
    expect(lqip).not.toBe(url);
  });

  it('keeps the asset while dropping transforms already on the URL', () => {
    // The point of going through `optimizeCloudinaryUrl`: a baked-in c_fill
    // must not survive into the placeholder, but the public ID must.
    const lqip = getPropertyImagePlaceholder(
      `${BASE}/c_fill,w_1200,g_auto/v1700000000/listing/room.jpg`
    );
    expect(lqip).toContain('/listing/room.jpg');
    expect(lqip).not.toContain('c_fill');
    expect(lqip).not.toContain('w_1200');
  });

  it('never upscales a source smaller than the placeholder', () => {
    // `c_limit`, not `c_fill`: a 30px source asked for at 40 would otherwise
    // come back stretched, and a stretched blur is a smear, not a wash.
    expect(getPropertyImagePlaceholder(`${BASE}/v1/room.jpg`)).toContain('c_limit');
  });

  it('returns nothing rather than pass a full-size image off as a placeholder', () => {
    [
      undefined,
      '',
      'not a url',
      'https://example.com/photo.jpg',
      // A Cloudinary URL, but not an upload one — nothing to derive.
      'https://res.cloudinary.com/dh8tbq8wy/image/fetch/https://example.com/a.jpg',
      // Rejected by the optimiser on security grounds, so it must not leak out.
      'javascript:alert(1)',
      'data:image/png;base64,iVBORw0KGgo=',
    ].forEach((url) => {
      expect(getPropertyImagePlaceholder(url as string | undefined)).toBe('');
    });
  });
});

describe('isCloudinaryUploadUrl', () => {
  it('accepts every upload shape and nothing else', () => {
    UPLOAD_URLS.forEach(([, url]) => expect(isCloudinaryUploadUrl(url)).toBe(true));

    [undefined, '', 'https://example.com/a.jpg', `${BASE}/`].forEach((url) =>
      expect(isCloudinaryUploadUrl(url as string | undefined)).toBe(false)
    );
  });
});
