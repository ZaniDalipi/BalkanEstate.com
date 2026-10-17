/**
 * Availability presentation — the single source of truth for how each unit
 * state looks everywhere in the developments feature (badges, legend,
 * availability bar, explorer polygons, inventory table).
 *
 * Colour is never the only signal: every state also has a distinct SVG fill
 * pattern for polygons, and badges/legends always pair the swatch with text.
 *
 * The state a buyer sees is the server-computed EFFECTIVE availability (the
 * most restrictive of the unit's declaration and its linked listings — see
 * backend/src/services/developments/unitAvailability.ts). `not_released` is
 * presented to buyers as "Coming soon".
 */
import type { UnitAvailability } from '../types';

export type AvailabilityPattern = 'solid' | 'stripes' | 'cross' | 'dots' | 'hatch' | 'lines';

export interface AvailabilityMeta {
  /** Swatch/dot/segment colour. */
  color: string;
  /** Polygon fill at rest. */
  fill: string;
  /** Polygon fill when hovered, focused or selected. */
  fillStrong: string;
  /** Non-colour cue drawn over the polygon fill. */
  pattern: AvailabilityPattern;
  /** Tailwind class for the badge dot. */
  dotClass: string;
}

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const meta = (color: string, pattern: AvailabilityPattern, dotClass: string): AvailabilityMeta => ({
  color,
  fill: rgba(color, 0.38),
  fillStrong: rgba(color, 0.62),
  pattern,
  dotClass,
});

export const AVAILABILITY_META: Record<UnitAvailability, AvailabilityMeta> = {
  available: meta('#14b8a6', 'solid', 'bg-teal-500'),
  reserved: meta('#f59e0b', 'stripes', 'bg-amber-500'),
  not_released: meta('#3b82f6', 'dots', 'bg-blue-500'),
  rented: meta('#8b5cf6', 'lines', 'bg-violet-500'),
  sold: meta('#ef4444', 'cross', 'bg-red-500'),
  unavailable: meta('#9ca3af', 'hatch', 'bg-gray-400'),
};

/** Legend / chip order: what a buyer can act on first. */
export const AVAILABILITY_ORDER: UnitAvailability[] = [
  'available',
  'reserved',
  'not_released',
  'rented',
  'sold',
  'unavailable',
];

/** Fill for a region that the active filters exclude. */
export const DIMMED_FILL = 'rgba(15,23,42,0.06)';
/** Fill for regions that link to something other than a unit (building, floor, listing). */
export const NEUTRAL_FILL = 'rgba(255,255,255,0.18)';
export const NEUTRAL_FILL_STRONG = 'rgba(255,255,255,0.36)';

/** DOM id of the SVG pattern for a state; rendered once per explorer. */
export const availabilityPatternId = (state: UnitAvailability): string => `be-av-${state}`;

/** Whether a buyer can still pursue this unit (buy, rent, or register interest). */
export const isPursuable = (state: UnitAvailability): boolean =>
  state === 'available' || state === 'not_released' || state === 'reserved';

/** Count units per state, in legend order, skipping states with none. */
export const countByAvailability = (
  units: ReadonlyArray<{ availability: UnitAvailability }>
): Array<{ state: UnitAvailability; count: number }> => {
  const counts = new Map<UnitAvailability, number>();
  for (const u of units) counts.set(u.availability, (counts.get(u.availability) ?? 0) + 1);
  return AVAILABILITY_ORDER.filter((s) => counts.has(s)).map((state) => ({ state, count: counts.get(state)! }));
};
