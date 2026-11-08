import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';

/** How a camera view's rendering is requested, so a preload fetches exactly what the picture will show. */
export const viewPictureSources = (url: string) => ({
  src: optimizeImageUrl(url, { width: 1920 }),
  srcSet: imageSrcSet(url, [800, 1280, 1920, 2560]) || undefined,
  sizes: '100vw',
});

const loads = new Map<string, Promise<void>>();

/**
 * Fetch and decode a camera view's rendering ahead of time, so switching to
 * it shows the whole picture at once. Never rejects; gives up waiting after
 * `timeoutMs` (the switch then goes ahead). Where images can't be decoded
 * ahead (old browsers, tests) it resolves at once.
 */
export function preloadViewPicture(url: string, timeoutMs = 1500): Promise<void> {
  if (typeof Image === 'undefined' || typeof HTMLImageElement === 'undefined' || !('decode' in HTMLImageElement.prototype)) {
    return Promise.resolve();
  }
  const known = loads.get(url);
  if (known) return known;
  const img = new Image();
  const { src, srcSet, sizes } = viewPictureSources(url);
  if (srcSet) {
    img.sizes = sizes;
    img.srcset = srcSet;
  }
  img.src = src;
  const load = new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    img
      .decode()
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        resolve();
      });
  });
  loads.set(url, load);
  return load;
}
