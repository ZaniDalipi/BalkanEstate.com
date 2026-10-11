import { retryWithOriginalImage, parseMediaCdnUrl } from '@/config/mediaConfig';

/**
 * App-wide safety net for resized images.
 *
 * Photos on our media CDN are shown at a pre-generated size (`w640.webp`…);
 * if one is missing, or the browser can't show WebP, the <img> fails.
 * External images go through our resizing proxy (`/api/image-proxy`), which
 * fails when the API is down or refuses the source. This listener catches both
 * for every image on the page (load errors don't bubble, so it listens in the
 * capture phase) and retries once with the JPEG original, or the external
 * source the proxy was asked for.
 *
 * Components with their own fallback (an icon, a generated avatar) still get
 * their onError when the original fails too.
 */
let installed = false;

export const installCdnImageFallback = (): void => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      const src = target.currentSrc || target.src;
      const isProxied = src.includes('/image-proxy?');
      const media = parseMediaCdnUrl(src);
      const isMediaSize = !!media && media.file !== 'original.jpg';
      if (!isProxied && !isMediaSize) return;
      if (retryWithOriginalImage(target)) {
        // Handled: keep component onError handlers from switching to their fallback.
        event.stopImmediatePropagation();
        if (import.meta.env.DEV) console.warn(`[cdn] ${isMediaSize ? 'media size' : 'image proxy'} failed, using original:`, src);
      }
    },
    true
  );
};
