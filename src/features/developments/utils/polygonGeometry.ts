/**
 * Polygon geometry for the interactive building explorer and its editor.
 *
 * Every coordinate here is normalised: [x, y] with both in 0–1, relative to
 * the scene image's own width and height. Normalising against the image (not
 * the rendered box) is what keeps a hotspot glued to the same window of the
 * facade at any screen size, zoom level or orientation.
 *
 * Mirrored on the server in backend/src/services/developments/hotspotGeometry.ts
 * — the backend compiles from its own rootDir and cannot import this file. Both
 * copies run the same cases from __fixtures__/polygon-cases.json, so they can
 * only drift by failing a test.
 */

export type Point = [number, number];
export type HotspotShape = 'polygon' | 'rect';

export const MIN_POLYGON_POINTS = 3;
export const MAX_POLYGON_POINTS = 200;
/** Smallest area a hotspot may enclose, as a fraction of the whole image. */
export const MIN_POLYGON_AREA = 0.00002;
/** Two vertices closer than this (in normalised units) count as the same point. */
export const DUPLICATE_EPSILON = 0.0005;

export type HotspotGeometryError =
  | 'non_finite'
  | 'out_of_bounds'
  | 'invalid_rect'
  | 'too_few_points'
  | 'too_many_points'
  | 'duplicate_points'
  | 'zero_area'
  | 'self_intersecting';

export interface GeometryValidation {
  isValid: boolean;
  error?: HotspotGeometryError;
}

const EPS = 1e-12;

const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** A point as a well-formed numeric pair, or null. */
const asPoint = (p: unknown): Point | null =>
  Array.isArray(p) && p.length === 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1])
    ? [p[0], p[1]]
    : null;

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export const clampPoint = ([x, y]: Point): Point => [clamp01(x), clamp01(y)];

export const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** A rect's two stored opposite corners expanded to its four polygon corners. */
export const rectToPolygon = (points: Point[]): Point[] => {
  if (points.length < 2) return points;
  const [[x0, y0], [x1, y1]] = points;
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ];
};

/** The polygon outline of a hotspot of either shape. */
export const toPolygon = (shape: HotspotShape, points: Point[]): Point[] =>
  shape === 'rect' ? rectToPolygon(points) : points;

/** Absolute enclosed area (shoelace formula). */
export const polygonArea = (pts: Point[]): number => {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};

/** Area-weighted centroid; falls back to the vertex average for degenerate shapes. */
export const polygonCentroid = (pts: Point[]): Point => {
  if (pts.length === 0) return [0.5, 0.5];
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < EPS) {
    const sx = pts.reduce((s, p) => s + p[0], 0);
    const sy = pts.reduce((s, p) => s + p[1], 0);
    return [sx / pts.length, sy / pts.length];
  }
  return [cx / (3 * a), cy / (3 * a)];
};

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const polygonBounds = (pts: Point[]): Bounds => ({
  minX: Math.min(...pts.map((p) => p[0])),
  minY: Math.min(...pts.map((p) => p[1])),
  maxX: Math.max(...pts.map((p) => p[0])),
  maxY: Math.max(...pts.map((p) => p[1])),
});

/** Ray-casting point-in-polygon test (edges count as outside-or-inside arbitrarily). */
export const pointInPolygon = ([px, py]: Point, pts: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + EPS) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
};

/** Sign of the turn a→b→c: >0 counter-clockwise, <0 clockwise, 0 collinear. */
const orientation = (a: Point, b: Point, c: Point): number => {
  const v = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(v) < EPS) return 0;
  return v > 0 ? 1 : -1;
};

/** Whether q lies on segment p–r, given p, q, r are collinear. */
const onSegment = (p: Point, q: Point, r: Point): boolean =>
  q[0] <= Math.max(p[0], r[0]) + EPS &&
  q[0] + EPS >= Math.min(p[0], r[0]) &&
  q[1] <= Math.max(p[1], r[1]) + EPS &&
  q[1] + EPS >= Math.min(p[1], r[1]);

/** Whether segments p1–q1 and p2–q2 intersect, including touching and collinear overlap. */
export const segmentsIntersect = (p1: Point, q1: Point, p2: Point, q2: Point): boolean => {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
};

