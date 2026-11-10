/**
 * True when a stored position can be put on a map: two finite numbers in
 * range, and not 0,0 (the "no location" placeholder of imported listings).
 */
export const hasUsableLocation = (lat: unknown, lng: unknown): boolean =>
  typeof lat === 'number' && typeof lng === 'number' &&
  Number.isFinite(lat) && Number.isFinite(lng) &&
  Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
  !(lat === 0 && lng === 0);
