import { useCallback, useRef } from 'react';
import type React from 'react';

/**
 * Button handlers that still work inside a Google Maps overlay pane.
 *
 * There a plain `click` is the least reliable event on touch: Maps' gesture
 * handling and any re-layout of the overlay between touchstart and touchend
 * can swallow it. So the button also acts on pointerup for touch/pen, treated
 * as a tap only when the finger stayed put (a drag that starts on the card is
 * the user panning the map). One activation per press either way.
 */
export function useOverlayTap(onActivate: () => void) {
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const latest = useRef(onActivate);
  latest.current = onActivate;

  const activate = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    // Re-arm after this event loop turn, so the same press can't fire twice
    // (pointerup + click) but a later press can.
    window.setTimeout(() => { firedRef.current = false; }, 400);
    latest.current();
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    pressRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') return; // native click keeps focus/keyboard behaviour
    const start = pressRef.current;
    pressRef.current = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
    activate();
  }, [activate]);

  const onPointerCancel = useCallback(() => { pressRef.current = null; }, []);

  return { onClick: activate, onPointerDown, onPointerUp, onPointerCancel };
}

export default useOverlayTap;
