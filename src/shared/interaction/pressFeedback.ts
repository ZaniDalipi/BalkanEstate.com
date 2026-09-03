/**
 * Global press feedback.
 *
 * The app root sets `-webkit-tap-highlight-color: transparent`, which removes
 * the grey flash mobile browsers paint on a tapped control — and nothing was
 * put in its place. Combined with hover-only styling (`hover:bg-neutral-100`
 * never fires on a touchscreen), that left most of the app with *no* response
 * to a tap at all: the finger goes down, nothing happens, and some time later a
 * different screen is there. That gap is what reads as a dead click, and no
 * amount of page-transition polish fixes it, because the transition only starts
 * once the work is done.
 *
 * This closes the gap with one delegated listener rather than a prop on a few
 * hundred components:
 *
 *   - a **ripple** from the exact point touched, clipped to the control's own
 *     box and border radius, tinted with the control's own text colour so it
 *     reads correctly on a white nav row and on a solid blue button alike;
 *   - a **press scale**, applied only when the element does not already carry a
 *     transform of its own, so the ~96 components with their own `active:scale`
 *     keep theirs.
 *
 * Both are transform/opacity only, both start in the same frame as the
 * `pointerdown`, and neither waits on React — the acknowledgement has to land
 * before the state update, not after it.
 */

const LAYER_ID = 'press-ripple-layer';

/**
 * What counts as pressable. Deliberately conservative: real controls, plus
 * anything that opts in with `data-pressable` (cards and list rows that are
 * clickable `div`s).
 */
const PRESSABLE = [
  'button',
  '[role="button"]',
  'a[href]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  'summary',
  '[data-pressable]',
].join(',');

/** Movement past this many px means the user is scrolling, not pressing. */
const DRAG_CANCEL_PX = 10;

/** Ripple lifetime; must match the CSS animation duration. */
const RIPPLE_MS = 520;

/** Longest a press may stay applied without a release event. */
const PRESS_SAFETY_MS = 2000;

let installed = false;
let layer: HTMLElement | null = null;

function motionAllowed(): boolean {
  // `save-power` is intentionally NOT checked: perfMode disables *decorative*
  // loops on phones but keeps ordinary UI motion, and confirming a tap is the
  // least decorative motion in the app.
  const root = document.documentElement;
  return !root.classList.contains('reduce-motion') && !root.classList.contains('app-hidden');
}

