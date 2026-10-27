/**
 * How a region looks on the public rendering.
 *
 * 'clean' (default, East Gate style): regions are invisible at rest so the
 * rendering reads as a photo; the hovered/focused region lights up with a
 * translucent fill and a thin light outline, and units matching active filters
 * get a soft tint. 'availability': every unit region shows its availability
 * colour (plus pattern) all the time.
 *
 * Unit regions use their availability colour (available = teal); buildings,
 * floors and listings use the brand highlight teal.
 */
import type { UnitAvailability } from '../../../types';
import { AVAILABILITY_META, rgba } from '../../../utils/availability';

export type RegionDisplayMode = 'clean' | 'availability';

export const HIGHLIGHT = '#0d9488';

export interface RegionPaintInput {
  mode: RegionDisplayMode;
  /** Effective availability for unit regions. */
  state?: UnitAvailability;
  active: boolean;
  /** Sold together with the hovered unit (its parking spot, or its apartment). */
  linked?: boolean;
  /** true/false when filters are active (unit regions only); undefined otherwise. */
  matched?: boolean;
}

export interface RegionPaint {
  fill: string;
  stroke: string;
  /** Stroke width as a multiple of the base width. */
  strokeScale: number;
  /** Draw the availability pattern on top (non-colour cue). */
  pattern: boolean;
  /** Dashed outline: lit up because it is sold with the hovered unit. */
  dashed?: boolean;
}

/** Transparent but still hit-testable (pointer events need a painted fill). */
const INVISIBLE = 'rgba(255,255,255,0.001)';

export const regionPaint = ({ mode, state, active, linked, matched }: RegionPaintInput): RegionPaint => {
  const color = state ? AVAILABILITY_META[state].color : HIGHLIGHT;
  const patterned = !!state && AVAILABILITY_META[state].pattern !== 'solid';

  // Lit up with the hovered unit, whatever the filters say: it comes with it.
  if (linked && !active) {
    return { fill: rgba(color, 0.42), stroke: 'rgba(255,255,255,0.95)', strokeScale: 1.6, pattern: patterned, dashed: true };
  }

  if (matched === false) {
    // Filtered out: barely there, but hover still reveals it.
    return active
      ? { fill: rgba(color, 0.3), stroke: 'rgba(255,255,255,0.7)', strokeScale: 1, pattern: patterned }
      : { fill: INVISIBLE, stroke: 'transparent', strokeScale: 1, pattern: false };
  }
  if (active) {
    return { fill: rgba(color, 0.5), stroke: 'rgba(255,255,255,0.92)', strokeScale: 1.4, pattern: patterned };
  }
  if (mode === 'availability' && state) {
    return { fill: rgba(color, 0.3), stroke: rgba(color, 0.85), strokeScale: 1, pattern: patterned };
  }
  if (matched === true) {
    return { fill: rgba(color, 0.26), stroke: rgba(color, 0.9), strokeScale: 1, pattern: false };
  }
  return { fill: INVISIBLE, stroke: 'transparent', strokeScale: 1, pattern: false };
};
