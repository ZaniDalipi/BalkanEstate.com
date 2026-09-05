import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * `pageTransition` holds module state (the running flag, the pending commit
 * waiter), so each case starts from a fresh import.
 */
async function loadPageTransition() {
  vi.resetModules();
  return import('@/app/navigation/pageTransition');
}

type StartArg = () => void | Promise<void>;

/**
 * A stand-in for `document.startViewTransition`. jsdom has no View Transitions
 * API at all, so every case that exercises the animated path installs this and
 * drives it by hand: `capture()` plays the browser's part of calling the update
 * callback and waiting on whatever it returns.
 */
function installViewTransitionStub() {
  let update: StartArg | null = null;
  let finish: () => void = () => {};
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const start = vi.fn((callback: StartArg) => {
    update = callback;
    return { finished, updateCallbackDone: Promise.resolve() };
  });
  (document as Document & { startViewTransition?: unknown }).startViewTransition = start;

  return {
    start,
    /** Run the update callback and resolve once it says the new view is ready. */
    async capture() {
      const result = update?.();
      await result;
    },
    /** The browser finishing the animation. */
    async complete() {
      finish();
      await finished;
      await Promise.resolve();
    },
  };
}

describe('pageTransition', () => {
  beforeEach(() => {
    delete (document as Document & { startViewTransition?: unknown }).startViewTransition;
    delete document.documentElement.dataset.navTransition;
    // jsdom has no matchMedia; the module treats a missing one as "no
    // preference", which is what a browser without the query would report.
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    delete (document as Document & { startViewTransition?: unknown }).startViewTransition;
  });

  it('still navigates where the browser cannot animate', async () => {
    const { runPageTransition, isPageTransitionRunning } = await loadPageTransition();
    const update = vi.fn();

    runPageTransition('back', update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(isPageTransitionRunning()).toBe(false);
    expect(document.documentElement.dataset.navTransition).toBeUndefined();
  });

  it('leaves the animation to the entrance classes under reduced motion', async () => {
    installViewTransitionStub();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { runPageTransition } = await loadPageTransition();
    const update = vi.fn();

    runPageTransition('back', update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navTransition).toBeUndefined();
  });

  it('runs the navigation inside a view transition, tagged with its direction', async () => {
    const browser = installViewTransitionStub();
    const { runPageTransition, isPageTransitionRunning, notifyViewCommitted } = await loadPageTransition();
    const update = vi.fn();

    runPageTransition('back', update);

    // The attribute has to be on the element before the browser captures the
    // old state — that is what gives the page region its transition name.
    expect(document.documentElement.dataset.navTransition).toBe('back');
    expect(isPageTransitionRunning()).toBe(true);
    expect(update).not.toHaveBeenCalled();

    const captured = browser.capture();
    expect(update).toHaveBeenCalledTimes(1);
    notifyViewCommitted();
    await captured;

    await browser.complete();
    expect(isPageTransitionRunning()).toBe(false);
    expect(document.documentElement.dataset.navTransition).toBeUndefined();
  });

  it('holds the capture open until the new view is committed', async () => {
    const browser = installViewTransitionStub();
    const { runPageTransition, notifyViewCommitted } = await loadPageTransition();

    runPageTransition('forward', vi.fn());

    let ready = false;
    const captured = browser.capture().then(() => { ready = true; });
    await Promise.resolve();
    // Routing commits a tick or two after the callback runs; capturing before
    // it would animate the outgoing page against a copy of itself.
    expect(ready).toBe(false);

    notifyViewCommitted();
    await captured;
    expect(ready).toBe(true);
  });

  it('gives up waiting rather than freezing the page on a slow route', async () => {
    vi.useFakeTimers();
    try {
      const browser = installViewTransitionStub();
      const { runPageTransition } = await loadPageTransition();

      runPageTransition('forward', vi.fn());
      let ready = false;
      const captured = browser.capture().then(() => { ready = true; });

      await vi.advanceTimersByTimeAsync(400);
      await captured;
      expect(ready).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips one transition for a gesture that already animated the exit', async () => {
    const browser = installViewTransitionStub();
    const { runPageTransition, skipNextPageTransition } = await loadPageTransition();
    const update = vi.fn();

    skipNextPageTransition();
    runPageTransition('back', update);
    expect(browser.start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);

    // One navigation only — the next one animates again.
    runPageTransition('back', vi.fn());
    expect(browser.start).toHaveBeenCalledTimes(1);
  });

  it('settles the motion once the arriving view is known', async () => {
    installViewTransitionStub();
    const { runPageTransition, setPageTransitionMotion } = await loadPageTransition();

    // A navigation opens with the direction history implies; which view it
    // lands on — a sheet, a change of context — is only known once routing has
    // resolved it, which is still before the new state is captured.
    runPageTransition('forward', vi.fn());
    expect(document.documentElement.dataset.navTransition).toBe('forward');

    setPageTransitionMotion('up');
    expect(document.documentElement.dataset.navTransition).toBe('up');
  });

  it('ignores a motion set when nothing is running', async () => {
    const { setPageTransitionMotion } = await loadPageTransition();

    setPageTransitionMotion('morph');
    expect(document.documentElement.dataset.navTransition).toBeUndefined();
  });

  it('lets a second navigation take over from one still running', async () => {
    const first = installViewTransitionStub();
    const { runPageTransition, isPageTransitionRunning } = await loadPageTransition();

    runPageTransition('forward', vi.fn());
    // A second navigation before the first has finished — a double back press.
    installViewTransitionStub();
    runPageTransition('back', vi.fn());
    expect(document.documentElement.dataset.navTransition).toBe('back');

    // The abandoned transition settling must not clear the live one's state.
    await first.complete();
    expect(isPageTransitionRunning()).toBe(true);
    expect(document.documentElement.dataset.navTransition).toBe('back');
  });
});