/**
 * Whether any two non-adjacent edges of the closed polygon touch or cross.
 * O(n²), which is fine at MAX_POLYGON_POINTS.
 */
export const isSelfIntersecting = (pts: Point[]): boolean => {
  const n = pts.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      // Skip the edge itself and the two edges that share a vertex with it.
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsIntersect(a1, a2, pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
};

/**
 * Drop consecutive near-duplicate vertices, including a closing vertex that
 * repeats the first (a double-click to close often lands a second point on the
 * last one, or back on the start).
 */
export const dedupeConsecutive = (pts: Point[], eps = DUPLICATE_EPSILON): Point[] => {
  const out: Point[] = [];
  for (const p of pts) {
    if (out.length === 0 || distance(out[out.length - 1], p) > eps) out.push(p);
  }
  while (out.length > 1 && distance(out[0], out[out.length - 1]) <= eps) out.pop();
  return out;
};

/** Whether any two vertices (not only consecutive ones) coincide. */
const hasDuplicateVertices = (pts: Point[], eps = DUPLICATE_EPSILON): boolean => {
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      if (distance(pts[i], pts[j]) <= eps) return true;
    }
  }
  return false;
};

/** Snap to the nearest candidate vertex within `radius`, else return p unchanged. */
export const snapToVertex = (p: Point, candidates: Point[], radius: number): Point => {
  let best: Point | null = null;
  let bestD = radius;
  for (const c of candidates) {
    const d = distance(p, c);
    if (d <= bestD) {
      best = c;
      bestD = d;
    }
  }
  return best ? [best[0], best[1]] : p;
};

/** Snap to a regular grid of `step` (e.g. 0.005), clamped into the image. */
export const snapToGrid = ([x, y]: Point, step: number): Point =>
  step > 0 ? clampPoint([Math.round(x / step) * step, Math.round(y / step) * step]) : [x, y];

/** Translate every vertex by (dx, dy), keeping the whole shape inside the image. */
export const translatePolygon = (pts: Point[], dx: number, dy: number): Point[] => {
  if (pts.length === 0) return pts;
  const b = polygonBounds(pts);
  const cdx = Math.min(Math.max(dx, -b.minX), 1 - b.maxX);
  const cdy = Math.min(Math.max(dy, -b.minY), 1 - b.maxY);
  return pts.map(([x, y]) => [x + cdx, y + cdy]);
};

/**
 * Validate a hotspot's geometry and return the first failure, in the app's
 * `{ isValid, error? }` shape. Self-intersection is checked before area on
 * purpose: a crossed polygon's shoelace area is meaningless (a symmetric
 * bow-tie sums to exactly zero), so "too small" would misreport it.
 */
export const validateHotspotGeometry = (shape: HotspotShape, raw: unknown): GeometryValidation => {
  if (!Array.isArray(raw)) return { isValid: false, error: 'non_finite' };
  const pts: Point[] = [];
  for (const p of raw) {
    const pt = asPoint(p);
    if (!pt) return { isValid: false, error: 'non_finite' };
    pts.push(pt);
  }
  if (pts.some(([x, y]) => x < 0 || x > 1 || y < 0 || y > 1)) {
    return { isValid: false, error: 'out_of_bounds' };
  }

  if (shape === 'rect') {
    if (pts.length !== 2) return { isValid: false, error: 'invalid_rect' };
    if (polygonArea(rectToPolygon(pts)) < MIN_POLYGON_AREA) return { isValid: false, error: 'zero_area' };
    return { isValid: true };
  }

  if (pts.length < MIN_POLYGON_POINTS) return { isValid: false, error: 'too_few_points' };
  if (pts.length > MAX_POLYGON_POINTS) return { isValid: false, error: 'too_many_points' };
  if (hasDuplicateVertices(pts)) return { isValid: false, error: 'duplicate_points' };
  if (isSelfIntersecting(pts)) return { isValid: false, error: 'self_intersecting' };
  if (polygonArea(pts) < MIN_POLYGON_AREA) return { isValid: false, error: 'zero_area' };
  return { isValid: true };
};
