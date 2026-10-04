import { retryWithOriginalImage, parseMediaCdnUrl } from '@/config/cloudinaryConfig';

/**
 * App-wide safety net for Cloudinary images.
 *
 * Every Cloudinary URL uses a named transformation (`t_be_…`), which strict
 * transformations only serve once the backend has registered it. If one is
 * missing — or the CDN cached an error from before it existed — the <img>
 * fails. External images go through our resizing proxy (`/api/image-proxy`),
 * which fails when the API is down or refuses the source. This listener
 * catches both for every image on the page (load errors
 * don't bubble, so it listens in the capture phase) and retries once with the
 * untransformed original (strict mode always allows it) or the external
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
      const isPreset = src.includes('res.cloudinary.com') && src.includes('/t_be_');
      const isProxied = src.includes('/image-proxy?');
      // A pre-generated size on our media CDN (e.g. an image migrated before
      // its sizes existed, or a browser without WebP) — the JPEG master works.
      const media = parseMediaCdnUrl(src);
      const isMediaVariant = !!media && media.file !== 'original.jpg';
      if (!isPreset && !isProxied && !isMediaVariant) return;
      if (retryWithOriginalImage(target)) {
        // Handled: keep component onError handlers from switching to their fallback.
        event.stopImmediatePropagation();
        if (import.meta.env.DEV) console.warn(`[cdn] ${isPreset ? 'preset' : isMediaVariant ? 'media size' : 'image proxy'} failed, using original:`, src);
      }
    },
    true
  );
};
