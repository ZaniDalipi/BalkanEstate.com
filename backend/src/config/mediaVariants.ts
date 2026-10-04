/**
 * R2 media variants — the fixed set of files stored for every photo.
 *
 * Zillow-style: every size the site shows is generated once, at upload, by
 * sharp on our own server and stored next to the master. Nothing is resized
 * on request, so there is no transformation bill and the CDN can cache each
 * file forever (photo folders are never reused, so a URL never changes).
 *
 * One photo = one folder in the bucket:
 *
 *   {photoKey}/original.jpg   master, ≤1920px, the always-safe fallback
 *   {photoKey}/w{W}.webp      full photo, W px wide (never upscaled)
 *   {photoKey}/c{W}.webp      4:3 smart crop, W px wide (cards, thumbnails)
 *   {photoKey}/lqip.webp      32px blurred placeholder
 *   {photoKey}/og.jpg         1200×630 JPEG share card (crawlers want JPEG)
 *
 * Private documents (licences, credentials) store original.jpg only.
 *
 * This file is the single source of truth: the frontend imports it too
 * (config/cloudinaryConfig.ts), so URLs and stored files can't drift.
 * Keep it pure — no imports — so both builds can load it.
 */

/**
 * Folder of the city photos the frontend finds by name (`city-{country}-{city}`,
 * see getCityImageUrl) — migrated from Cloudinary's ids of the same name.
 */
export const CITY_CONVENTION_FOLDER = 'cities/convention';

/** Widths generated for each photo. Requests round UP to the next one. */
export const MEDIA_WIDTHS = [160, 320, 640, 960, 1280, 1920] as const;

/** Aspect ratio (w/h) of the cropped variants. Any box can be covered from it. */
export const MEDIA_CROP_RATIO = 4 / 3;

export const MEDIA_MASTER_FILE = 'original.jpg';
export const MEDIA_LQIP_FILE = 'lqip.webp';
export const MEDIA_OG_FILE = 'og.jpg';

export const widthVariantFile = (width: number): string => `w${width}.webp`;
export const cropVariantFile = (width: number): string => `c${width}.webp`;

/** Every file stored for a public photo, master first. */
export const ALL_VARIANT_FILES: readonly string[] = [
  MEDIA_MASTER_FILE,
  ...MEDIA_WIDTHS.map(widthVariantFile),
  ...MEDIA_WIDTHS.map(cropVariantFile),
  MEDIA_LQIP_FILE,
  MEDIA_OG_FILE,
];

const KNOWN_FILES = new Set(ALL_VARIANT_FILES);

/** Round a width up to the nearest generated width (capped at the largest). */
export const snapMediaWidth = (width: number): number => {
  for (const w of MEDIA_WIDTHS) if (width <= w) return w;
  return MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];
};

/**
 * The stored file that best serves a display request.
 *  - blur          → blurred placeholder
 *  - format jpg    → share card
 *  - width×height  → 4:3 crop wide enough that `object-fit: cover` never
 *                    upscales, whatever the box's ratio
 *  - width         → full photo at that width
 *  - nothing       → largest full photo
 */
export const pickVariantFile = (req: { width?: number; height?: number; format?: string; blur?: boolean }): string => {
  if (req.blur) return MEDIA_LQIP_FILE;
  if (req.format === 'jpg') return MEDIA_OG_FILE;
  if (req.width && req.height) {
    return cropVariantFile(snapMediaWidth(Math.max(req.width, Math.ceil(req.height * MEDIA_CROP_RATIO))));
  }
  return widthVariantFile(snapMediaWidth(req.width ?? MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1]));
};

/** Public URL of one file of a photo. `baseUrl` is the bucket's public origin. */
export const mediaFileUrl = (baseUrl: string, photoKey: string, file: string = MEDIA_MASTER_FILE): string =>
  `${baseUrl.replace(/\/+$/, '')}/${photoKey}/${file}`;

/**
 * Split a URL on our media origin into its photo key and file, or null when it
 * isn't one (another host, or a file name that isn't one of ours).
 */
export const parseMediaUrl = (
  url: string | undefined | null,
  baseUrl: string | undefined | null
): { photoKey: string; file: string } | null => {
  if (!url || !baseUrl) return null;
  const base = `${baseUrl.replace(/\/+$/, '')}/`;
  const clean = url.split(/[?#]/)[0];
  if (!clean.startsWith(base)) return null;
  const rest = clean.slice(base.length);
  const slash = rest.lastIndexOf('/');
  if (slash <= 0) return null;
  const file = rest.slice(slash + 1);
  if (!KNOWN_FILES.has(file)) return null;
  return { photoKey: rest.slice(0, slash), file };
};
