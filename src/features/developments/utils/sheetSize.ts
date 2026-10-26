/** Phone bottom-sheet sizes: half leaves the building visible above, full is for reading. */
export type SheetSize = 'half' | 'full';

/** How far (px) the handle must be dragged before the sheet changes size. */
export const SHEET_DRAG_THRESHOLD = 48;

/**
 * Where a drag on the sheet's handle leads: up grows it, down shrinks it, and
 * down from half closes it. Small drags (and taps) leave it as it is.
 */
export function sheetAfterDrag(size: SheetSize, offsetY: number): SheetSize | 'close' {
  if (offsetY <= -SHEET_DRAG_THRESHOLD) return 'full';
  if (offsetY >= SHEET_DRAG_THRESHOLD) return size === 'full' ? 'half' : 'close';
  return size;
}
