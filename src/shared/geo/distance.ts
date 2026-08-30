/**
 * Great-circle distance helpers.
 *
 * Domain layer — pure functions, no React, no I/O. Everything that needs to
 * know "how far is this pin from that town" imports from here rather than
 * re-deriving the haversine formula locally.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Distance in kilometres between two WGS84 coordinates.
 * Returns `Infinity` when either coordinate is missing or not finite, so
 * callers fail closed rather than silently treating a bad pin as "0 km away".
 */
export const haversineDistanceKm = (from: Coordinates, to: Coordinates): number => {
  if (
    !Number.isFinite(from?.lat) || !Number.isFinite(from?.lng) ||
    !Number.isFinite(to?.lat) || !Number.isFinite(to?.lng)
  ) {
    return Infinity;
  }

  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** One decimal place, the precision the "too far" message shows. */
export const formatDistanceKm = (km: number): string =>
  Number.isFinite(km) ? km.toFixed(1) : '—';

/**
 * Degrees of latitude/longitude covered by `radiusKm` at a given latitude.
 * Used to turn a radius into a Nominatim `viewbox` for proximity-biased search.
 */
export const radiusToDegrees = (
  radiusKm: number,
  atLatitude: number
): { latDelta: number; lngDelta: number } => {
  const latDelta = radiusKm / 111.32;
  // Longitude degrees shrink towards the poles; clamp the cosine so a pin near
  // a pole can't blow the box up to the whole hemisphere.
  const cosLat = Math.max(Math.cos(toRadians(atLatitude)), 0.01);
  return { latDelta, lngDelta: radiusKm / (111.32 * cosLat) };
};
