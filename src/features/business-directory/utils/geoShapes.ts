/**
 * Small geometry helpers for drawing the business on the map: is the pin
 * inside a building footprint, which footprint is "theirs", and a circle
 * polygon for an approximate area. Coordinates are GeoJSON order: [lng, lat].
 */

export type Position = [number, number];
export type Ring = Position[];
export type PolygonCoords = Ring[];

export interface GeoGeometry {
  type: string;
  coordinates?: unknown;
}

/** Ray casting: is the point inside the ring? */
export function pointInRing([x, y]: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and not in a hole (a courtyard). */
export const pointInPolygon = (p: Position, polygon: PolygonCoords): boolean =>
  polygon.length > 0 && pointInRing(p, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(p, hole));

/** The polygons of a Polygon or MultiPolygon geometry (nothing for anything else). */
export function polygonsOf(geometry: GeoGeometry): PolygonCoords[] {
  if (geometry.type === 'Polygon') return [geometry.coordinates as PolygonCoords];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as PolygonCoords[];
  return [];
}

/** Shoelace area of a ring, in squared degrees — only used to compare sizes. */
export const ringArea = (ring: Ring): number =>
  Math.abs(ring.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    return sum + (x1 * y2 - x2 * y1);
  }, 0)) / 2;

/**
 * The building the business is in: the smallest footprint that contains the
 * pin (a shop inside a block is the shop, not the block). Null when the pin
 * sits in no building — then the map shows an area instead.
 */
export function pickFootprint(geometries: GeoGeometry[], point: Position): PolygonCoords | null {
  let best: PolygonCoords | null = null;
  let bestArea = Infinity;
  for (const g of geometries) {
    for (const polygon of polygonsOf(g)) {
      if (!pointInPolygon(point, polygon)) continue;
      const area = ringArea(polygon[0]);
      if (area < bestArea) {
        best = polygon;
        bestArea = area;
      }
    }
  }
  return best;
}

/** A circle of `radiusMeters` around the centre, as a closed polygon ring. */
export function circleRing([lng, lat]: Position, radiusMeters: number, steps = 64): Ring {
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const ring: Ring = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  ring.push(ring[0]);
  return ring;
}

/**
 * Grow a footprint by about `meters` all round (scaled from its centre), so
 * a highlight drawn over the map's own grey building shows in front of it.
 */
export function inflatePolygon(polygon: PolygonCoords, meters: number): PolygonCoords {
  const outer = polygon[0];
  if (!outer?.length) return polygon;
  const n = outer.length - 1 || 1;
  const cx = outer.slice(0, n).reduce((s, p) => s + p[0], 0) / n;
  const cy = outer.slice(0, n).reduce((s, p) => s + p[1], 0) / n;
  const mPerLng = 111_320 * Math.max(Math.cos((cy * Math.PI) / 180), 0.01);
  const avgRadius = outer.slice(0, n).reduce((s, [x, y]) => s + Math.hypot((x - cx) * mPerLng, (y - cy) * 111_320), 0) / n;
  const f = avgRadius > 0 ? 1 + meters / avgRadius : 1;
  return polygon.map((ring) => ring.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f] as Position));
}
