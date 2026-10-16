import { useEffect, useState } from 'react';

/**
 * True once `hidden` has stayed true for `delayMs` — i.e. the panel has
 * finished sliding away. The List / Map switch uses it to put the off-screen
 * panel under `content-visibility: hidden`, so the phone stops rendering it
 * (and can let go of its photos) without unmounting it or losing its scroll.
 * Turning it back to false is immediate, so the panel is drawn before it
 * slides in.
 */
export function useSettledHidden(hidden: boolean, delayMs = 450): boolean {
  const [settled, setSettled] = useState(hidden);

  useEffect(() => {
    if (!hidden) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [hidden, delayMs]);

  return hidden && settled;
}

export default useSettledHidden;
