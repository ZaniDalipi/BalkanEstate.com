/**
 * Navigation history instrumentation.
 *
 * The app routes off `window.location` + `history.pushState` rather than a
 * router library, so nothing in the tree knows whether a view change is a push
 * or a pop. This module is the single source of truth for that:
 *
 *   - it stamps every history entry with a monotonic `__navIdx`, so a popstate
 *     can be classified as back or forward by comparing indices;
 *   - it remembers the scroll offsets of the entry being left, so going back
 *     returns the user to where they were instead of the top of the list;
 *   - it holds the *pending transition direction* that a caller set just before
 *     navigating (`setNavigationDirection`), which `ViewTransition` consumes on
 *     the next view change;
 *   - it says whether a popstate actually moved the app to another page
 *     (`consumePageChange`), which is what decides whether the view change is
 *     run as a paired transition — the outgoing page animating away as the
 *     incoming one arrives — rather than as an entrance alone.
 *
 * Everything here is module state on purpose. Direction used to live in React
 * state, which meant every navigation triggered a second full-tree render on
 * top of the one the navigation itself caused — an extra commit landing right
 * as the entrance animation started, which is exactly when a phone can least
 * afford it.
 *
 * `install()` is called at import time from ViewTransition, before React
 * renders, so our popstate listener is registered ahead of the app's own
 * routing listener and the index is already correct when routing runs.
 */

export type NavigationDirection = 'forward' | 'back' | 'up' | 'morph';

const NAV_IDX = '__navIdx';

/** How many history entries we keep scroll offsets for. */
const MAX_SCROLL_ENTRIES = 50;

interface ScrollSnapshot {
  /** `window.scrollY` — used by views that scroll the document. */
  window: number;
  /**
   * `scrollTop` of every `[data-scroll-container]`, in document order. Views
   * that scroll internally (search results, rentals, villas) are matched
   * positionally: the same view renders the same containers in the same order,
   * and a snapshot is only ever restored onto the entry it was taken from.
   */
  containers: number[];
}

let installed = false;
let historyIndex = 0;
let pendingDirection: NavigationDirection = 'forward';
const scrollMemory = new Map<number, ScrollSnapshot>();
let pendingScrollRestore: ScrollSnapshot | null = null;
/**
 * Set when the last popstate moved the app to a different path — the browser or
 * a gesture stepping through history, or the app pushing an entry of its own and
 * firing the synthetic popstate that kicks routing. Read once, by the routing
 * listener, to decide whether the view change gets a paired old/new page
 * transition. Null for a popstate that leaves the path where it was: two entries
 * of the same page (a filter in the query string) are not a page change, and
 * animating one only stalls the update behind motion nobody can see.
 */
let pendingPageChange: NavigationDirection | null = null;
/** Whether the last pushState/replaceState actually moved to a different path. */
let pushChangedPath = false;
/**
 * Whether `pendingDirection` was asked for by a caller rather than worked out
 * from the history index. An explicit direction outranks inference — that is
 * how a link opts into a sheet or a cross-fade — but only for the navigation it
 * was set for, never for a later one.
 */
let directionIsExplicit = false;
let lastPath = typeof window === 'undefined' ? '' : window.location.pathname;
/**
 * Whether a caller has asked for a direction since the last popstate. A
 * direction is set immediately before navigating, so one that has been sitting
 * here across a whole navigation belongs to a view change that never happened
 * and must not be applied to the next one.
 */
let directionSetSinceNavigation = false;

const hasWindow = typeof window !== 'undefined';

function readIndexFromState(state: unknown): number | null {
  if (state && typeof state === 'object' && typeof (state as Record<string, unknown>)[NAV_IDX] === 'number') {
    return (state as Record<string, number>)[NAV_IDX];
  }
  return null;
}

function scrollContainers(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-container]'));
}

function captureScroll(): ScrollSnapshot {
  return {
    window: hasWindow ? window.scrollY : 0,
    containers: scrollContainers().map((el) => el.scrollTop),
  };
}

