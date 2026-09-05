/**
 * Shared source generation + cache warm-up for property photo galleries.
 *
 * WHY THIS MODULE EXISTS
 *
 * The gallery and the fullscreen viewer both "preloaded" upcoming photos with
 * `new Image()` at one hard-coded width, while the rendered `<img>` picked a
 * candidate out of a `srcSet`. Two things made every warmed photo download a
 * *second* time when it was finally displayed — which is exactly the 2-3 s
 * blurry gap users see when they swipe:
 *
 *   1. Different URL. The preloader asked for `w_1200`; the browser, resolving
 *      `srcSet` against the device's DPR, asked for `w_1920`. Two URLs, two
 *      cache entries, nothing reused.
 *   2. Different CORS mode. The rendered `<img>` carries
 *      `crossOrigin="anonymous"` (the annotation canvas needs an untainted
 *      image), while `new Image()` fetches no-cors. A no-cors response is never
 *      reused to satisfy a CORS request, so even a byte-identical URL was
 *      re-fetched over the network.
 *
 * So both paths now go through `getGallerySources`, and the warm-up replays
 * *every* attribute that participates in selection (`sizes`, `srcset`,
 * `crossOrigin`). A warmed photo is then a guaranteed cache hit on display.
 */

import { optimizeImageUrl, imageSrcSet, getPropertyImagePlaceholder, isCdnUrl } from './imageConfig';

/** True for a photo on our own CDN, which is the only kind we can resize. */
export const isOwnCdnUrl = (url: string | undefined): url is string =>
  typeof url === 'string' && isCdnUrl(url);

/**
 * Candidate widths shared by the inline gallery and the fullscreen viewer.
 *
 * Keeping one list for both matters: on a phone both surfaces resolve to
 * `100vw`, so they pick the *same* candidate and opening fullscreen reuses the
 * bytes the gallery already downloaded.
 */
export const GALLERY_WIDTHS = [480, 768, 1080, 1440, 1920];

/** The gallery frame is edge-to-edge on a phone and capped at ~1280px on desktop. */
export const GALLERY_SIZES = '(max-width: 640px) 100vw, (max-width: 1280px) 95vw, 1280px';

/** The fullscreen viewer always spans the viewport. */
export const VIEWER_SIZES = '100vw';

export interface ImageSources {
  src: string;
  /** Empty for URLs not on our CDN, which are served through the backend proxy. */
  srcSet: string;
  sizes: string;
  /** Tiny blurred stand-in, or '' when the URL cannot produce one. */
  placeholder: string;
  /** `'anonymous'` for our CDN, otherwise undefined — must match on both paths. */
  crossOrigin?: 'anonymous';
}

/**
 * Describes one photo once, for both rendering and warming.
 *
 * `fallbackWidth` is the width baked into `src`; it is only used by browsers
 * that ignore `srcSet` and by URLs not on our CDN.
 */
export const getGallerySources = (
  url: string | undefined,
  options: { widths?: number[]; sizes?: string; fallbackWidth?: number } = {}
): ImageSources => {
  const { widths = GALLERY_WIDTHS, sizes = GALLERY_SIZES, fallbackWidth = 1200 } = options;

  if (!url) return { src: '', srcSet: '', sizes, placeholder: '' };

  if (!isOwnCdnUrl(url)) {
    // External URLs go through the backend proxy, which serves a single size.
    return { src: `/api/image-proxy?url=${encodeURIComponent(url)}`, srcSet: '', sizes, placeholder: '' };
  }

  return {
    src: optimizeImageUrl(url, { width: fallbackWidth, quality: 'auto' }),
    srcSet: imageSrcSet(url, widths),
    sizes,
    placeholder: getPropertyImagePlaceholder(url),
    crossOrigin: 'anonymous',
  };
};

// ── Warm-up ────────────────────────────────────────────────────────────────

/** Warmed keys, so revisiting a listing never re-issues the same requests. */
const warmed = new Set<string>();

/** In-flight preloaders, held so the GC cannot collect (and cancel) them. */
const inFlight = new Set<HTMLImageElement>();

/** Cap on parallel background warms, so they never starve the visible photo. */
const MAX_PARALLEL_WARMS = 3;

const queue: Array<() => void> = [];
let active = 0;

const pump = (): void => {
  while (active < MAX_PARALLEL_WARMS && queue.length > 0) {
    const next = queue.shift();
    if (next) {
      active += 1;
      next();
    }
  }
};

const warmKey = (sources: ImageSources): string => `${sources.srcSet || sources.src}|${sources.sizes}`;

