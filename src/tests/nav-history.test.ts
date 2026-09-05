import { describe, it, expect, vi } from 'vitest';

// Captured before anything patches them, so each case can start from a
// pristine history: `installNavigationHistory` wraps these, and re-importing
// the module without unwrapping first would stack a second wrapper on the last
// test's.
const nativePushState = window.history.pushState.bind(window.history);
const nativeReplaceState = window.history.replaceState.bind(window.history);

/**
 * navHistory holds module state (the history index, the pending direction, the
 * scroll memory), so each case starts from a fresh import.
 */
async function loadNavHistory() {
  window.history.pushState = nativePushState;
  window.history.replaceState = nativeReplaceState;
  nativeReplaceState(null, '', '/');
  vi.resetModules();
  const mod = await import('@/app/navigation/navHistory');
  mod.installNavigationHistory();
  return mod;
}

/**
 * jsdom's history does not emit popstate for pushState/back(), which is also
 * true of real browsers for pushState. Firing it by hand is how the app itself
 * kicks routing, so it doubles as the case that used to break.
 */
function firePopstate(state: unknown = window.history.state) {
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}

/**
 * Stand in for the browser stepping back to an earlier entry: it restores that
 * entry's state and then fires popstate. The state has to be written with the
 * native replaceState — the patched one re-stamps the current index, which is
 * the whole point of it.
 */
function simulateBackTo(index: number, url: string) {
  nativeReplaceState({ __navIdx: index }, '', url);
  firePopstate();
}

