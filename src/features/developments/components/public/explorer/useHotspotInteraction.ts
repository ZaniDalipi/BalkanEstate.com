import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Hotspot } from '../../../types';

export interface AnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HoverState {
  id: string;
  /** Viewport box of the region; the card points at its top centre. */
  rect: AnchorRect;
  /** Shown by a first tap on touch. */
  touch: boolean;
}

/** How long a card survives the pointer leaving its region (time to reach the card). */
export const CARD_GRACE_MS = 180;

const rectOf = (el: Element): AnchorRect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/**
 * Hover / focus / tap behaviour for explorer regions:
 *  - mouse: hover shows the region's card, anchored to the region; the card
 *    stays open while the pointer travels onto it (grace delay) so its button
 *    can be clicked; clicking the region opens it directly;
 *  - touch: first tap shows the card, a second tap (or the card's button) opens;
 *  - keyboard: focus shows the card, Enter/Space opens;
 *  - a press that turned into a pan (consumeDrag) never opens anything.
 */
export function useHotspotInteraction(consumeDrag: () => boolean, onActivate: (h: Hotspot) => void) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const pointerType = useRef<string>('mouse');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const scheduleClose = useCallback(
    (id?: string) => {
      cancelClose();
      closeTimer.current = setTimeout(() => {
        setHover((cur) => (cur && !cur.touch && (!id || cur.id === id) ? null : cur));
      }, CARD_GRACE_MS);
    },
    [cancelClose]
  );
  useEffect(() => cancelClose, [cancelClose]);

  // The card is anchored to where the region was; once the page scrolls it
  // would float over unrelated content, so drop it.
  const open = hover !== null;
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setHover(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const activate = useCallback(
    (h: Hotspot) => {
      cancelClose();
      setHover(null);
      onActivate(h);
    },
    [onActivate, cancelClose]
  );

  const bind = (h: Hotspot) => ({
    onPointerDown: (e: React.PointerEvent<SVGGElement>) => {
      pointerType.current = e.pointerType || 'mouse';
    },
    onPointerEnter: (e: React.PointerEvent<SVGGElement>) => {
      if (e.pointerType !== 'mouse') return;
      cancelClose();
      setHover({ id: h.id, rect: rectOf(e.currentTarget), touch: false });
    },
    onPointerMove: (e: React.PointerEvent<SVGGElement>) => {
      if (e.pointerType !== 'mouse') return;
      cancelClose();
      setHover((cur) => (cur?.id === h.id && !cur.touch ? cur : { id: h.id, rect: rectOf(e.currentTarget), touch: false }));
    },
    onPointerLeave: () => scheduleClose(h.id),
    onClick: (e: React.MouseEvent<SVGGElement>) => {
      e.stopPropagation();
      if (consumeDrag()) return;
      if (pointerType.current === 'touch') {
        if (hover?.id === h.id && hover.touch) activate(h);
        else setHover({ id: h.id, rect: rectOf(e.currentTarget), touch: true });
        return;
      }
      activate(h);
    },
    onActivateKey: () => activate(h),
    onFocus: (e: React.FocusEvent<SVGGElement>) => {
      const rect = rectOf(e.currentTarget);
      setHover((cur) => (cur?.id === h.id ? cur : { id: h.id, rect, touch: false }));
    },
    onBlur: () => scheduleClose(h.id),
  });

  const dismiss = useCallback(() => {
    cancelClose();
    setHover(null);
  }, [cancelClose]);

  /** Show a region's card anchored to another element (e.g. its name tag). */
  const showFor = useCallback(
    (h: Hotspot, el: Element) => {
      cancelClose();
      setHover({ id: h.id, rect: rectOf(el), touch: false });
    },
    [cancelClose]
  );

  /** Handlers for the card itself: hovering it keeps it open. */
  const cardHandlers = { onPointerEnter: cancelClose, onPointerLeave: () => scheduleClose() };

  return { hover, bind, activate, dismiss, cardHandlers, showFor, scheduleClose };
}
