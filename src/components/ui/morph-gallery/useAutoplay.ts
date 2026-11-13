import { useEffect, useRef, useState } from 'react';

/**
 * Calls `advance` every `interval` ms while `enabled`. Stops while the tab is
 * hidden, so a background tab does not silently burn through the gallery.
 * Returns a setter the caller uses to pause on hover or focus.
 */
export function useAutoplay(interval: number, enabled: boolean, advance: () => void) {
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const latest = useRef(advance);
  latest.current = advance;

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    if (!interval || !enabled || held || hidden) return;
    const id = window.setInterval(() => latest.current(), Math.max(interval, 600));
    return () => window.clearInterval(id);
  }, [interval, enabled, held, hidden]);

  return setHeld;
}
