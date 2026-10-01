import { retryWithOriginalImage } from '@/config/cloudinaryConfig';

/**
 * App-wide safety net for Cloudinary images.
 *
 * Every Cloudinary URL uses a named transformation (`t_be_…`), which strict
 * transformations only serve once the backend has registered it. If one is
 * missing — or the CDN cached an error from before it existed — the <img>
 * fails. This listener catches that for every image on the page (load errors
 * don't bubble, so it listens in the capture phase) and retries once with the
 * untransformed original, which strict mode always allows.
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
      if (!src.includes('res.cloudinary.com') || !src.includes('/t_be_')) return;
      if (retryWithOriginalImage(target)) {
        // Handled: keep component onError handlers from switching to their fallback.
        event.stopImmediatePropagation();
        if (import.meta.env.DEV) console.warn('[cdn] preset failed, using original:', src);
      }
    },
    true
  );
};
