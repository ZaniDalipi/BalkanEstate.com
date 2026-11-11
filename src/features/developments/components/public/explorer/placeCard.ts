import type { AnchorRect } from './useHotspotInteraction';

export interface CardPlacement {
  left: number;
  top: number;
  /** Where the card sits relative to the region; the arrow points back at it. */
  side: 'above' | 'below' | 'left' | 'right';
  /** Arrow offset inside the card (x for above/below, y for left/right), so it keeps pointing at the region when clamped. */
  arrowX: number;
  arrowY?: number;
}

/**
 * Place a region card centred on the region's top edge (East Gate style),
 * flipping below the region when there's no room above, then clamping inside
 * the viewport. The arrow tracks the region centre even after clamping.
 */
export function placeCard(
  anchor: AnchorRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 12,
  margin = 8
): CardPlacement {
  const cx = anchor.left + anchor.width / 2;
  let side: CardPlacement['side'] = 'above';
  let top = anchor.top - gap - size.height;
  if (top < margin) {
    side = 'below';
    top = anchor.top + anchor.height + gap;
    // Neither fits (very tall region): overlap from the top edge instead.
    if (top + size.height > viewport.height - margin) top = Math.max(margin, anchor.top + gap);
  }
  const maxLeft = Math.max(margin, viewport.width - margin - size.width);
  const left = Math.min(Math.max(margin, cx - size.width / 2), maxLeft);
  const arrowX = Math.min(Math.max(16, cx - left), size.width - 16);
  return { left, top, side, arrowX };
}

/**
 * Place a region card beside the region, vertically centred on it, on
 * whichever side has more room (like a label pinned next to a window), so the
 * floors above and below stay in view. Falls back to {@link placeCard} when
 * neither side has room for the card.
 */
export function placeCardBeside(
  anchor: AnchorRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 14,
  margin = 8
): CardPlacement {
  const roomRight = viewport.width - margin - (anchor.left + anchor.width + gap);
  const roomLeft = anchor.left - gap - margin;
  const side = roomRight >= roomLeft ? 'right' : 'left';
  if (Math.max(roomLeft, roomRight) < size.width) return placeCard(anchor, size, viewport, gap, margin);
  const cy = anchor.top + anchor.height / 2;
  const maxTop = Math.max(margin, viewport.height - margin - size.height);
  const top = Math.min(Math.max(margin, cy - size.height / 2), maxTop);
  const left = side === 'right' ? anchor.left + anchor.width + gap : anchor.left - gap - size.width;
  const arrowY = Math.min(Math.max(16, cy - top), size.height - 16);
  return { left, top, side, arrowX: 0, arrowY };
}