/**
 * Downloads a photo into the HTTP cache using the exact request the `<img>`
 * will make. Already-warmed photos are skipped.
 *
 * `priority: 'high'` bypasses the queue — it is for the photo on screen and its
 * immediate neighbours. Everything else queues behind at low priority.
 */
export const warmImage = (sources: ImageSources, priority: 'high' | 'low' = 'low'): void => {
  if (typeof window === 'undefined' || !sources.src) return;

  const key = warmKey(sources);
  if (warmed.has(key)) return;
  warmed.add(key);

  const start = () => {
    const img = new Image();
    inFlight.add(img);

    const done = () => {
      inFlight.delete(img);
      if (priority !== 'high') {
        active -= 1;
        pump();
      }
    };
    img.onload = done;
    img.onerror = () => {
      // Let a failed warm be retried on the next visit rather than caching a miss.
      warmed.delete(key);
      done();
    };

    // Order matters: crossOrigin and sizes must be set before srcset/src so the
    // single "update the image data" pass selects and fetches what we intend.
    if (sources.crossOrigin) img.crossOrigin = sources.crossOrigin;
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
    if (sources.srcSet) {
      img.sizes = sources.sizes;
      img.srcset = sources.srcSet;
    }
    img.src = sources.src;
  };

  if (priority === 'high') {
    start();
  } else {
    queue.push(start);
    pump();
  }
};

/**
 * Warms an entire gallery the moment a listing opens, ordered by how soon each
 * photo is likely to be seen: the visible one first, then outwards from it,
 * then everything else in the background.
 */
export const warmGallery = (
  urls: Array<string | undefined>,
  options: { activeIndex?: number; widths?: number[]; sizes?: string; fallbackWidth?: number } = {}
): void => {
  const { activeIndex = 0, ...sourceOptions } = options;
  const list = urls.filter((u): u is string => !!u);
  if (list.length === 0) return;

  // Distance from the active photo, measured the way the carousel wraps.
  const order = list
    .map((url, index) => {
      const forward = (index - activeIndex + list.length) % list.length;
      const backward = (activeIndex - index + list.length) % list.length;
      return { url, distance: Math.min(forward, backward) };
    })
    .sort((a, b) => a.distance - b.distance);

  order.forEach(({ url, distance }) => {
    warmImage(getGallerySources(url, sourceOptions), distance <= 2 ? 'high' : 'low');
  });
};

// ── Frame fitting ──────────────────────────────────────────────────────────

/**
 * Fraction of a photo that survives an `object-cover` crop into a frame.
 *
 * `object-cover` scales the photo until it covers the frame and throws away the
 * overflow, so the survivor is whichever ratio is smaller:
 *
 *   4:3 photo (1.33) in a 16:9 frame (1.78) → 0.75 — a quarter is trimmed off
 *   the top and bottom, which nobody notices.
 *
 *   9:16 photo (0.56) in the same frame → 0.32 — two thirds of the listing is
 *   gone and what is left is whatever happened to sit in the middle band,
 *   usually sky. That is the "black bar + blue gradient" thumbnail.
 */
export const coveredFraction = (photoAspect: number, frameAspect: number): number => {
  if (!(photoAspect > 0) || !(frameAspect > 0)) return 1;
  return Math.min(photoAspect, frameAspect) / Math.max(photoAspect, frameAspect);
};

/**
 * How much of a photo has to survive the crop before we fill the frame with it:
 * cover while at least half the photo is still on screen, otherwise show it
 * whole against a blurred fill.
 *
 * Half is where the crop stops being a trim and starts being a choice of
 * subject. Every shape a camera or a phone shoots landscape — 4:3, 3:2, square,
 * a 3:1 panorama — stays above it and fills the frame. The shapes that fall
 * below it are the ones held the other way up, where the frame and the photo
 * disagree about orientation and the middle band the crop keeps is whatever the
 * photographer was pointing past.
 */
export const MIN_VISIBLE_ON_COVER = 0.5;

/**
 * Whether a photo should fill its frame (`object-cover`) or be shown whole
 * (`object-contain`) against a blurred backdrop.
 *
 * An unmeasured photo covers: that is what the common case resolves to, so the
 * first paint is already right and no layout flips once `naturalWidth` lands.
 */
export const shouldCoverFrame = (
  photoAspect: number | undefined,
  frameAspect: number
): boolean =>
  photoAspect === undefined || coveredFraction(photoAspect, frameAspect) >= MIN_VISIBLE_ON_COVER;
