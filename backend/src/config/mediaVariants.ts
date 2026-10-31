/**
 * R2 media sizes — the files stored for every photo.
 *
 * Each photo is resized once, at upload, by sharp on our own server and
 * stored next to its master. Nothing is resized on request, so the CDN can
 * cache every file forever (photo folders are never reused, so a URL never
 * changes).
 *
 * One photo = one folder in the bucket, and only the sizes it actually needs:
 *
 *   {photoKey}/original.jpg   master (≤1920px JPEG): the stored URL, the
 *                             share-card image and the always-safe fallback
 *   {photoKey}/w{W}.webp      the photo W px wide — only for widths below the
 *                             master's own width, plus one at its full width
 *   {photoKey}/lqip.webp      32px blurred placeholder (~150 bytes)
 *
 * A 1920px listing photo stores w160 w320 w640 w1280 w1920 (7 files with the
 * master and placeholder); a 400px avatar stores w160 w320 w640 — the last one
 * being the avatar at its full 400px — so nothing is ever saved twice. The
 * folder name records the largest size (`…_w640`) so the frontend never asks
 * for one that wasn't made. Boxes (cards, thumbnails) use these same files
 * with CSS `object-fit: cover`.
 *
 * Private documents (licences, credentials) store original.jpg only.
 *
 * This file is the single source of truth: the frontend imports it too
 * (config/mediaConfig.ts), so URLs and stored files can't drift.
 * Keep it pure — no imports — so both builds can load it.
 */

/**
 * Folder of the city photos the frontend finds by name (`city-{country}-{city}`,
 * see getCityImageUrl). These keys are fixed, so they carry no size cap.
 */
export const CITY_CONVENTION_FOLDER = 'cities/convention';

/** Widths a photo can be stored at. Requests round UP to the next one. */
export const MEDIA_WIDTHS = [160, 320, 640, 1280, 1920] as const;

/**
 * Aspect ratio assumed when a box (width × height) is requested: the stored
 * width must cover a 16:9 photo filling the box with `object-fit: cover`
 * without being enlarged.
 */
export const MEDIA_COVER_RATIO = 16 / 9;

export const MEDIA_MASTER_FILE = 'original.jpg';
export const MEDIA_LQIP_FILE = 'lqip.webp';

export const widthVariantFile = (width: number): string => `w${width}.webp`;

const WIDTH_FILE = /^w(\d+)\.webp$/;
const KNOWN_FILES = new Set<string>([MEDIA_MASTER_FILE, MEDIA_LQIP_FILE, ...MEDIA_WIDTHS.map(widthVariantFile)]);

const LARGEST = MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];

/** Round a width up to the nearest stored width (capped at the largest). */
export const snapMediaWidth = (width: number): number => {
  for (const w of MEDIA_WIDTHS) if (width <= w) return w;
  return LARGEST;
};

/**
 * The widths stored for a master `masterWidth` px wide: every width below it,
 * plus the first one at or above it (holding the master at its own width).
 */
export const variantWidthsFor = (masterWidth: number): number[] => {
  const out: number[] = [];
  for (const w of MEDIA_WIDTHS) {
    out.push(w);
    if (w >= masterWidth) break;
  }
  return out;
};

/** Every file stored for a photo whose master is `masterWidth` px wide. */
export const variantFilesFor = (masterWidth: number): string[] => [
  MEDIA_MASTER_FILE,
  ...variantWidthsFor(masterWidth).map(widthVariantFile),
  MEDIA_LQIP_FILE,
];

/**
 * Photo folder names end in `_w{largest stored width}` when that is below the
 * maximum, e.g. `0mv436obnb88a74cc_w640` for a 400px avatar. Absent = all sizes.
 */
const CAP_SUFFIX = /_w(\d+)$/;

/** The photo key for a folder whose largest stored width is `largest`. */
export const withSizeCap = (photoKey: string, largest: number): string =>
  largest >= LARGEST ? photoKey : `${photoKey}_w${largest}`;

/** The largest width stored under `photoKey`. */
export const sizeCapOf = (photoKey: string): number => {
  const match = photoKey.match(CAP_SUFFIX);
  return match ? Number(match[1]) : LARGEST;
};

/**
 * The stored file that best serves a display request for a photo.
 *  - blur          → blurred placeholder
 *  - format jpg    → the JPEG master (share cards: crawlers want JPEG)
 *  - width×height  → a width that covers the box without upscaling
 *  - width         → that width, rounded up
 *  - nothing       → the largest stored size
 * Never more than the largest size stored for the photo (`photoKey`'s cap).
 */
export const pickVariantFile = (
  req: { width?: number; height?: number; format?: string; blur?: boolean },
  photoKey = ''
): string => {
  if (req.blur) return MEDIA_LQIP_FILE;
  if (req.format === 'jpg') return MEDIA_MASTER_FILE;
  const wanted =
    req.width && req.height
      ? Math.max(req.width, Math.ceil(req.height * MEDIA_COVER_RATIO))
      : req.width ?? LARGEST;
  return widthVariantFile(Math.min(snapMediaWidth(wanted), sizeCapOf(photoKey)));
};

/** Public URL of one file of a photo. `baseUrl` is the bucket's public origin. */
export const mediaFileUrl = (baseUrl: string, photoKey: string, file: string = MEDIA_MASTER_FILE): string =>
  `${baseUrl.replace(/\/+$/, '')}/${photoKey}/${file}`;

/**
 * Split a URL on our media origin into its photo key and file, or null when it
 * isn't one (another host, or a file name that isn't one of ours).
 */
/** Top-level folders of the media bucket (see services/media/mediaKeys.ts). */
const MEDIA_ROOT_FOLDERS = new Set(['users', 'agencies', 'businesses', 'messages', 'cities', 'destinations', 'site', 'news', 'external', 'legacy']);

/**
 * A photo stored in one of our R2 buckets, recognised by its address rather
 * than by one configured domain: served from `mediaHost` (our custom domain)
 * or an R2 public bucket address (`*.r2.dev`), with our folder layout and one
 * of a photo's stored files. Null for anything else.
 */
export const parseR2PhotoUrl = (
  url: string | undefined | null,
  mediaHost?: string | null
): { origin: string; photoKey: string; file: string } | null => {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return null;
  const host = parsed.hostname.toLowerCase();
  const ownHost = mediaHost ? mediaHost.toLowerCase() : '';
  if (host !== ownHost && !/^[a-z0-9-]+\.r2\.dev$/.test(host)) return null;
  const path = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
  if (path.includes('..')) return null;
  const slash = path.lastIndexOf('/');
  if (slash <= 0) return null;
  const file = path.slice(slash + 1);
  const photoKey = path.slice(0, slash);
  if (!KNOWN_FILES.has(file) && !WIDTH_FILE.test(file)) return null;
  if (!MEDIA_ROOT_FOLDERS.has(photoKey.split('/')[0])) return null;
  return { origin: parsed.origin, photoKey, file };
};

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
  if (!KNOWN_FILES.has(file) && !WIDTH_FILE.test(file)) return null;
  return { photoKey: rest.slice(0, slash), file };
};
