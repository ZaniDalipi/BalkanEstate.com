/** Pure maths behind the two-thumb range slider (no DOM, unit-testable). */

export type Thumb = 'low' | 'high';

const decimals = (n: number): number => {
  const s = String(n);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
};

/** Snaps `value` to the step grid starting at `min`, clamped to [min, max]. */
export function snapValue(value: number, min: number, max: number, step: number): number {
  const safeStep = step > 0 ? step : 1;
  const snapped = min + Math.round((value - min) / safeStep) * safeStep;
  const rounded = Number(snapped.toFixed(Math.max(decimals(safeStep), decimals(min))));
  return Math.min(max, Math.max(min, rounded));
}

/** The value under a pointer at `clientX` on a track spanning [left, left + width]. */
export function valueFromPosition(
  clientX: number,
  left: number,
  width: number,
  min: number,
  max: number,
  step: number,
): number {
  const ratio = width > 0 ? Math.min(1, Math.max(0, (clientX - left) / width)) : 0;
  return snapValue(min + ratio * (max - min), min, max, step);
}

/**
 * Which thumb a press at `value` should move: the nearer one. When both thumbs
 * sit on the same spot, the press side decides (left → low, right → high), and
 * a stack resting on a bound moves the thumb that can still travel.
 */
export function pickThumb(value: number, low: number, high: number, min: number, max: number): Thumb {
  if (low === high) {
    if (high >= max) return 'low';
    if (low <= min) return 'high';
    return value < low ? 'low' : 'high';
  }
  return Math.abs(value - low) <= Math.abs(value - high) ? 'low' : 'high';
}

/** Applies a new value to one thumb, never letting it cross the other. */
export function moveThumb(thumb: Thumb, value: number, low: number, high: number): [number, number] {
  return thumb === 'low' ? [Math.min(value, high), high] : [low, Math.max(value, low)];
}

/** The value a slider key press leads to, or null for keys the slider ignores. */
export function valueForKey(key: string, value: number, min: number, max: number, step: number): number | null {
  const big = Math.max(step, step * Math.round((max - min) / step / 10));
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return snapValue(value - step, min, max, step);
    case 'ArrowRight':
    case 'ArrowUp':
      return snapValue(value + step, min, max, step);
    case 'PageDown':
      return snapValue(value - big, min, max, step);
    case 'PageUp':
      return snapValue(value + big, min, max, step);
    case 'Home':
      return min;
    case 'End':
      return max;
    default:
      return null;
  }
}
