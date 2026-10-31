import { useLayoutEffect, useState, type RefObject } from 'react';

export interface AnchoredMenuPosition {
  left: number;
  bottom: number;
}

const GAP = 8;
const EDGE = 8;

/**
 * Where a menu that opens upward from `anchor` sits on the screen, in
 * viewport pixels: its bottom edge just above the anchor, its left edge on
 * the anchor's, kept on screen.
 */
export function menuPositionAbove(anchor: DOMRect, menuWidth: number, viewportWidth: number, viewportHeight: number): AnchoredMenuPosition {
  const maxLeft = Math.max(EDGE, viewportWidth - menuWidth - EDGE);
  return {
    left: Math.min(Math.max(anchor.left, EDGE), maxLeft),
    bottom: viewportHeight - anchor.top + GAP,
  };
}

/**
 * Tracks the position of an upward-opening menu attached to `anchorRef`
 * while it is open, following the anchor through resizes and scrolls.
 */
export function useAnchoredMenuPosition(
  anchorRef: RefObject<HTMLElement>,
  isOpen: boolean,
  menuWidth: number,
): AnchoredMenuPosition | null {
  const [position, setPosition] = useState<AnchoredMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      setPosition(menuPositionAbove(anchor.getBoundingClientRect(), menuWidth, window.innerWidth, window.innerHeight));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, isOpen, menuWidth]);

  return position;
}
