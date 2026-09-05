/**
 * Paired page transitions: the page that leaves animates out as the page that
 * arrives animates in.
 *
 * The class-based entrance in `ViewTransition` animates the page that arrives.
 * It cannot animate the one that leaves: React swaps the subtree in a single
 * commit, so by the time anything could animate the outgoing view its DOM is
 * already gone. Keeping the old tree mounted to animate it is not an option
 * either — two copies of a heavy page, both live, at the exact moment the
 * incoming route is parsing its chunk.
 *
 * The browser's View Transitions API solves precisely that: it snapshots the
 * old and new states as images and animates those on the compositor, so the
 * outgoing page can slide out under the incoming one without a second React
 * tree existing for even one frame. This module wraps it for every navigation
 * that lands on a different page — a tap, a back press, the browser's own
 * buttons — so all of them move the same way.
 *
 * Only `#main-content` is given a `view-transition-name` (see index.css), so
 * the app chrome around it — sidebar, header, bottom nav, sticky ad — stays put
 * while the page slides. The name is attached through the `data-nav-transition`
 * attribute this module writes on `<html>`, which also tells the stylesheet
 * which way to animate, and is removed again when the transition finishes.
 *
 * Everything degrades cleanly: where the API is missing (or the user asked for
 * reduced motion) the update runs on its own and `ViewTransition` animates the
 * incoming page exactly as it does today.
 */

import type { NavigationDirection } from './navHistory';

interface ViewTransitionHandle {
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
}

type StartViewTransition = (callback: () => void | Promise<void>) => ViewTransitionHandle;

/**
 * How long we hold the old snapshot waiting for the app to commit the new view.
 * Routing runs inside `startTransition`, so the commit lands a tick or two
 * later; capturing before it would animate the outgoing page against itself.
 * The cap matters more than the wait — a route that takes longer than this to
 * commit (a fetch on the way in) should not freeze the page any further.
 */
const COMMIT_TIMEOUT_MS = 160;

/**
 * How long to let layout settle after the view commits, before the new state is
 * captured. Going back restores the scroll offset the entry was left at, and
 * that lands over the next frame or two — capturing ahead of it would animate
 * the page in at the top of the list and then jump to where the user was.
 *
 * A timer, not `requestAnimationFrame`: the browser has the document's
 * rendering suspended while it waits for this callback, and animation frames do
 * not run while it is. Waiting on one here hung the transition until the
 * browser gave up on us — the page frozen the whole time, which is the exact
 * opposite of what any of this is for.
 */
const SETTLE_MS = 32;

let running = false;
let currentRun = 0;
let awaitingCommit: (() => void) | null = null;
let suppressNext = false;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function startViewTransition(): StartViewTransition | null {
  if (typeof document === 'undefined') return null;
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  return typeof start === 'function' ? start.bind(document) : null;
}

/** Whether a paired transition is driving the current view change. */
export function isPageTransitionRunning(): boolean {
  return running;
}

/**
 * Settle which motion the running transition should play.
 *
 * The navigation starts before anything knows which view it lands on, so it
 * opens with the direction history implies. `ViewTransition` calls this the
 * moment it resolves the arriving view, which is still well before the
 * animation starts — the new state has not even been captured yet — so a page
 * presented as a sheet rises and a change of context cross-fades, exactly as
 * they do when they arrive on their own.
 */
export function setPageTransitionMotion(direction: NavigationDirection): void {
  if (!running || typeof document === 'undefined') return;
  document.documentElement.dataset.navTransition = normalise(direction);
}

/** The motions the stylesheet has paired animations for. */
function normalise(direction: NavigationDirection): NavigationDirection {
  return direction === 'back' || direction === 'up' || direction === 'morph' ? direction : 'forward';
}

/**
 * Tell the transition the new view is on screen. Called by `ViewTransition`
 * once it has rendered a new view key; the new state is captured just after.
 */
export function notifyViewCommitted(): void {
  awaitingCommit?.();
}

/**
 * Skip the paired transition for the next navigation.
 *
 * The edge swipe already drags the page off under the user's finger and plays
 * its own exit before navigating. Sliding it out a second time — which is what
 * a pop transition would do — reads as the page leaving twice.
 */
export function skipNextPageTransition(): void {
  suppressNext = true;
}

/** Resolve once the new view is committed and laid out, or once we give up. */
function waitForView(): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => finish(), COMMIT_TIMEOUT_MS);

    function finish() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      awaitingCommit = null;
      window.setTimeout(resolve, SETTLE_MS);
    }

    awaitingCommit = finish;
  });
}

/**
 * Run a navigation as a paired transition: the outgoing page slides away as the
 * incoming one arrives, in the direction given.
 *
 * `update` is always called exactly once, whether or not the browser can
 * animate it.
 */
export function runPageTransition(direction: NavigationDirection, update: () => void): void {
  const start = startViewTransition();

  if (suppressNext || !start || reducedMotion()) {
    suppressNext = false;
    update();
    return;
  }

  const root = document.documentElement;
  const run = ++currentRun;
  running = true;
  // The opening guess; `setPageTransitionMotion` refines it once the arriving
  // view is known. It has to be on the element before the browser captures the
  // old state either way — that is what gives the page region its transition
  // name.
  root.dataset.navTransition = normalise(direction);

  const cleanup = () => {
    // A newer navigation has taken over: it owns the attribute and the flag.
    if (run !== currentRun) return;
    running = false;
    delete root.dataset.navTransition;
  };

  let updated = false;
  const updateOnce = () => {
    if (updated) return;
    updated = true;
    update();
  };

  try {
    const transition = start(() => {
      updateOnce();
      return waitForView();
    });
    transition.finished.then(cleanup, cleanup);
  } catch {
    // Nothing here is worth failing a navigation over: the navigation still
    // happens, it just happens without the paired motion.
    cleanup();
    updateOnce();
  }
}
