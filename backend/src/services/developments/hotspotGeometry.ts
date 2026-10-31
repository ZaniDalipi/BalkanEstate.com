/**
 * Server-side hotspot geometry validation for the interactive building
 * explorer. The last word on what polygon gets stored.
 *
 * A mirror of `src/features/developments/utils/polygonGeometry.ts` on the
 * client — the backend compiles from its own rootDir and cannot import it.
 * Both copies run the cases in
 * `src/features/developments/utils/__fixtures__/polygon-cases.json`, so a rule
 * changed on one side and not the other fails a test instead of letting the
 * editor save shapes the server rejects (or worse, accept shapes the client
 * refuses to draw).
 *
 * Coordinates are normalised [x, y] in 0–1 relative to the scene image.
 */

export type Point = [number, number];
export type HotspotShapeKind = 'polygon' | 'rect';

export const MIN_POLYGON_POINTS = 3;
export const MAX_POLYGON_POINTS = 200;
export const MIN_POLYGON_AREA = 0.00002;
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

const asPoint = (p: unknown): Point | null =>
  Array.isArray(p) && p.length === 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1])
    ? [p[0], p[1]]
    : null;

const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

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

export const polygonArea = (pts: Point[]): number => {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};

const orientation = (a: Point, b: Point, c: Point): number => {
  const v = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(v) < EPS) return 0;
  return v > 0 ? 1 : -1;
};

const onSegment = (p: Point, q: Point, r: Point): boolean =>
  q[0] <= Math.max(p[0], r[0]) + EPS &&
  q[0] + EPS >= Math.min(p[0], r[0]) &&
  q[1] <= Math.max(p[1], r[1]) + EPS &&
  q[1] + EPS >= Math.min(p[1], r[1]);

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

export const isSelfIntersecting = (pts: Point[]): boolean => {
  const n = pts.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (segmentsIntersect(a1, a2, pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
};

const hasDuplicateVertices = (pts: Point[], eps = DUPLICATE_EPSILON): boolean => {
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      if (distance(pts[i], pts[j]) <= eps) return true;
    }
  }
  return false;
};

/**
 * Validate a hotspot's geometry; the first failure wins. Self-intersection is
 * checked before area because a crossed polygon's shoelace area is meaningless.
 */
export const validateHotspotGeometry = (shape: HotspotShapeKind, raw: unknown): GeometryValidation => {
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
