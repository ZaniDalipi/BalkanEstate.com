/**
 * useZoomCompensation Hook
 *
 * Detects browser zoom level and applies CSS compensation so the UI
 * scales down proportionally when users zoom above 100%.
 *
 * How it works:
 *   - Monitors window.outerWidth / window.innerWidth to detect zoom ratio
 *   - Sets CSS custom property --zoom-scale on <html> (e.g. 0.8 at 125% zoom)
 *   - Sets data-zoom attribute for CSS rule targeting
 *   - The global CSS rule `html[data-zoom] #root { zoom: var(--zoom-scale) }`
 *     applies the compensation to the entire app
 *
 * Zoom ratios:
 *   100% → no compensation (attribute removed)
 *   110% → scale 0.91
 *   125% → scale 0.80
 *   150% → scale 0.75 (capped minimum)
 *   200% → scale 0.75 (capped minimum)
 */

import { useEffect } from 'react';

const MIN_SCALE = 0.75; // Don't shrink below 75% (prevents tiny UI at extreme zoom)
const ZOOM_THRESHOLD = 1.08; // Only activate above ~108% zoom (avoids false triggers)

export function useZoomCompensation() {
  useEffect(() => {
    let rafId: number;

    const update = () => {
      // outerWidth = browser window width (stable across zoom)
      // innerWidth = CSS viewport width (shrinks when user zooms in)
      const outer = window.outerWidth;
      const inner = window.innerWidth;

      // Guard: if values are unavailable or window is minimized, skip
      if (!outer || !inner || outer < 100) return;

      const ratio = outer / inner;

      if (ratio > ZOOM_THRESHOLD) {
        const scale = Math.max(MIN_SCALE, 1 / ratio);
        document.documentElement.style.setProperty('--zoom-scale', scale.toFixed(4));
        document.documentElement.setAttribute('data-zoom', Math.round(ratio * 100).toString());
      } else {
        document.documentElement.style.removeProperty('--zoom-scale');
        document.documentElement.removeAttribute('data-zoom');
      }
    };

    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    // Initial check
    update();

    // Listen for resize (fires when browser zoom changes)
    window.addEventListener('resize', onResize);

    // Also listen on visualViewport resize for mobile pinch-zoom
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty('--zoom-scale');
      document.documentElement.removeAttribute('data-zoom');
    };
  }, []);
}
