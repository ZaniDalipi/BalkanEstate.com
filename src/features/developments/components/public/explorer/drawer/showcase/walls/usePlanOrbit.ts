import { useRef, useState } from 'react';
import { ORBIT_REST, orbitBy, orbitByDrag, type Orbit } from './planOrbit';

/**
 * Turning the plan model round by dragging (or the turn buttons and arrow
 * keys). `moved` is true once the buyer has turned it, so the model follows
 * the hand quickly instead of with its slow rise.
 */
export function usePlanOrbit() {
  const [orbit, setOrbit] = useState<Orbit>(ORBIT_REST);
  const [moved, setMoved] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; start: Orbit } | null>(null);

  const step = (turn: number, tilt = 0) => {
    setMoved(true);
    setOrbit((o) => orbitBy(o, turn, tilt));
  };

  const bind = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: orbit };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      setMoved(true);
      setOrbit(orbitByDrag(d.start, e.clientX - d.x, e.clientY - d.y));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (drag.current?.id === e.pointerId) drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      const keys: Record<string, [number, number]> = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
      const k = keys[e.key];
      if (!k) return;
      e.preventDefault();
      step(k[0], k[1]);
    },
  };

  const reset = () => {
    setMoved(true);
    setOrbit(ORBIT_REST);
  };

  return { orbit, moved, bind, step, reset };
}
