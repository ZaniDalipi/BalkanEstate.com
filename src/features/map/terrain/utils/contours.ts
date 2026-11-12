/**
 * Contour lines: every how many metres of height a line is drawn. Picked so
 * an area shows a handful of lines, on round numbers.
 */

const STEPS_M = [1, 2, 5, 10, 20, 25, 50, 100] as const;
/** About this many lines across the area at most. */
const MAX_LINES = 12;
/** With less relief than this there is nothing for lines to show. */
const MIN_RELIEF_M = 1;

/** Metres between contour lines for a height range, or null when the ground is too level for any. */
export function contourInterval(minElevation: number, maxElevation: number): number | null {
  const relief = maxElevation - minElevation;
  if (!(relief >= MIN_RELIEF_M)) return null;
  return STEPS_M.find((step) => relief / step <= MAX_LINES) ?? STEPS_M[STEPS_M.length - 1];
}

/** Every this-many-th line is drawn stronger (an "index" contour), as on printed maps. */
export const INDEX_EVERY = 5;