describe('navHistory', () => {
  it('stamps a navigation index onto every entry it creates', async () => {
    await loadNavHistory();

    expect(window.history.state).toMatchObject({ __navIdx: 0 });

    window.history.pushState({}, '', '/search');
    expect(window.history.state).toMatchObject({ __navIdx: 1 });

    window.history.pushState({}, '', '/property/abc');
    expect(window.history.state).toMatchObject({ __navIdx: 2 });
  });

  it('preserves the caller state it is given', async () => {
    await loadNavHistory();

    window.history.pushState({ from: 'search' }, '', '/property/abc');
    expect(window.history.state).toMatchObject({ from: 'search', __navIdx: 1 });
  });

  it('leaves replaceState on the same index', async () => {
    await loadNavHistory();

    window.history.pushState({}, '', '/search');
    window.history.replaceState({}, '', '/search?page=2');
    expect(window.history.state).toMatchObject({ __navIdx: 1 });
  });

  it('does not read a forward navigation as a step back', async () => {
    // The regression this guards: useLocalizedNavigation pushes a new entry and
    // then fires a synthetic popstate to kick routing. A synthetic event carries
    // no state, and reading the index off `event.state` classified every
    // programmatic navigation as 'back' — wrong animation, and the index walked
    // downwards until back/forward detection stopped working at all.
    const nav = await loadNavHistory();

    nav.setNavigationDirection('forward');
    window.history.pushState({}, '', '/search');
    window.dispatchEvent(new PopStateEvent('popstate')); // state: null

    expect(nav.consumeNavigationDirection()).toBe('forward');
    // The index survived: a second push continues from 1, not from 0.
    window.history.pushState({}, '', '/agents');
    expect(window.history.state).toMatchObject({ __navIdx: 2 });
  });

  it('reads a real back navigation as back', async () => {
    const nav = await loadNavHistory();

    window.history.pushState({}, '', '/property/abc');
    simulateBackTo(0, '/');

    expect(nav.consumeNavigationDirection()).toBe('back');
  });

  it('lets an explicit direction win over the inferred one', async () => {
    const nav = await loadNavHistory();

    window.history.pushState({}, '', '/property/abc');
    nav.setNavigationDirection('morph');
    simulateBackTo(0, '/');

    expect(nav.consumeNavigationDirection()).toBe('morph');
  });

  it('resets to forward once a direction is consumed', async () => {
    const nav = await loadNavHistory();

    nav.setNavigationDirection('up');
    expect(nav.consumeNavigationDirection()).toBe('up');
    expect(nav.consumeNavigationDirection()).toBe('forward');
  });

  it('restores the scroll offsets saved for the entry it returns to', async () => {
    const nav = await loadNavHistory();

    const list = document.createElement('div');
    list.setAttribute('data-scroll-container', '');
    document.body.appendChild(list);
    try {
      // Halfway down the results, then open a listing.
      list.scrollTop = 640;
      window.history.pushState({}, '', '/property/abc');
      expect(nav.takePendingScrollRestore()).toBeNull();

      // The detail page starts at the top; go back.
      list.scrollTop = 0;
      simulateBackTo(0, '/');

      const snapshot = nav.takePendingScrollRestore();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.containers).toEqual([640]);
      // Taking it is one-shot.
      expect(nav.takePendingScrollRestore()).toBeNull();
    } finally {
      list.remove();
    }
  });

  it('drops an unclaimed scroll offset when a new entry is pushed', async () => {
    const nav = await loadNavHistory();

    const list = document.createElement('div');
    list.setAttribute('data-scroll-container', '');
    document.body.appendChild(list);
    try {
      list.scrollTop = 400;
      window.history.pushState({}, '', '/property/abc');
      simulateBackTo(0, '/');

      // Navigating somewhere new before anything consumed the offset must not
      // leave it waiting to be applied to an unrelated view.
      list.scrollTop = 0;
      window.history.pushState({}, '', '/agents');
      expect(nav.takePendingScrollRestore()).toBeNull();
    } finally {
      list.remove();
    }
  });

  it('reports a real back navigation as a page change', async () => {
    const nav = await loadNavHistory();

    window.history.pushState({}, '', '/property/abc');
    simulateBackTo(0, '/');
    expect(nav.consumePageChange()).toBe('back');
    // One-shot: only the routing listener acts on it.
    expect(nav.consumePageChange()).toBeNull();
  });

  it('reports stepping forward again as a forward page change', async () => {
    const nav = await loadNavHistory();

    window.history.pushState({}, '', '/property/abc');
    simulateBackTo(0, '/');
    nav.consumePageChange();

    simulateBackTo(1, '/property/abc');
    expect(nav.consumePageChange()).toBe('forward');
    expect(nav.consumeNavigationDirection()).toBe('forward');
  });

  it('reports the app pushing its own entry as a page change', async () => {
    const nav = await loadNavHistory();

    // How every in-app navigation reaches routing: push the entry, then fire a
    // synthetic popstate. It moves to another page, so it animates like one.
    window.history.pushState({}, '', '/agents');
    firePopstate();

    expect(nav.consumePageChange()).toBe('forward');
  });

  it('carries an explicit back direction through an in-app navigation', async () => {
    const nav = await loadNavHistory();

    // The fallback a detail page uses when it was opened from a shared link and
    // has no history behind it: pushing its parent list, but as a step back.
    nav.setNavigationDirection('back');
    window.history.pushState({}, '', '/search');
    firePopstate();

    expect(nav.consumePageChange()).toBe('back');
  });

  it('does not treat a query-only step as a page change', async () => {
    const nav = await loadNavHistory();

    // Filters written into the query string are the same page: pairing them
    // with a page transition would stall the update behind an animation of one
    // view sliding into an identical copy of itself.
    window.history.pushState({}, '', '/search');
    firePopstate();
    nav.consumePageChange();

    window.history.pushState({}, '', '/search?beds=2');
    firePopstate();
    expect(nav.consumePageChange()).toBeNull();

    simulateBackTo(1, '/search');
    expect(nav.consumePageChange()).toBeNull();
    expect(nav.consumeNavigationDirection()).toBe('back');
  });

  it('drops a direction that no view change ever claimed', async () => {
    const nav = await loadNavHistory();

    // A navigation that lands on the same view — two tabs of the account page,
    // say — leaves its direction unconsumed. Applying it to the navigation
    // after it is what made tapping into a listing right after a back press
    // slide in from the wrong side.
    nav.setNavigationDirection('morph');
    window.history.pushState({}, '', '/account/saved');
    firePopstate();

    window.history.pushState({}, '', '/property/abc');
    firePopstate();
    expect(nav.consumeNavigationDirection()).toBe('forward');
  });

  it('holds a direction across the navigation it was set for', async () => {
    const nav = await loadNavHistory();

    // Routing is deferred, so the view change that claims a direction lands
    // well after the navigation that set it. It has to survive that wait.
    nav.setNavigationDirection('morph');
    window.history.pushState({}, '', '/account');
    firePopstate();

    expect(nav.consumeNavigationDirection()).toBe('morph');
  });

  it('keeps an inferred back direction until the view change claims it', async () => {
    const nav = await loadNavHistory();

    window.history.pushState({}, '', '/property/abc');
    simulateBackTo(0, '/');

    // The browser's own back button: nothing set a direction, and the one
    // inferred from the index has to outlive the popstate that inferred it.
    expect(nav.consumeNavigationDirection()).toBe('back');
  });

  it('reports whether there is an in-app entry to go back to', async () => {
    const nav = await loadNavHistory();

    expect(nav.canNavigateBack()).toBe(false);
    window.history.pushState({}, '', '/search');
    expect(nav.canNavigateBack()).toBe(true);
  });
});
