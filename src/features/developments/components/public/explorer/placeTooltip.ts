export interface TooltipPlacement {
  left: number;
  top: number;
  /** Which side of the anchor it ended up on. */
  side: 'above' | 'below';
}

/**
 * Viewport-safe tooltip position: prefer above-right of the anchor, flip
 * below when there is no room above, flip left when it would overflow the
 * right edge, then clamp inside the viewport with a margin.
 */
export function placeTooltip(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 14,
  margin = 8
): TooltipPlacement {
  let left = anchor.x + gap;
  if (left + size.width > viewport.width - margin) left = anchor.x - gap - size.width;
  let top = anchor.y - gap - size.height;
  let side: TooltipPlacement['side'] = 'above';
  if (top < margin) {
    top = anchor.y + gap;
    side = 'below';
  }
  left = Math.min(Math.max(margin, left), Math.max(margin, viewport.width - margin - size.width));
  top = Math.min(Math.max(margin, top), Math.max(margin, viewport.height - margin - size.height));
  return { left, top, side };
}
