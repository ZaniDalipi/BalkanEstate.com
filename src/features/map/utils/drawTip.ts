/** True when the main way of pointing is a finger, so the tip can say "touch" instead of "mouse". */
export const isTouchPrimary = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/** A drag shorter than this (in degrees of latitude and of longitude) is a tap, not an area. */
export const MIN_DRAW_SPAN = 0.0001;

/** Whether the corners of a drag enclose a real area; a tap or a hairline does not. */
export interface DrawRect { north: number; south: number; east: number; west: number }

export const isDrawnArea = (rect: DrawRect | null): rect is DrawRect =>
  !!rect &&
  [rect.north, rect.south, rect.east, rect.west].every(Number.isFinite) &&
  Math.abs(rect.north - rect.south) > MIN_DRAW_SPAN &&
  Math.abs(rect.east - rect.west) > MIN_DRAW_SPAN;
