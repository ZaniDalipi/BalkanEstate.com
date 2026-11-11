import { useEffect, useRef, useState } from 'react';

/**
 * A busy flag that does not blink.
 *
 * Loading states flip on and off quickly: a fetch that answers in 80ms, two
 * steps of a load back to back. Shown as-is, a spinner flashes for a frame or
 * disappears and comes straight back, which reads as flicker. This only shows
 * the flag once it has been true for `showDelay` ms, and once shown keeps it
 * for at least `minVisible` ms.
 */
export function useSmoothFlag(flag: boolean, { showDelay = 150, minVisible = 500 } = {}): boolean {
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (flag && !shown) {
      const timer = window.setTimeout(() => {
        shownAt.current = Date.now();
        setShown(true);
      }, showDelay);
      return () => window.clearTimeout(timer);
    }
    if (!flag && shown) {
      const remaining = Math.max(0, minVisible - (Date.now() - shownAt.current));
      const timer = window.setTimeout(() => setShown(false), remaining);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [flag, shown, showDelay, minVisible]);

  return shown;
}

export default useSmoothFlag;
