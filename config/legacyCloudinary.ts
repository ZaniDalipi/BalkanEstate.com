/**
 * Images already on Cloudinary — read-only.
 *
 * Everything uploaded before the move to R2 stays on Cloudinary, untouched
 * (see docs/MEDIA_STORAGE.md); new uploads go to R2 only. This file shows
 * those existing images exactly as before: straight from Cloudinary's CDN
 * through the named transformations already registered on the account
 * (`t_be_w480`, `t_be_r4x3_w320`, `t_be_lqip`, `t_be_og`). With "Strict
 * transformations" on, Cloudinary refuses any other transformation, so these
 * names and widths must not change. Nothing here uploads to Cloudinary.
 */

export const CLOUDINARY_CLOUD_NAME = 'dh8tbq8wy';
export const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// ── Presets registered on the Cloudinary account ────────────────────────────

/** Width buckets; requests round UP to the next one. Masters are ≤1920px. */
const PRESET_WIDTHS = [32, 64, 128, 240, 320, 480, 640, 800, 1080, 1280, 1600, 1920] as const;

/** Aspect ratios for fixed boxes (width × height requests), as `w:h`. */
const PRESET_RATIOS = {
  '1x1': '1:1',
  '4x3': '4:3',
  '3x4': '3:4',
  '3x2': '3:2',
  '16x9': '16:9',
  '2x1': '2:1',
} as const;
type PresetRatioKey = keyof typeof PRESET_RATIOS;

const LQIP_PRESET = 'be_lqip';
const OG_PRESET = 'be_og';
const widthPresetName = (width: number): string => `be_w${width}`;
const boxPresetName = (ratio: PresetRatioKey, width: number): string => `be_r${ratio}_w${width}`;

const snapPresetWidth = (width: number): number => {
  for (const w of PRESET_WIDTHS) if (width <= w) return w;
  return PRESET_WIDTHS[PRESET_WIDTHS.length - 1];
};

/** The preset ratio closest to width/height (log scale: 2:1 and 1:2 are equally far from 1:1). */
const snapPresetRatio = (width: number, height: number): PresetRatioKey => {
  const target = Math.log(width / height);
  let best: PresetRatioKey = '1x1';
  let bestDistance = Infinity;
  for (const [key, ratio] of Object.entries(PRESET_RATIOS) as Array<[PresetRatioKey, string]>) {
    const [w, h] = ratio.split(':').map(Number);
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = key;
      bestDistance = distance;
    }
  }
  return best;
};

export interface CloudinaryRequest {
  width?: number;
  height?: number;
  /** 'jpg' asks for the 1200×630 share card. */
  format?: string;
  blur?: boolean;
}

/** blur → placeholder; jpg → share card; width×height → box; width → width bucket. */
const presetFor = (req: CloudinaryRequest): string => {
  if (req.blur) return LQIP_PRESET;
  if (req.format === 'jpg') return OG_PRESET;
  if (req.width && req.height) return boxPresetName(snapPresetRatio(req.width, req.height), snapPresetWidth(req.width));
  return widthPresetName(snapPresetWidth(req.width ?? PRESET_WIDTHS[PRESET_WIDTHS.length - 1]));
};

// ── URLs ────────────────────────────────────────────────────────────────────

const UPLOAD_URL_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** True for any Cloudinary-hosted URL (served directly, never through our proxy). */
export const isCloudinaryUrl = (url: string | undefined | null): boolean =>
  !!url && /^https?:\/\/res\.cloudinary\.com\//i.test(url);

/** True for a public Cloudinary photo (`…/image/upload/…`). */
export const isCloudinaryPhotoUrl = (url: string | undefined | null): boolean =>
  !!url && /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(url);

/**
 * Strips transformation segments from the path of an upload URL, keeping
 * `v123/folder/file.jpg` (or the bare public id when the URL has no version).
 */
const stripTransforms = (rest: string): string => {
  const parts = rest.split('/');
  const versionIdx = parts.findIndex((p) => /^v\d+$/.test(p));
  if (versionIdx !== -1) return parts.slice(versionIdx).join('/');
  const firstNonTransform = parts.findIndex((p) => !p.split(',').every((token) => /^[a-z]{1,3}_/.test(token)));
  return firstNonTransform !== -1 ? parts.slice(firstNonTransform).join('/') : rest;
};

/**
 * A Cloudinary upload URL at the preset for the request (any transformation
 * already in the URL is replaced, never stacked), or null for other URLs.
 */
export const cloudinaryPresetUrl = (url: string, req: CloudinaryRequest): string | null => {
  const match = url.split(/[?#]/)[0].match(UPLOAD_URL_RE);
  if (!match) return null;
  return `${match[1]}t_${presetFor(req)}/${stripTransforms(match[2])}`;
};

/** The untransformed original — always deliverable, even with strict transformations. */
export const originalCloudinaryUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  const match = url.split(/[?#]/)[0].match(UPLOAD_URL_RE);
  return match ? `${match[1]}${stripTransforms(match[2])}` : null;
};

/** Widths a srcset may list for a Cloudinary photo, snapped to the presets. */
export const snapCloudinaryWidth = snapPresetWidth;

// ── Curated city photos (`city-{country}-{city}` on Cloudinary) ──────────────

export const cloudinaryCityImageUrl = (publicId: string, req: CloudinaryRequest): string =>
  `${CLOUDINARY_BASE_URL}/t_${presetFor(req)}/${publicId}`;
