/**
 * District tessellation — approximate neighbourhood areas from centre points.
 *
 * When OpenStreetMap has no polygon for a neighbourhood (many are mapped as a
 * single `place` node), we still want the map to read like a district map
 * rather than a pile of overlapping bubbles. This builds a Voronoi partition of
 * the city: every point on the map belongs to the neighbourhood whose centre is
 * nearest, which is the same rule a reader applies by eye.
 *
 * The result is explicitly approximate and the map labels it as such — it is a
 * *partition of space*, not a claim about administrative borders.
 *
 * Implementation: each cell starts as the clip rectangle and is cut by the
 * perpendicular bisector against every other site (half-plane clipping,
 * Sutherland–Hodgman). Pure, deterministic, dependency-free, O(n²) over a
 * handful of neighbourhoods.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TessellationSite<T> {
  center: LatLng;
  payload: T;
}

export interface DistrictCell<T> {
  payload: T;
  /** Closed ring in GeoJSON order: [lng, lat], first point repeated last. */
  ring: Array<[number, number]>;
}

export interface TessellationOptions {
  /** Extra margin around the sites' bounding box, as a fraction of its size. */
  paddingRatio?: number;
  /** Minimum span (degrees) of the clip box, so a single site still gets area. */
  minSpanDeg?: number;
}

interface Point {
  x: number;
  y: number;
}

const DEFAULTS: Required<TessellationOptions> = {
  paddingRatio: 0.35,
  minSpanDeg: 0.04,
};

/**
 * Longitude degrees shrink towards the poles; scaling x by cos(lat) keeps the
 * bisectors perpendicular on screen instead of skewed east–west.
 */
function lngScale(latDeg: number): number {
  return Math.max(0.05, Math.cos((latDeg * Math.PI) / 180));
}

/** Sutherland–Hodgman: keep the half-plane where dot(p - via, normal) <= 0. */
function clipHalfPlane(polygon: Point[], via: Point, normal: Point): Point[] {
  if (polygon.length === 0) return polygon;

  const side = (p: Point) => (p.x - via.x) * normal.x + (p.y - via.y) * normal.y;
  const out: Point[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const dCurrent = side(current);
    const dNext = side(next);

    const currentInside = dCurrent <= 0;
    const nextInside = dNext <= 0;

    if (currentInside) out.push(current);

    if (currentInside !== nextInside) {
      const denominator = dCurrent - dNext;
      // Parallel/degenerate: no meaningful intersection to add.
      if (Math.abs(denominator) > Number.EPSILON) {
        const t = dCurrent / denominator;
        out.push({
          x: current.x + (next.x - current.x) * t,
          y: current.y + (next.y - current.y) * t,
        });
      }
    }
  }

  return out;
}

export interface ClipBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Padded bounding box of the sites — the outer edge of the tessellation. */
export function clipBoxForSites(
  sites: readonly LatLng[],
  options: TessellationOptions = {},
): ClipBox | null {
  const usable = sites.filter(isUsableLatLng);
  if (usable.length === 0) return null;

  const { paddingRatio, minSpanDeg } = { ...DEFAULTS, ...options };

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const s of usable) {
    minLat = Math.min(minLat, s.lat);
    maxLat = Math.max(maxLat, s.lat);
    minLng = Math.min(minLng, s.lng);
    maxLng = Math.max(maxLng, s.lng);
  }

  // A single site (or a tight cluster) has no span of its own to pad.
  const latSpan = Math.max(maxLat - minLat, minSpanDeg);
  const lngSpan = Math.max(maxLng - minLng, minSpanDeg);
  const latPad = latSpan * paddingRatio;
  const lngPad = lngSpan * paddingRatio;
  const latCentre = (minLat + maxLat) / 2;
  const lngCentre = (minLng + maxLng) / 2;

  return {
    minLat: Math.max(-90, latCentre - latSpan / 2 - latPad),
    maxLat: Math.min(90, latCentre + latSpan / 2 + latPad),
    minLng: Math.max(-180, lngCentre - lngSpan / 2 - lngPad),
    maxLng: Math.min(180, lngCentre + lngSpan / 2 + lngPad),
  };
}

function isUsableLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== 'object') return false;
  const { lat, lng } = value as LatLng;
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Partition the city into one area per site.
 *
 * Sites with unusable coordinates are dropped rather than placed at (0,0), and
 * duplicate centres yield no cell for the later duplicate instead of a sliver.
 */
export function tessellateDistricts<T>(
  sites: readonly TessellationSite<T>[],
  options: TessellationOptions = {},
): Array<DistrictCell<T>> {
  const usable = sites.filter(s => isUsableLatLng(s?.center));
  if (usable.length === 0) return [];

  const box = clipBoxForSites(usable.map(s => s.center), options);
  if (!box) return [];

  const scale = lngScale((box.minLat + box.maxLat) / 2);
  const toPlane = (p: LatLng): Point => ({ x: p.lng * scale, y: p.lat });
  const toLatLng = (p: Point): [number, number] => [p.x / scale, p.y];

  const rectangle: Point[] = [
    { x: box.minLng * scale, y: box.minLat },
    { x: box.maxLng * scale, y: box.minLat },
    { x: box.maxLng * scale, y: box.maxLat },
    { x: box.minLng * scale, y: box.maxLat },
  ];

  const planarSites = usable.map(s => toPlane(s.center));
  const cells: Array<DistrictCell<T>> = [];

  for (let i = 0; i < planarSites.length; i++) {
    let cell = rectangle;
    const a = planarSites[i];

    for (let j = 0; j < planarSites.length && cell.length > 0; j++) {
      if (i === j) continue;
      const b = planarSites[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      // Coincident centres: no bisector exists. Give the area to the first of
      // them (lower index) and leave the duplicate empty.
      if (dx === 0 && dy === 0) {
        if (j < i) { cell = []; break; }
        continue;
      }
      cell = clipHalfPlane(cell, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, { x: dx, y: dy });
    }

    if (cell.length < 3) continue;

    const ring = cell.map(toLatLng);
    ring.push(ring[0]); // GeoJSON rings must close
    cells.push({ payload: usable[i].payload, ring });
  }

  return cells;
}

/** Does this ring contain the point? (ray casting; ring is [lng, lat] pairs) */
export function ringContains(ring: ReadonlyArray<[number, number]>, point: LatLng): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > point.lat) !== (yj > point.lat)
      && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
