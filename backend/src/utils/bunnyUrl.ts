import crypto from 'crypto';
import { cdnBaseUrl, privateCdnBaseUrl, pullZoneHost, tokenAuthKey } from '../config/bunny';

/**
 * Building and signing Bunny CDN delivery URLs.
 *
 * Bunny Optimizer takes its instructions as query parameters rather than
 * Cloudinary's path segments, so a delivery URL is just the stored path plus a
 * query string:
 *
 *   https://cdn.example.net/balkan-estate/users/1/a.jpg?width=800&quality=82
 *
 * That difference is why transforms cannot simply be string-substituted from
 * the old URLs: Cloudinary's `c_fill` is a crop mode, while Bunny crops via
 * `aspect_ratio`. `buildTransformQuery` is the one place that translation
 * lives, and the frontend's `config/imageConfig.ts` mirrors it for URLs it
 * builds in the browser.
 */

/**
 * Quality presets, mapping Cloudinary's `q_auto:*` ladder onto real numbers.
 *
 * Every rung sits at or below the stored master's own quality (84, see
 * `encodeMaster`). That ceiling is the point: the master is already a lossy
 * WebP, so asking the edge for a *higher* quality than it holds cannot recover
 * detail — it only spends bytes faithfully reproducing the first encode's
 * artifacts, on every request, forever.
 *
 * Egress is the dominant cost on a per-GB CDN, so these numbers are the single
 * biggest lever on the bill. They are chosen low enough to matter and high
 * enough that photographs stay clean; `auto:best` exists for the few places
 * that genuinely need the top of the range.
 */
export const QUALITY_PRESETS: Record<string, number> = {
  auto: 75,
  'auto:low': 45,
  'auto:eco': 58,
  'auto:good': 70,
  'auto:best': 82,
};

/**
 * Quality of the WebP master we store, for an ordinary image and for one shown
 * nearly full-bleed.
 *
 * Lives here, next to the delivery ladder, because the two are one decision:
 * the master must stay at or above every rung above, or the edge spends bytes
 * re-encoding upward from a lossy source. `bunny-url.test.ts` pins that
 * relationship so it cannot drift apart.
 */
export const MASTER_QUALITY = 84;
export const MASTER_QUALITY_LARGE = 90;

export type BunnyQuality = keyof typeof QUALITY_PRESETS | number;

export interface BunnyTransformOptions {
  width?: number;
  height?: number;
  quality?: BunnyQuality;
  /** `auto` omits the parameter — Bunny negotiates WebP/AVIF from `Accept`. */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  /** Cloudinary crop vocabulary, translated below. */
  crop?: 'fill' | 'scale' | 'fit' | 'limit' | 'thumb' | 'pad';
  /** Gaussian blur, 0–100. Used for the LQIP placeholders. */
  blur?: number;
  /** Solid fill colour for `crop: 'pad'`, as `RRGGBB` (no leading `#`). */
  background?: string;
}

/**
 * Clamp to a sane range so a bad caller cannot ask the edge for a 40000px render.
 *
 * A value below the minimum is dropped rather than raised to it: a caller that
 * passes `width: 0` means "no width", and clamping that up to 1 would render a
 * one-pixel image — a broken picture that still looks like a deliberate size.
 */
const clamp = (value: number | undefined, min: number, max: number): number | undefined => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value < min) return undefined;
  return Math.min(Math.round(value), max);
};

const resolveQuality = (quality: BunnyQuality | undefined): number | undefined => {
  if (quality === undefined) return undefined;
  if (typeof quality === 'number') return clamp(quality, 1, 100);
  return QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.auto;
};

/**
 * Translate transform options into Bunny Optimizer query parameters.
 *
 * Returned sorted by key, because Bunny's token authentication hashes the
 * query string and expects it in alphabetical order — signed and unsigned URLs
 * are built from the same function so the two can never drift apart.
 */
