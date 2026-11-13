// Reads the screen for the thumb rail: the free band between the page header
// and the bottom contact bar, and where the panel goes inside it.

import { panelLayout, type PanelLayout } from './thumbRailLayout';

/** The rail's middle, as a fraction of the viewport height (the thumb's natural reach). */
export const RAIL_CENTER = 0.58;

/** Marks the elements the panel must stay clear of. */
export const TOP_EDGE_ATTR = 'data-thumb-rail-top-edge';
export const BOTTOM_EDGE_ATTR = 'data-thumb-rail-bottom-edge';

const GAP_PX = 8;
const FALLBACK_TOP_PX = 72;
const FALLBACK_BOTTOM_PX = 96;
/** Room for the settings view, so swapping to it never resizes the panel. */
const MIN_PANEL_PX = 420;

/** Bottom (top edge) of the first laid-out element with `attr`, or null. */
const edge = (attr: string, which: 'bottom' | 'top'): number | null => {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[${attr}]`));
  const el = els.find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.height > 0 ? r[which] : null;
};

export interface RailGeometry {
  layout: PanelLayout;
  /** The rail's middle, px from the viewport top. */
  anchorY: number;
}

export const readRailGeometry = (rowCount: number): RailGeometry => {
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
  const headerBottom = typeof document === 'undefined' ? null : edge(TOP_EDGE_ATTR, 'bottom');
  const barTop = typeof document === 'undefined' ? null : edge(BOTTOM_EDGE_ATTR, 'top');
  const topInset = Math.max(headerBottom ?? FALLBACK_TOP_PX, 0) + GAP_PX;
  const bottomInset = (barTop === null ? FALLBACK_BOTTOM_PX : viewportHeight - barTop) + GAP_PX;
  const anchorY = viewportHeight * RAIL_CENTER;
  const layout = panelLayout({ viewportHeight, rowCount, anchorY, topInset, bottomInset, minHeight: MIN_PANEL_PX });
  return { layout, anchorY };
};
