/**
 * Geometry for the mobile thumb rail: where its panel opens, how tall each
 * row is, and which row the thumb is over while it slides.
 */

/** Rows never get shorter than this (still an easy thumb target)… */
export const MIN_ROW_PX = 36;
/** …nor taller than this (a short list stays compact). */
export const MAX_ROW_PX = 44;
/** The panel's heading and padding around the rows. */
export const PANEL_CHROME_PX = 60;
/** A press that travels further than this is a slide, not a tap. */
export const SLIDE_THRESHOLD_PX = 6;
/** A thumb this far above or below the list still picks the first/last row. */
export const ROW_SLOP_PX = 28;

export interface PanelLayout {
  /** Viewport top of the panel, px. */
  top: number;
  rowHeight: number;
  /** Panel height, px; capped to the room available (the list then scrolls). */
  height: number;
}

export interface PanelLayoutInput {
  viewportHeight: number;
  rowCount: number;
  /** Where the panel should centre: the rail's middle, px from the viewport top. */
  anchorY: number;
  /** Room kept free at the top (header, notch) and bottom (contact bar), px. */
  topInset: number;
  bottomInset: number;
  /** The panel is never shorter than this (room for its settings view), px. */
  minHeight?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Centre the panel on the rail, keep it between the insets, and give the rows
 * as much height as fits (between MIN_ROW_PX and MAX_ROW_PX).
 */
export const panelLayout = ({ viewportHeight, rowCount, anchorY, topInset, bottomInset, minHeight = 0 }: PanelLayoutInput): PanelLayout => {
  const room = Math.max(viewportHeight - topInset - bottomInset, PANEL_CHROME_PX + MIN_ROW_PX);
  const rows = Math.max(rowCount, 1);
  const rowHeight = clamp(Math.floor((room - PANEL_CHROME_PX) / rows), MIN_ROW_PX, MAX_ROW_PX);
  const height = Math.min(Math.max(PANEL_CHROME_PX + rowHeight * rows, minHeight), room);
  const top = clamp(anchorY - height / 2, topInset, Math.max(topInset, viewportHeight - bottomInset - height));
  return { top: Math.round(top), rowHeight, height };
};

/**
 * The row under a thumb at viewport `y`, given the list's top edge and row
 * height: -1 when the thumb is well clear of the list (lifting there cancels).
 */
export const rowIndexAt = (y: number, listTop: number, rowHeight: number, rowCount: number, slop = ROW_SLOP_PX): number => {
  if (rowCount <= 0 || rowHeight <= 0) return -1;
  const listBottom = listTop + rowHeight * rowCount;
  if (y < listTop - slop || y > listBottom + slop) return -1;
  return clamp(Math.floor((y - listTop) / rowHeight), 0, rowCount - 1);
};

/** True once a press has moved far enough to count as a slide. */
export const isSlide = (dx: number, dy: number, threshold = SLIDE_THRESHOLD_PX): boolean =>
  Math.hypot(dx, dy) > threshold;

/**
 * Where the rail sits inside the open panel, px from the panel's top: the
 * point the panel grows out of and shrinks back into (kept within the panel).
 */
export const panelOriginY = (anchorY: number, layout: PanelLayout): number =>
  Math.round(clamp(anchorY - layout.top, 0, layout.height));
