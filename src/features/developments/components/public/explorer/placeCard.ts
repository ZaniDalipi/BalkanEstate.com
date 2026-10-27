import type { AnchorRect } from './useHotspotInteraction';

export interface CardPlacement {
  left: number;
  top: number;
  /** Card sits above the region (arrow points down) or below it (arrow up). */
  side: 'above' | 'below';
  /** Arrow x offset inside the card, so it keeps pointing at the region when clamped. */
  arrowX: number;
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