function ensureLayer(): HTMLElement {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement('div');
  layer.id = LAYER_ID;
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

function isDisabled(el: Element): boolean {
  if (el.getAttribute('aria-disabled') === 'true') return true;
  return 'disabled' in el && (el as HTMLButtonElement).disabled === true;
}

/**
 * Controls whose own gesture owns the pointer: the photo gallery and the map
 * pan with a drag, and a ripple under a drag reads as a misfire. They already
 * carry `data-no-swipe-back` for the same reason, so it doubles as the opt-out
 * and there is one attribute to remember instead of two.
 */
function findPressable(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>(PRESSABLE);
  if (!el) return null;
  if (isDisabled(el)) return null;
  if (el.closest('[data-no-press],[data-no-swipe-back]')) return null;
  return el;
}

/**
 * How far to press the control in. A 44px icon button and a 250px nav row both
 * need to move by roughly the same number of pixels to read as "pressed" — a
 * flat scale factor makes the small one collapse and leaves the wide one
 * looking inert — so the factor is derived from the width and then clamped.
 */
function pressScale(rect: DOMRect): number {
  if (rect.width <= 0) return 1;
  return Math.min(0.99, Math.max(0.94, 1 - 4 / rect.width));
}

/** A control filling most of the screen is a container, not something to squash. */
function isTooLargeToScale(rect: DOMRect): boolean {
  return rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.6;
}

/**
 * `getComputedStyle(el).transform === 'none'` is not the same question as "does
 * this element have a transform *of its own* I'd be fighting with". Plenty of
 * cards in this app enter with a Tailwind `translate-y-0` (a zero-offset enter
 * animation settled at rest) — that is not `none`, it is the identity matrix,
 * and treating it as "already transformed" would silently drop press feedback
 * from every card that ever used a slide-in. Both 2D and 3D identity matrices
 * are checked since Tailwind's transform utilities can produce either.
 */
const IDENTITY_TRANSFORMS = new Set([
  'none',
  '', // jsdom's getComputedStyle default for an unset property, in tests only
  'matrix(1, 0, 0, 1, 0, 0)',
  'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
]);

function hasOwnTransform(el: HTMLElement): boolean {
  return !IDENTITY_TRANSFORMS.has(getComputedStyle(el).transform);
}

function spawnRipple(el: HTMLElement, rect: DOMRect, x: number, y: number): void {
  const style = getComputedStyle(el);
  const ripple = document.createElement('span');
  ripple.className = 'press-ripple';

  // Clip to the control's own box so the ripple reads as that control
  // reacting, rather than as a blob appearing somewhere on the page.
  ripple.style.left = `${rect.left}px`;
  ripple.style.top = `${rect.top}px`;
  ripple.style.width = `${rect.width}px`;
  ripple.style.height = `${rect.height}px`;
  ripple.style.borderRadius = style.borderRadius;
  // The circle inherits this via `currentColor`, so a white-on-blue button
  // ripples white and a dark-on-white nav row ripples dark, with no palette
  // lookup and nothing to keep in sync with the theme.
  ripple.style.color = style.color;

  // Cover the whole control from wherever the finger landed: the radius has to
  // reach the furthest corner.
  const dx = Math.max(x - rect.left, rect.right - x);
  const dy = Math.max(y - rect.top, rect.bottom - y);
  const diameter = 2 * Math.hypot(dx, dy);

  const circle = document.createElement('span');
  circle.className = 'press-ripple__circle';
  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.left = `${x - rect.left - diameter / 2}px`;
  circle.style.top = `${y - rect.top - diameter / 2}px`;

  ripple.appendChild(circle);
  ensureLayer().appendChild(ripple);
  window.setTimeout(() => ripple.remove(), RIPPLE_MS);
}

/**
 * Install the listener. Idempotent — safe to call more than once.
 */
export function initPressFeedback(): void {
  if (installed || typeof document === 'undefined' || typeof window === 'undefined') return;
  installed = true;

  document.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      // Left button / touch / pen only — a right-click opens a menu.
      if (event.button !== 0) return;
      if (!motionAllowed()) return;

      const el = findPressable(event.target);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      spawnRipple(el, rect, event.clientX, event.clientY);

      // Only take over the transform when the element has none of its own.
      // Components with their own `active:scale-*` keep their behaviour, and a
      // transformed ancestor's layout is never disturbed.
      const scalable =
        !hasOwnTransform(el) &&
        !el.hasAttribute('data-no-press-scale') &&
        !isTooLargeToScale(rect);

      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        if (scalable) {
          el.style.transform = '';
          el.style.transition = '';
        }
        window.clearTimeout(safety);
        window.removeEventListener('pointerup', release, true);
        window.removeEventListener('pointercancel', release, true);
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('scroll', release, true);
      };

      const onMove = (moveEvent: PointerEvent) => {
        if (
          Math.abs(moveEvent.clientX - event.clientX) > DRAG_CANCEL_PX ||
          Math.abs(moveEvent.clientY - event.clientY) > DRAG_CANCEL_PX
        ) {
          release();
        }
      };

      if (scalable) {
        // Press in fast, let go slowly: an instant response to the finger, and
        // a release that settles rather than snaps.
        el.style.transition = 'transform 110ms cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform = `scale(${pressScale(rect)})`;
      }

      // A pointerup swallowed by a component that removes the element, or a
      // gesture the browser never resolves, must not leave a control shrunk.
      const safety = window.setTimeout(release, PRESS_SAFETY_MS);

      // Capture phase: a handler calling stopPropagation must not strand us.
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('scroll', release, true);
    },
    true, // capture — see above
  );
}

/** Exposed for tests; not part of the runtime surface. */
export const __testing = { PRESSABLE, pressScale, findPressable, hasOwnTransform };
