import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Hotspot } from '../../../types';

export interface HoverState {
  id: string;
  x: number;
  y: number;
  /** Shown by a first tap on touch: the tooltip carries the action button. */
  touch: boolean;
}

/**
 * Hover / focus / tap behaviour for explorer regions:
 *  - mouse: hover shows the preview, click opens;
 *  - touch: first tap shows the preview (+ action), a second tap opens;
 *  - keyboard: focus shows the preview at the region, Enter/Space opens;
 *  - a press that turned into a pan (consumeDrag) never opens anything.
 */
export function useHotspotInteraction(consumeDrag: () => boolean, onActivate: (h: Hotspot) => void) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const pointerType = useRef<string>('mouse');

  // A tap preview is anchored to where the finger was; once the page scrolls
  // it would float over unrelated content, so drop it.
  const touchOpen = hover?.touch === true;
  useEffect(() => {
    if (!touchOpen) return undefined;
    const close = () => setHover(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [touchOpen]);

  const activate = useCallback(
    (h: Hotspot) => {
      setHover(null);
      onActivate(h);
    },
    [onActivate]
  );

  const bind = (h: Hotspot) => ({
    onPointerDown: (e: React.PointerEvent<SVGGElement>) => {
      pointerType.current = e.pointerType || 'mouse';
    },
    onPointerEnter: (e: React.PointerEvent<SVGGElement>) => {
      if (e.pointerType === 'mouse') setHover({ id: h.id, x: e.clientX, y: e.clientY, touch: false });
    },
    onPointerMove: (e: React.PointerEvent<SVGGElement>) => {
      if (e.pointerType === 'mouse') setHover({ id: h.id, x: e.clientX, y: e.clientY, touch: false });
    },
    onPointerLeave: () => setHover((cur) => (cur && !cur.touch && cur.id === h.id ? null : cur)),
    onClick: (e: React.MouseEvent<SVGGElement>) => {
      e.stopPropagation();
      if (consumeDrag()) return;
      if (pointerType.current === 'touch') {
        if (hover?.id === h.id && hover.touch) activate(h);
        else setHover({ id: h.id, x: e.clientX, y: e.clientY, touch: true });
        return;
      }
      activate(h);
    },
    onActivateKey: () => activate(h),
    onFocus: (e: React.FocusEvent<SVGGElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setHover((cur) => (cur?.id === h.id ? cur : { id: h.id, x: r.left + r.width / 2, y: r.top + r.height / 2, touch: false }));
    },
    onBlur: () => setHover((cur) => (cur && !cur.touch && cur.id === h.id ? null : cur)),
  });

  const dismiss = useCallback(() => setHover(null), []);

  return { hover, bind, activate, dismiss };
}
