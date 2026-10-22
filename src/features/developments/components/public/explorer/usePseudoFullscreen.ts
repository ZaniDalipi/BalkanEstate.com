import { useCallback, useEffect, useRef, useState } from 'react';
import { useEscapeLayer } from './useEscapeLayer';

/**
 * "Full screen" without the Fullscreen API: the stage becomes `fixed inset-0`
 * (portalled, z below 5000 so platform modals still stack above), the page
 * behind stops scrolling, and Esc exits — unless a layer above the stage (the
 * unit drawer, a platform modal) is open or already handled that Esc.
 * Attach `stageRef` to the stage element.
 */
export function usePseudoFullscreen<T extends HTMLElement = HTMLElement>() {
  const [isFullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<T>(null);
  const exit = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);
  useEscapeLayer(stageRef, exit, isFullscreen);

  const toggle = useCallback(() => setFullscreen((v) => !v), []);
  return { isFullscreen, toggle, exit, stageRef };
}
