/**
 * Phone bottom sheet that follows the finger and settles on one of three
 * heights, like the Zillow sheet: full (reading), half (the building stays in
 * view above it) or closed. The sheet is always as tall as "full"; its vertical
 * offset `y` (px, 0 = full) says how far it is pulled down. Pure rules, so they
 * are tested without a DOM.
 */
export type SheetSize = 'half' | 'full';
export type SheetSnap = SheetSize | 'closed';

/** Share of the screen height the sheet covers at each size. */
export const SHEET_SHARE: Record<SheetSize, number> = { half: 0.55, full: 0.9 };

export interface SheetGeometry {
  /** The sheet's own height (its full size). */
  sheetHeight: number;
  /** Offset at half size. */
  halfY: number;
  /** Offset that hides it below the screen. */
  closedY: number;
}

export function sheetGeometry(viewportHeight: number): SheetGeometry {
  const sheetHeight = Math.round(viewportHeight * SHEET_SHARE.full);
  return { sheetHeight, halfY: sheetHeight - Math.round(viewportHeight * SHEET_SHARE.half), closedY: sheetHeight };
}

export const snapY = (snap: SheetSnap, g: SheetGeometry): number => (snap === 'full' ? 0 : snap === 'half' ? g.halfY : g.closedY);

/** A drag moves the sheet between full and closed, never beyond. */
export const clampSheetY = (y: number, g: SheetGeometry): number => Math.min(Math.max(y, 0), g.closedY);

/** How far ahead (seconds) the finger's speed carries the sheet when it lets go. */
const PROJECTION_S = 0.18;
/** Share of the half → closed distance that has to be passed (with momentum) to close it. */
const CLOSE_AT = 0.4;

/**
 * Where the sheet settles when released at `y` moving `velocityY` px/s (down is
 * positive): the position it would coast to decides. Past half of the way to half
 * it goes full, past 40% of the way down from half it closes, otherwise half.
 */
export function snapAfterRelease(y: number, velocityY: number, g: SheetGeometry): SheetSnap {
  const projected = y + velocityY * PROJECTION_S;
  if (projected < g.halfY / 2) return 'full';
  if (projected > g.halfY + (g.closedY - g.halfY) * CLOSE_AT) return 'closed';
  return 'half';
}

/** Finger travel (px) before a touch counts as a drag rather than a tap. */
export const DRAG_SLOP = 6;

/**
 * What a touch that has moved `dy` px (down is positive) means. The handle and
 * the title area always drag the sheet. Over the content: at half height the
 * content does not scroll, so any vertical move drags the sheet (up grows it);
 * at full height the content scrolls, and only a pull *down* from its very top
 * takes the sheet down with it. A mostly sideways move is never a sheet drag.
 */
export function dragIntent(input: { inContent: boolean; size: SheetSize; scrollTop: number; dy: number; dx?: number }): 'wait' | 'drag' | 'scroll' {
  const dx = Math.abs(input.dx ?? 0);
  // A sideways swipe belongs to what is under the finger (the photo gallery), not to the sheet.
  if (dx >= DRAG_SLOP && dx > Math.abs(input.dy)) return 'scroll';
  if (Math.abs(input.dy) < DRAG_SLOP) return 'wait';
  if (!input.inContent || input.size === 'half') return 'drag';
  return input.dy > 0 && input.scrollTop <= 0 ? 'drag' : 'scroll';
}

/** Dim of the picture behind: strongest at full, light at half, none when closed (0…1). */
export function backdropStrength(y: number, g: SheetGeometry): number {
  if (y <= g.halfY) return 0.2 + 0.8 * (1 - y / Math.max(g.halfY, 1));
  return Math.max(0, 0.2 * (1 - (y - g.halfY) / Math.max(g.closedY - g.halfY, 1)));
}
