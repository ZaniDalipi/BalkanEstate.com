import { useEffect, useRef } from 'react';
import type React from 'react';
import { isTopmostLayer } from './isTopmostLayer';

/**
 * Call `onEscape` on Esc (anywhere on the page) while `enabled`, but only if
 * the layer `ref` is topmost when the key goes down. The check runs in the
 * window *capture* phase — before any handler — so a modal that closes itself
 * on that same Esc is still seen as "above"; the action runs in the bubble
 * phase and is skipped when someone already handled the key
 * (`defaultPrevented`). Handling it calls preventDefault, so the next layer
 * down ignores it: Esc peels modal → drawer → full screen, one per press.
 */
export function useEscapeLayer(ref: React.RefObject<HTMLElement>, onEscape: () => void, enabled = true) {
  const cb = useRef(onEscape);
  cb.current = onEscape;

  useEffect(() => {
    if (!enabled) return undefined;
    let topmost = false;
    const capture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') topmost = isTopmostLayer(ref.current);
    };
    const bubble = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !topmost || e.defaultPrevented) return;
      topmost = false;
      e.preventDefault();
      cb.current();
    };
    window.addEventListener('keydown', capture, true);
    window.addEventListener('keydown', bubble);
    return () => {
      window.removeEventListener('keydown', capture, true);
      window.removeEventListener('keydown', bubble);
    };
  }, [enabled, ref]);
}
