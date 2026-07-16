/**
 * Performance / power governor.
 *
 * The app has a large number of *always-on* looping animations (infinite CSS
 * keyframes + framer-motion `repeat: Infinity`) and many `backdrop-filter`
 * blurred surfaces. On mobile these keep the GPU compositing every frame even
 * when nothing meaningful is happening, which drains battery and heats the
 * device.
 *
 * This module sets a few classes on <html> that CSS (see src/index.css) uses to
 * throttle work. It is intentionally tiny, dependency-free, and safe to call
 * once at startup:
 *
 *   - `reduce-motion`  – the user asked the OS to reduce motion. All decorative
 *                        loops are disabled globally.
 *   - `save-power`     – a touch / low-power device (phone/tablet). The heavy
 *                        *decorative* loops (aurora, floating orbs, footer
 *                        cityscape, shimmer borders) are disabled while normal
 *                        UI motion (page transitions, spinners, hovers) is kept.
 *   - `app-hidden`     – the tab / PWA is backgrounded. ALL animations pause so
 *                        the GPU goes idle instead of animating an unseen page.
 */

const REDUCE_MOTION = 'reduce-motion';
const SAVE_POWER = 'save-power';
const APP_HIDDEN = 'app-hidden';

let initialized = false;

/**
 * Heuristic for "this device benefits from spending less GPU/battery on
 * decoration". We target phones/tablets — where heat and battery are
 * user-visible and where large decorative blurs and auroras add the least
 * value. Desktops keep the full experience.
 *
 * `(pointer: coarse)` reflects the device's PRIMARY pointer: it is true on
 * touch-first devices (phones/tablets) and false on desktops — even a
 * touchscreen laptop whose primary pointer is a mouse reports `fine`. This is a
 * more reliable and less surprising signal than deviceMemory/hardwareConcurrency,
 * which report low values (<=4) on plenty of ordinary laptops and would strip
 * animations from desktop users unexpectedly. iOS Safari supports it too.
 */
function isPowerSensitiveDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Initialise the governor. Idempotent — safe to call more than once.
 */
export function initPerfMode(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const root = document.documentElement;

  // --- prefers-reduced-motion (reactive) --------------------------------
  if (typeof window.matchMedia === 'function') {
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyReduce = () => root.classList.toggle(REDUCE_MOTION, reduceQuery.matches);
    applyReduce();
    // addEventListener is the modern API; addListener is the Safari<14 fallback.
    if (typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', applyReduce);
    } else if (typeof reduceQuery.addListener === 'function') {
      reduceQuery.addListener(applyReduce);
    }
  }

  // --- low-power device -------------------------------------------------
  if (isPowerSensitiveDevice()) {
    root.classList.add(SAVE_POWER);
  }

  // --- pause everything while backgrounded ------------------------------
  const applyHidden = () => root.classList.toggle(APP_HIDDEN, document.hidden);
  applyHidden();
  document.addEventListener('visibilitychange', applyHidden);
}

/**
 * Reactive helper for JS-driven animation loops (rAF, setInterval decorative
 * effects). Returns whether decorative motion should currently run at all, so
 * callers can skip scheduling work instead of merely hiding it.
 */
export function decorativeMotionEnabled(): boolean {
  if (typeof document === 'undefined') return true;
  const root = document.documentElement;
  return !root.classList.contains(REDUCE_MOTION) && !root.classList.contains(SAVE_POWER);
}