/** Remember where the entry we are leaving was scrolled to. */
function rememberScroll(index: number): void {
  const snapshot = captureScroll();
  // Nothing worth restoring — don't spend an entry on it.
  if (snapshot.window === 0 && snapshot.containers.every((top) => top === 0)) {
    scrollMemory.delete(index);
    return;
  }
  scrollMemory.set(index, snapshot);
  if (scrollMemory.size > MAX_SCROLL_ENTRIES) {
    const oldest = scrollMemory.keys().next();
    if (!oldest.done) scrollMemory.delete(oldest.value);
  }
}

/**
 * Patch `pushState`/`replaceState` and listen for `popstate`.
 * Idempotent — safe to call from module scope on every import.
 */
export function installNavigationHistory(): void {
  if (installed || !hasWindow) return;
  installed = true;

  const initial = readIndexFromState(window.history.state);
  historyIndex = initial ?? 0;
  if (initial === null) {
    window.history.replaceState({ ...(window.history.state as object), [NAV_IDX]: historyIndex }, '');
  }

  const origPush = window.history.pushState.bind(window.history);
  window.history.pushState = function pushState(state: unknown, title: string, url?: string | URL | null) {
    // Capture before the entry changes: this is the last moment the outgoing
    // view's scroll offsets are still on screen.
    rememberScroll(historyIndex);
    // A new entry always starts at the top. Dropping any offset a back
    // navigation left unclaimed keeps it from being applied to an unrelated
    // view later on.
    pendingScrollRestore = null;
    historyIndex += 1;
    const result = origPush({ ...(state as object), [NAV_IDX]: historyIndex }, title, url);
    pushChangedPath = window.location.pathname !== lastPath;
    lastPath = window.location.pathname;
    return result;
  };

  const origReplace = window.history.replaceState.bind(window.history);
  window.history.replaceState = function replaceState(state: unknown, title: string, url?: string | URL | null) {
    const result = origReplace({ ...(state as object), [NAV_IDX]: historyIndex }, title, url);
    pushChangedPath = window.location.pathname !== lastPath;
    lastPath = window.location.pathname;
    return result;
  };

  window.addEventListener('popstate', () => {
    // Read the index off `window.history.state`, never off `event.state`.
    // `useLocalizedNavigation` fires a synthetic `PopStateEvent` after its own
    // pushState to kick routing, and a synthetic event carries `state: null` —
    // reading that treated every programmatic forward navigation as a step
    // back, which both animated the wrong way and walked the index downwards
    // until back/forward detection stopped working entirely.
    const nextIndex = readIndexFromState(window.history.state);
    const previousIndex = historyIndex;

    // Anything a previous navigation left armed is stale as of this one.
    dropUnclaimedDirection();
    directionSetSinceNavigation = false;

    if (nextIndex === null || nextIndex === previousIndex) {
      // Synthetic event, or an entry we never stamped: the caller already told
      // us the direction (or wants the default). Leave the index alone.
      //
      // It is still a page change if the pushState it follows moved to another
      // path — that is how every in-app navigation reaches routing — so it gets
      // the same paired transition the browser's own buttons do. The direction
      // here is only a starting point: `ViewTransition` settles what the motion
      // should be once it knows which view arrived.
      pendingPageChange = pushChangedPath ? (pendingDirection === 'back' ? 'back' : 'forward') : null;
      pushChangedPath = false;
      return;
    }

    rememberScroll(previousIndex);
    historyIndex = nextIndex;
    pendingScrollRestore = scrollMemory.get(nextIndex) ?? null;

    // A direction set explicitly by a caller wins; otherwise the index decides,
    // so the browser's own back and forward buttons each animate their own way.
    // Inference is re-run rather than only upgraded to 'back': an inferred
    // direction that no view change claimed used to survive into the next
    // traversal, which is what made pressing forward straight after a back
    // slide in from the wrong side.
    if (!directionIsExplicit) {
      pendingDirection = nextIndex < previousIndex ? 'back' : 'forward';
    }

    // The browser stepping through history — the back/forward buttons, Android's
    // system back, an edge swipe, or `history.back()` from one of our own back
    // buttons. The index says which way, and that is not up for interpretation
    // here: whichever button the user pressed is the motion they expect.
    const nextPath = window.location.pathname;
    pendingPageChange = nextPath === lastPath ? null : (nextIndex < previousIndex ? 'back' : 'forward');
    lastPath = nextPath;
    pushChangedPath = false;
  });
}

