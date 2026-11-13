// Press-and-slide on the thumb rail.
//
//   • press the rail  → the panel opens at once
//   • slide           → the row under the thumb lights up (a light haptic tick
//                       on each change, where the device supports it)
//   • lift on a row   → jump there and close; lift well away from the list → close
//   • tap (no slide)  → the panel stays open, rows are ordinary buttons;
//                       tapping the rail again closes it
//   • keyboard        → Enter/Space on the rail toggles the panel

import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import { isSlide, rowIndexAt } from './thumbRailLayout';

const HAPTIC_MS = 5;

const tick = () => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(HAPTIC_MS);
    } catch {
      // Some browsers refuse vibration outside a user gesture; it is only a nicety.
    }
  }
};

interface Options {
  rowCount: number;
  rowHeight: number;
  /** The scrolling list of rows inside the panel. */
  listRef: React.RefObject<HTMLElement>;
  onPick: (index: number) => void;
}

interface Press {
  id: number;
  x: number;
  y: number;
  sliding: boolean;
  wasOpen: boolean;
}

export function useRailScrub({ rowCount, rowHeight, listRef, onPick }: Options) {
  const [open, setOpen] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [hover, setHover] = useState(-1);
  const press = useRef<Press | null>(null);
  const hoverRef = useRef(-1);
  const latest = useRef({ rowCount, rowHeight, onPick });
  latest.current = { rowCount, rowHeight, onPick };

  const setHovered = useCallback((i: number) => {
    if (i === hoverRef.current) return;
    hoverRef.current = i;
    setHover(i);
    if (i >= 0) tick();
  }, []);

  const close = useCallback(() => {
    press.current = null;
    setOpen(false);
    setSliding(false);
    setHovered(-1);
  }, [setHovered]);

  const rowAt = (clientY: number): number => {
    const list = listRef.current;
    if (!list) return -1;
    const rect = list.getBoundingClientRect();
    const { rowHeight: h, rowCount: n } = latest.current;
    return rowIndexAt(clientY + list.scrollTop, rect.top, h, n);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a convenience; moves still arrive while over the rail.
    }
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sliding: false, wasOpen: open };
    setOpen(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.sliding && isSlide(e.clientX - p.x, e.clientY - p.y)) {
      p.sliding = true;
      setSliding(true);
    }
    if (p.sliding) setHovered(rowAt(e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (!p.sliding) {
      // A tap: open for tapping, or close if it was already open.
      if (p.wasOpen) close();
      return;
    }
    const picked = rowAt(e.clientY);
    close();
    if (picked >= 0) latest.current.onPick(picked);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (press.current?.id === e.pointerId) close();
  };

  /** Keyboard activation (a pointer press is handled above; its click has detail ≥ 1). */
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.detail !== 0) return;
    if (open) close();
    else setOpen(true);
  };

  return {
    open,
    sliding,
    hover,
    close,
    handleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick },
  };
}
