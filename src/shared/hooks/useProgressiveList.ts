import { useEffect, useRef, useState } from 'react';

/**
 * Hand out a long list a chunk at a time, so mounting it cannot own the frame a
 * navigation lands in.
 *
 * `useDeferredMount` keeps an expensive subtree out of that commit entirely.
 * This is for the case where the subtree has to be there but its *size* is the
 * problem: a map with several hundred markers is one commit whose cost scales
 * with the result count, and every one of those markers is DOM the browser then
 * has to style and lay out. Coming back to the search page, that landed as
 * seconds of a frozen screen — the page was on screen, and nothing on it moved.
 *
 * So the first chunk renders with the page and the rest arrive at idle, a chunk
 * per callback. The full list still ends up on screen, a few hundred
 * milliseconds later, while the page stays responsive throughout.
 *
 * The count only ever grows: a list that changes identity (a poll returning the
 * same rows) must not send what is already on screen back to the start.
 */
export function useProgressiveList<T>(
  items: T[],
  { initial = 60, chunk = 60 }: { initial?: number; chunk?: number } = {},
): T[] {
  const [count, setCount] = useState(initial);
  // Idle callbacks are scheduled off `count`, so keep the length they should be
  // compared against out of the effect's dependencies: a poll that returns the
  // same number of rows must not restart the schedule.
  const lengthRef = useRef(items.length);
  lengthRef.current = items.length;

  useEffect(() => {
    if (count >= items.length) return;

    let cancelled = false;
    const grow = () => {
      if (!cancelled) setCount((current) => Math.min(current + chunk, lengthRef.current));
    };

    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;

    // The timeout matters more than the idleness: the list has to finish
    // arriving on a busy page too, just not ahead of what the user is waiting
    // for. Safari has no requestIdleCallback and gets the plain timer.
    let idleHandle = 0;
    let timeoutHandle = 0;
    if (idle) {
      idleHandle = idle(grow, { timeout: 300 });
    } else {
      timeoutHandle = window.setTimeout(grow, 32);
    }

    return () => {
      cancelled = true;
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
      if (idleHandle) {
        (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(idleHandle);
      }
    };
  }, [count, items.length, chunk]);

  return count >= items.length ? items : items.slice(0, count);
}

export default useProgressiveList;
