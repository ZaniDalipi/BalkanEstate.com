import { useCallback, useEffect, useState } from 'react';

/**
 * "Full screen" without the Fullscreen API: the stage becomes `fixed inset-0`
 * (portalled, z below 5000 so platform modals still stack above), the page
 * behind stops scrolling, and Esc exits — unless something layered above
 * (the unit drawer, a modal) already handled that Esc.
 */
export function usePseudoFullscreen() {
  const [isFullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen]);

  const toggle = useCallback(() => setFullscreen((v) => !v), []);
  const exit = useCallback(() => setFullscreen(false), []);
  return { isFullscreen, toggle, exit };
}
