/**
 * The part of the map that gets pins.
 *
 * The search page loads every listing in the region (up to 3000), and a pin is
 * a DOM node plus a Google marker. Building one for each, wherever it is, is
 * what made the map heavy enough for Safari to kill the tab on a phone. So
 * pins exist only for the area around what is on screen: the viewport padded
 * by `pad` viewports on every side, room enough for a pan without waiting.
 *
 * The area is sticky. A pan that stays inside it changes nothing, so moving a
 * little never rebuilds pins; leaving it, or zooming in far enough that it is
 * much bigger than needed, re-centres it on the new view. Cluster counts stay
 * right because a cluster is tens of pixels across and the padding is a whole
 * screen.
 */
export interface Area {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Viewports of padding on each side of the visible area. */
export const MARKER_AREA_PAD = 1;
/** An area more than this many times the size it needs is shrunk back. */
const MAX_OVERSIZE = 4;

const span = (a: Area) => Math.max(0, a.north - a.south) * Math.max(0, a.east - a.west);

export function padArea(view: Area, pad: number = MARKER_AREA_PAD): Area {
  const dLat = (view.north - view.south) * pad;
  const dLng = (view.east - view.west) * pad;
  return {
    south: Math.max(-90, view.south - dLat),
    north: Math.min(90, view.north + dLat),
    west: Math.max(-180, view.west - dLng),
    east: Math.min(180, view.east + dLng),
  };
}

export function contains(outer: Area, inner: Area): boolean {
  return inner.south >= outer.south && inner.north <= outer.north
    && inner.west >= outer.west && inner.east <= outer.east;
}

export function isValidArea(a: Area | null | undefined): a is Area {
  return !!a && [a.south, a.west, a.north, a.east].every(Number.isFinite)
    && a.north > a.south && a.east > a.west;
}

/**
 * The area to build pins for, given the current one and the new viewport.
 * Returns `current` itself (same object) when nothing needs to change, so it
 * can be stored in React state without causing a re-render.
 */
export function nextMarkerArea(current: Area | null, view: Area, pad: number = MARKER_AREA_PAD): Area | null {
  if (!isValidArea(view)) return current;
  const wanted = padArea(view, pad);
  if (!current) return wanted;
  const tooBig = span(current) > span(wanted) * MAX_OVERSIZE;
  if (contains(current, view) && !tooBig) return current;
  return wanted;
}

export function isInArea(area: Area, lat: number, lng: number): boolean {
  return lat >= area.south && lat <= area.north && lng >= area.west && lng <= area.east;
}
