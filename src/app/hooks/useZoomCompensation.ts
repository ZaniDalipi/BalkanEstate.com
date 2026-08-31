/**
 * useZoomCompensation Hook
 *
 * Keeps the UI comfortable when a desktop user zooms the browser above 100%.
 *
 * How it works:
 *   - Monitors window.outerWidth / window.innerWidth to detect the zoom ratio
 *     (outerWidth stays put across zoom, innerWidth shrinks as you zoom in)
 *   - Snaps that ratio to the browser's own zoom steps so scrollbar/window-border
 *     noise never registers as zoom
 *   - Sets --zoom-scale on <html>; the global rule in index.css turns it into a
 *     slightly smaller root font-size, so text and every rem-based Tailwind
 *     spacing/size shrinks a little and more content fits on screen
 *   - Sets data-zoom (the zoom percentage) for CSS targeting and debugging
 *
 * Why font-size and not `zoom`:
 *   The CSS `zoom` property used to be applied to #root. It scaled the whole app
 *   down *including* its 100dvh height, so at 125% zoom the app painted only 80%
 *   of the viewport and left a dead white band along the bottom of the page.
 *   Scaling the root font-size leaves every viewport unit (dvh/vh/vw) intact, so
 *   the layout still fills the window exactly at any zoom level.
 *
 * Scale curve (partial compensation — zoomed-in text stays bigger than at 100%,
 * it just stops eating the whole screen):
 *   100% → 1.00 (attribute removed)
 *   110% → 0.95
 *   125% → 0.88
 *   150% → 0.85 (floor)
 *   200% → 0.85 (floor)
 */

import { useEffect } from 'react';

/** Below this ratio we treat the page as unzoomed. First real zoom step is 110%. */
export const ZOOM_THRESHOLD = 1.08;

/** Never shrink text below this — 0.85 keeps 14px body copy legible. */
export const MIN_TEXT_SCALE = 0.85;

/** How much of the zoom to cancel out. 1 = fully undo the zoom, 0 = ignore it. */
const COMPENSATION = 0.6;

/** Zoom levels browsers actually offer, used to snap out measurement noise. */
const ZOOM_STEPS = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

/** A measured ratio within this fraction of a real zoom step is treated as that step. */
const SNAP_TOLERANCE = 0.06;

/**
 * Rounds a measured zoom ratio to the nearest browser zoom step.
 * At 100% zoom the scrollbar and window border make outerWidth/innerWidth
 * slightly above 1 (~1.01); snapping turns that back into exactly 1.
 */
export function snapZoomRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  let best = ratio;
  let bestDistance = Infinity;
  for (const step of ZOOM_STEPS) {
    const distance = Math.abs(ratio - step) / step;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = step;
    }
  }
  return bestDistance <= SNAP_TOLERANCE ? best : ratio;
}

/**
 * Text/spacing scale for a given zoom ratio. Zooming out (ratio < 1) and
 * anything at or below the threshold gets no compensation at all.
 */
export function computeTextScale(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= ZOOM_THRESHOLD) return 1;
  const fullCompensation = 1 / ratio;
  const partial = 1 - COMPENSATION * (1 - fullCompensation);
  return Math.max(MIN_TEXT_SCALE, Math.round(partial * 100) / 100);
}

/** Reads the current browser zoom ratio. Returns 1 when it can't be measured. */
export function detectZoomRatio(win: Window = window): number {
  const outer = win.outerWidth;
  const inner = win.innerWidth;
  // Guard: values unavailable, window minimized, or a headless/embedded context
  if (!outer || !inner || outer < 100 || inner < 100) return 1;
  return snapZoomRatio(outer / inner);
}

export function useZoomCompensation() {
  useEffect(() => {
    // Only mouse-driven devices. On phones and tablets outerWidth can report
    // physical pixels, which would read as permanent zoom, and pinch-zoom there
    // should never shrink the type.
    if (!window.matchMedia?.('(pointer: fine)').matches) return;

    let rafId = 0;
    const root = document.documentElement;

    const clear = () => {
      root.style.removeProperty('--zoom-scale');
      root.removeAttribute('data-zoom');
    };

    const update = () => {
      const ratio = detectZoomRatio();
      const scale = computeTextScale(ratio);

      if (scale < 1) {
        root.style.setProperty('--zoom-scale', scale.toFixed(3));
        root.setAttribute('data-zoom', Math.round(ratio * 100).toString());
      } else {
        // Covers zooming back to 100% and zooming out below it
        clear();
      }
    };

    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();

    // Browser zoom fires a resize in every major engine
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      clear();
    };
  }, []);
}