export const buildTransformQuery = (options: BunnyTransformOptions = {}): URLSearchParams => {
  const params = new URLSearchParams();

  const width = clamp(options.width, 1, 4096);
  const height = clamp(options.height, 1, 4096);
  const quality = resolveQuality(options.quality);
  const blur = clamp(options.blur, 0, 100);

  // Cloudinary's `c_fill`/`c_thumb` crop to exactly the requested box. Bunny
  // has no single equivalent: `width` + `height` together letterbox rather than
  // crop, so a 4:3 photo asked for a square would come back squashed. Cropping
  // to the requested ratio first and then scaling to width reproduces `c_fill`.
  const cropsToBox = options.crop === 'fill' || options.crop === 'thumb';

  if (cropsToBox && width && height) {
    params.set('aspect_ratio', `${width}:${height}`);
    params.set('width', String(width));
  } else {
    if (width) params.set('width', String(width));
    if (height) params.set('height', String(height));
  }

  if (quality !== undefined) params.set('quality', String(quality));
  if (blur) params.set('blur', String(blur));

  // `auto` is the absence of the parameter: Bunny Optimizer already serves
  // WebP/AVIF to browsers that advertise them, so pinning a format here would
  // only ever make the response bigger.
  if (options.format && options.format !== 'auto') {
    params.set('format', options.format === 'jpg' ? 'jpeg' : options.format);
  }

  // Only a bare hex colour — this value is interpolated into a URL.
  if (options.crop === 'pad' && options.background && /^[0-9a-f]{6}$/i.test(options.background)) {
    params.set('background', options.background.toLowerCase());
  }

  // Alphabetical: required by Bunny's token hash, harmless otherwise.
  const sorted = new URLSearchParams();
  [...params.keys()].sort().forEach(key => sorted.set(key, params.get(key)!));
  return sorted;
};

/** Normalise a storage path into the leading-slash form the CDN serves it at. */
export const toCdnPath = (storagePath: string): string =>
  `/${storagePath.replace(/^\/+/, '')}`;

/**
 * Public delivery URL for a stored object.
 *
 * `storagePath` is the object's path within the storage zone — which is also
 * what we persist as its `publicId`, so a database row is enough to rebuild
 * any URL without a round trip to Bunny.
 */
export const buildBunnyUrl = (
  storagePath: string,
  options: BunnyTransformOptions = {}
): string => {
  const query = buildTransformQuery(options);
  const qs = query.toString();
  return `${cdnBaseUrl()}${toCdnPath(storagePath)}${qs ? `?${qs}` : ''}`;
};

/**
 * Sign a delivery URL with the pull zone's token authentication key.
 *
 * Bunny's scheme: SHA-256 over
 *   securityKey + path + expiry + [userIp] + sortedQueryString
 * base64'd, then made URL-safe. The signed query parameters must appear in the
 * final URL exactly as they were hashed, so both come from the same
 * `URLSearchParams`.
 *
 * Throws when no key is configured. A sensitive document is only ever reachable
 * through one of these URLs, so silently returning an unsigned one would
 * publish it.
 */
export const signBunnyUrl = (
  storagePath: string,
  expiresInSeconds: number,
  options: BunnyTransformOptions = {}
): string => {
  const key = tokenAuthKey();
  if (!key) {
    throw new Error(
      'BUNNY_TOKEN_AUTH_KEY is not set — cannot sign a URL for a sensitive document. ' +
      'Enable Token Authentication on the pull zone and set the key.'
    );
  }

  const path = toCdnPath(storagePath);
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const query = buildTransformQuery(options);
  const queryString = query.toString();

  const hashable = `${key}${path}${expires}${queryString}`;
  const token = crypto
    .createHash('sha256')
    .update(hashable)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const finalQuery = new URLSearchParams(queryString);
  finalQuery.set('token', token);
  finalQuery.set('expires', String(expires));

  // Issued against the private pull zone: the public one does not check tokens,
  // so a signature there would be decoration on a publicly readable URL.
  return `${privateCdnBaseUrl()}${path}?${finalQuery.toString()}`;
};

/** Folder holding the curated one-per-city photo library. */
export const CITY_IMAGE_FOLDER = 'balkan-estate/cities';

/** Normalise a city or country name the way city image paths spell it. */
export const normalizeCityToken = (name: string): string =>
  name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

/**
 * Storage path of a city's photo.
 *
 * Deterministic — derived from the names rather than stored — so the seeding
 * script, the showcase importer, and the frontend all address the same object
 * without a lookup. `config/imageConfig.ts` mirrors this for the browser; the
 * two must agree or city photos silently 404.
 */
export const cityImageStoragePath = (city: string, country = 'unknown'): string =>
  `${CITY_IMAGE_FOLDER}/city-${normalizeCityToken(country)}-${normalizeCityToken(city)}.jpg`;

/** True when `url` is served by our pull zone (host-exact, never a suffix match). */
export const isBunnyUrl = (url: string): boolean => {
  const host = pullZoneHost();
  if (!host) return false;
  try {
    return new URL(url).hostname.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
};

/**
 * Recover the storage path from a delivery URL.
 *
 * The inverse of `buildBunnyUrl`, for the callers that only kept the URL.
 * Returns '' for anything not on our pull zone.
 */
export const storagePathFromUrl = (url: string): string => {
  if (!isBunnyUrl(url)) return '';
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
  } catch {
    return '';
  }
};
