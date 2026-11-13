import { useEffect, useState } from 'react';

/** How long after the last scroll event the page counts as still. */
const IDLE_MS = 700;

/**
 * True while the page (or any inner scroll container) is scrolling, false
 * once it has been still for IDLE_MS. Listens only while `enabled`.
 */
export function useScrollActivity(enabled: boolean): boolean {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setScrolling(false);
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), IDLE_MS);
    };
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      clearTimeout(timer);
    };
  }, [enabled]);

  return scrolling;
}