/**
 * Drop a direction that no view change ever claimed.
 *
 * `consumeNavigationDirection` only runs when the view key changes, so a
 * navigation that lands on the same view — back and forth between two account
 * tabs, or between two sets of search filters — leaves its direction armed. The
 * next navigation would then animate with it: tapping into a listing after a
 * back press slid in from the wrong side.
 *
 * A caller sets a direction immediately before navigating, so anything still
 * pending when the *following* navigation starts was set for a view change that
 * never happened. That is the test — not a timer. Routing is deferred (it runs
 * inside `startTransition`, and a paired transition holds it a little longer
 * still), so no fixed delay can tell a slow commit from an abandoned one.
 */
function dropUnclaimedDirection(): void {
  if (directionSetSinceNavigation) return;
  pendingDirection = 'forward';
  directionIsExplicit = false;
}

/** Set the direction the next view change should animate in. */
export function setNavigationDirection(direction: NavigationDirection): void {
  pendingDirection = direction;
  directionIsExplicit = true;
  directionSetSinceNavigation = true;
}

/** Read and reset the pending direction. Called once per view change. */
export function consumeNavigationDirection(): NavigationDirection {
  const direction = pendingDirection;
  pendingDirection = 'forward';
  directionIsExplicit = false;
  directionSetSinceNavigation = false;
  return direction;
}

/**
 * Take the direction of the page change the last popstate represents, if it was
 * one. Returns null when the path did not move — the routing listener reads
 * this to decide whether the navigation runs inside a paired page transition,
 * and nothing else should see it.
 */
export function consumePageChange(): NavigationDirection | null {
  const direction = pendingPageChange;
  pendingPageChange = null;
  return direction;
}

/** Whether there is an in-app history entry to go back to. */
export function canNavigateBack(): boolean {
  return historyIndex > 0;
}

/**
 * Take the scroll offsets saved for the entry we just navigated back to, if
 * any. Returns null on a forward navigation, where the caller should scroll to
 * the top instead.
 */
export function takePendingScrollRestore(): ScrollSnapshot | null {
  const snapshot = pendingScrollRestore;
  pendingScrollRestore = null;
  return snapshot;
}

/**
 * Apply a snapshot, retrying across a few frames.
 *
 * The view is restored before its lazy chunk and data have painted, so the
 * scroll container is still short and the assignment gets clamped. Re-applying
 * until the offset sticks (or we run out of attempts) is what browsers do for
 * their own scroll restoration.
 */
export function applyScrollSnapshot(snapshot: ScrollSnapshot): () => void {
  let attempts = 0;
  let frame = 0;
  let cancelled = false;

  const apply = () => {
    if (cancelled) return;
    window.scrollTo({ top: snapshot.window, behavior: 'instant' as ScrollBehavior });
    const containers = scrollContainers();
    snapshot.containers.forEach((top, i) => {
      const el = containers[i];
      if (el) el.scrollTop = top;
    });

    const settled =
      Math.abs(window.scrollY - snapshot.window) < 2 &&
      snapshot.containers.every((top, i) => !containers[i] || Math.abs(containers[i].scrollTop - top) < 2);

    if (!settled && ++attempts < 12) {
      frame = window.requestAnimationFrame(apply);
    }
  };

  apply();
  return () => {
    cancelled = true;
    if (frame) window.cancelAnimationFrame(frame);
  };
}
