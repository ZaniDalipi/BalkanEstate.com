/**
 * Shared helpers for the editor's SVG layers.
 *
 * The overlay uses `viewBox="0 0 {aspect} 1"` (aspect = image width / height):
 * a normalised point [x, y] is drawn at (x·aspect, y). One screen pixel equals
 * `aspect / renderedWidth` SVG units, which is how handles and labels keep a
 * constant on-screen size at every zoom level.
 */
import type { Hotspot, UnitAvailability } from '../../../types';
import { AVAILABILITY_META, NEUTRAL_FILL, NEUTRAL_FILL_STRONG } from '../../../utils/availability';
import type { Point } from '../../../utils/polygonGeometry';

export const PRIMARY = '#0252CD';
export const ISSUE_STROKE = '#dc2626';
export const ISSUE_FILL = 'rgba(220,38,38,0.16)';
/** On-screen radius (px) within which vertices snap / a polygon closes. */
export const SNAP_PX = 10;

export const toSvgPoints = (pts: number[][], aspect: number): string =>
  pts.map(([x, y]) => `${x * aspect},${y}`).join(' ');

export interface RegionPaint {
  fill: string;
  fillStrong: string;
}

/**
 * Fill for a region: availability colour when it links a unit (from
 * utils/availability only), neutral for building/floor/listing links, and a
 * warning tint while it is still unlinked.
 */
export const regionPaint = (h: Hotspot, availabilityOf: (unitId: string) => UnitAvailability | undefined): RegionPaint => {
  if (!h.linkId) return { fill: ISSUE_FILL, fillStrong: ISSUE_FILL };
  if (h.linkType === 'unit') {
    const state = availabilityOf(h.linkId);
    if (state) return { fill: AVAILABILITY_META[state].fill, fillStrong: AVAILABILITY_META[state].fillStrong };
  }
  return { fill: NEUTRAL_FILL, fillStrong: NEUTRAL_FILL_STRONG };
};

/** Midpoint of each edge of a closed outline (edge i runs from vertex i to i+1). */
export const edgeMidpoints = (outline: Point[]): Point[] =>
  outline.map((p, i) => {
    const q = outline[(i + 1) % outline.length];
    return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  });
