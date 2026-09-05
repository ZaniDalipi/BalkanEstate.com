import { useEffect } from 'react';
import { canNavigateBack, setNavigationDirection } from './navHistory';
import { skipNextPageTransition } from './pageTransition';

/**
 * Edge swipe-to-go-back for the installed app.
 *
 * Scope is deliberate: this only runs in `display-mode: standalone`. In a
 * browser tab the platform already owns the edge swipe (iOS Safari intercepts
 * it before the page sees a touch; Android's gesture nav does the same), and
 * adding ours there would either do nothing or fire back twice. An installed
 * PWA on iOS has no back gesture at all, which is the gap this fills.
 *
 * The drag is driven by writing `transform` straight to the node rather than
 * through React state — a re-render per touchmove is the one thing guaranteed
 * to make the gesture feel worse than not having it.
 */

/** How far from the left edge a drag has to start, in px. */
const EDGE_WIDTH = 28;
/** Horizontal travel before we claim the gesture from the page. */
const CAPTURE_THRESHOLD = 8;
/** Vertical travel that means the user is scrolling, not going back. */
const CANCEL_THRESHOLD = 14;
/** Fraction of the viewport that counts as a committed swipe. */
const COMMIT_RATIO = 0.28;
/** px/ms — a quick flick commits even if it didn't travel far. */
const COMMIT_VELOCITY = 0.45;

const EXIT_MS = 190;
const CANCEL_MS = 220;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari predates display-mode and reports this instead.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
}

/**
 * Places where a horizontal drag means something else: the photo gallery, the
 * map, and anything in a modal. Opt a subtree out by adding
 * `data-no-swipe-back` to it.
 */
function isBlocked(target: EventTarget | null): boolean {
  if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) return true;
  if (!(target instanceof Element)) return false;
  return target.closest('[data-no-swipe-back]') !== null;
}

export function useSwipeBack(
  ref: React.RefObject<HTMLElement | null>,
  onBack: () => void,
): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!isTouchDevice() || !isStandalone()) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let lastX = 0;
    let lastTime = 0;
    let tracking = false;
    let captured = false;

    const reset = () => {
      tracking = false;
      captured = false;
      node.style.transition = '';
      node.style.transform = '';
      node.style.boxShadow = '';
      node.style.willChange = '';
    };

    const onTouchStart = (e: TouchEvent) => {
      if (captured || e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (touch.clientX > EDGE_WIDTH) return;
      if (!canNavigateBack() || isBlocked(e.target)) return;

      startX = lastX = touch.clientX;
      startY = touch.clientY;
      startTime = lastTime = e.timeStamp;
      tracking = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!captured) {
        if (Math.abs(dy) > CANCEL_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          tracking = false;
          return;
        }
        if (dx < CAPTURE_THRESHOLD || dx < Math.abs(dy) * 1.4) return;
        captured = true;
        node.style.transition = 'none';
        node.style.willChange = 'transform';
      }

      // Vertical scrolling inside the page must stop while we own the gesture.
      e.preventDefault();

      const offset = Math.max(0, dx);
      node.style.transform = `translate3d(${offset}px, 0, 0)`;
      node.style.boxShadow = `-12px 0 32px -8px rgba(15, 23, 42, ${Math.min(0.18, offset / 900)})`;
      lastX = touch.clientX;
      lastTime = e.timeStamp;
    };

    const onTouchEnd = () => {
      if (!captured) {
        tracking = false;
        return;
      }

      const offset = Math.max(0, lastX - startX);
      const elapsed = Math.max(1, lastTime - startTime);
      const velocity = offset / elapsed;
      const commit = offset > node.offsetWidth * COMMIT_RATIO || velocity > COMMIT_VELOCITY;

      tracking = false;
      captured = false;

      if (commit) {
        // Finish the exit first, then navigate. The wrapper swaps its children
        // the moment history changes, so navigating mid-slide would animate the
        // *incoming* page off screen.
        node.style.transition = `transform ${EXIT_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
        node.style.transform = 'translate3d(100%, 0, 0)';
        node.style.pointerEvents = 'none';
        window.setTimeout(() => {
          node.style.pointerEvents = '';
          reset();
          setNavigationDirection('back');
          // The page has just been dragged off screen under the user's finger.
          // A paired transition would snapshot it and slide it away a second
          // time, so the gesture owns the exit and the arrival keeps the plain
          // entrance animation.
          skipNextPageTransition();
          onBack();
        }, EXIT_MS);
        return;
      }

      node.style.transition = `transform ${CANCEL_MS}ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow ${CANCEL_MS}ms linear`;
      node.style.transform = 'translate3d(0, 0, 0)';
      node.style.boxShadow = 'none';
      window.setTimeout(reset, CANCEL_MS);
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    // Non-passive: a captured swipe has to be able to cancel page scrolling.
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', reset, { passive: true });

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', reset);
      reset();
    };
  }, [ref, onBack]);
}
