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
 *     the next view change.
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
    return origPush({ ...(state as object), [NAV_IDX]: historyIndex }, title, url);
  };

  const origReplace = window.history.replaceState.bind(window.history);
  window.history.replaceState = function replaceState(state: unknown, title: string, url?: string | URL | null) {
    return origReplace({ ...(state as object), [NAV_IDX]: historyIndex }, title, url);
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

    if (nextIndex === null || nextIndex === previousIndex) {
      // Synthetic event, or an entry we never stamped: the caller already told
      // us the direction (or wants the default). Leave the index alone.
      return;
    }

    rememberScroll(previousIndex);
    historyIndex = nextIndex;
    pendingScrollRestore = scrollMemory.get(nextIndex) ?? null;

    // A direction set explicitly by a caller wins; otherwise infer from the
    // index so the browser's own back/forward buttons animate correctly.
    if (pendingDirection === 'forward' && nextIndex < previousIndex) {
      pendingDirection = 'back';
    }
  });
}

/** Set the direction the next view change should animate in. */
export function setNavigationDirection(direction: NavigationDirection): void {
  pendingDirection = direction;
}

/** Read and reset the pending direction. Called once per view change. */
export function consumeNavigationDirection(): NavigationDirection {
  const direction = pendingDirection;
  pendingDirection = 'forward';
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
