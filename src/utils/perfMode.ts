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
 * decoration". We deliberately target touch devices (phones/tablets) — that is
 * where heat and battery are user-visible and where large decorative blurs and
 * auroras add the least value. Desktops keep the full experience.
 *
 * Low reported memory / core counts reinforce the signal when the browser
 * exposes them (Chromium). iOS Safari exposes neither, so the coarse-pointer
 * check carries it there.
 */
function isPowerSensitiveDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(pointer: fine)').matches;

  // Explicit low-end signals (only present on some browsers).
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCores =
    typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;

  return coarsePointer || lowMemory || lowCores;
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
