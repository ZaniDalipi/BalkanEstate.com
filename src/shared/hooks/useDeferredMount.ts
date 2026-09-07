import { useEffect, useState } from 'react';

/**
 * Keep an expensive subtree out of the render that a navigation commits.
 *
 * A page change is one React commit: the outgoing page unmounts and the
 * incoming one mounts in the same frame, and everything that frame touches is
 * paid for before anything moves on screen. On the search pages that frame
 * includes a full map instance — Google Maps or Leaflet, its tiles, its markers
 * — which on a phone is by far the largest thing in it, and on mobile the map
 * is behind the list panel where nobody can see it yet.
 *
 * This hook says "not in that commit, but soon": while `defer` is true the
 * caller renders without the expensive part, and once the browser is idle —
 * after the commit, after the entrance animation, after anything the user is
 * actually waiting on — it flips to true and the subtree mounts normally.
 *
 * The flip is one-way. Something already on screen must never be torn down
 * because a flag went back to false, so `defer` turning true again after the
 * mount is ignored; and `defer` turning *false* (the user opened the map)
 * mounts immediately rather than waiting for idle.
 */
export function useDeferredMount(defer: boolean): boolean {
  const [mounted, setMounted] = useState(!defer);

  useEffect(() => {
    if (mounted) return;

    // No longer deferred — the thing is wanted on screen now, not at idle.
    if (!defer) {
      setMounted(true);
      return;
    }

    let cancelled = false;
    const mount = () => {
      if (!cancelled) setMounted(true);
    };

    // One frame first, so the wait starts after the commit that rendered us
    // rather than during it, then idle. The timeout is the backstop for a tab
    // that never goes idle — a map that mounts late is fine, one that never
    // mounts is not.
    let idleHandle = 0;
    let timeoutHandle = 0;
    const frame = window.requestAnimationFrame(() => {
      const idle = (window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      if (idle) {
        idleHandle = idle(mount, { timeout: 1200 });
      } else {
        // Safari has no requestIdleCallback. A delay past the page transition
        // is close enough — the point is only to miss the busy frames.
        timeoutHandle = window.setTimeout(mount, 400);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
      if (idleHandle) {
        (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(idleHandle);
      }
    };
  }, [defer, mounted]);

  return mounted;
}

export default useDeferredMount;
