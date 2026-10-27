import { describe, it, expect } from 'vitest';
import fixture from './__fixtures__/polygon-cases.json';
import {
  validateHotspotGeometry,
  polygonArea,
  polygonCentroid,
  pointInPolygon,
  isSelfIntersecting,
  dedupeConsecutive,
  snapToVertex,
  snapToGrid,
  translatePolygon,
  rectToPolygon,
  type HotspotShape,
  type Point,
} from './polygonGeometry';

interface Case {
  name: string;
  shape: HotspotShape;
  points?: unknown;
  generate?: { kind: 'regular'; n: number };
  expected: { isValid: boolean; error?: string };
}

/** An n-gon inscribed in a circle of radius 0.4 around the image centre. */
const regular = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a)];
  });

describe('validateHotspotGeometry — shared client/server cases', () => {
  it.each((fixture.cases as Case[]).map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const points = c.generate ? regular(c.generate.n) : c.points;
    expect(validateHotspotGeometry(c.shape, points)).toEqual(c.expected);
  });
});

describe('polygon helpers', () => {
  const square: Point[] = [
    [0.1, 0.1],
    [0.3, 0.1],
    [0.3, 0.3],
    [0.1, 0.3],
  ];

  it('computes area independent of winding', () => {
    expect(polygonArea(square)).toBeCloseTo(0.04);
    expect(polygonArea([...square].reverse())).toBeCloseTo(0.04);
  });

  it('finds the centroid of a square', () => {
    const [cx, cy] = polygonCentroid(square);
    expect(cx).toBeCloseTo(0.2);
    expect(cy).toBeCloseTo(0.2);
  });

  it('falls back to the vertex average for a degenerate shape', () => {
    expect(polygonCentroid([[0.1, 0.1], [0.3, 0.3]])).toEqual([0.2, 0.2]);
  });

  it('tests point containment', () => {
    expect(pointInPolygon([0.2, 0.2], square)).toBe(true);
    expect(pointInPolygon([0.5, 0.5], square)).toBe(false);
  });

  it('detects a crossing but not a simple polygon', () => {
    expect(isSelfIntersecting(square)).toBe(false);
    expect(isSelfIntersecting([[0.1, 0.1], [0.4, 0.4], [0.4, 0.1], [0.1, 0.4]])).toBe(true);
  });

  it('drops consecutive and closing duplicates from a double-click close', () => {
    const closed: Point[] = [[0.1, 0.1], [0.3, 0.1], [0.3, 0.3], [0.3, 0.3], [0.1, 0.1]];
    expect(dedupeConsecutive(closed)).toEqual([[0.1, 0.1], [0.3, 0.1], [0.3, 0.3]]);
  });

  it('snaps to a nearby vertex only within the radius', () => {
    expect(snapToVertex([0.302, 0.299], square, 0.01)).toEqual([0.3, 0.3]);
    expect(snapToVertex([0.35, 0.35], square, 0.01)).toEqual([0.35, 0.35]);
  });

  it('snaps to a grid and clamps into the image', () => {
    expect(snapToGrid([0.123, 0.987], 0.05)).toEqual([0.1, 1]);
    expect(snapToGrid([0.123, 0.4], 0)).toEqual([0.123, 0.4]);
  });

  it('moves a polygon but never past the image edge', () => {
    const moved = translatePolygon(square, 0.8, -0.5);
    expect(Math.max(...moved.map((p) => p[0]))).toBeCloseTo(1);
    expect(Math.min(...moved.map((p) => p[1]))).toBeCloseTo(0);
    expect(polygonArea(moved)).toBeCloseTo(polygonArea(square));
  });

  it('expands a rect from either pair of opposite corners', () => {
    expect(rectToPolygon([[0.3, 0.4], [0.1, 0.2]])).toEqual([
      [0.1, 0.2],
      [0.3, 0.2],
      [0.3, 0.4],
      [0.1, 0.4],
    ]);
  });
});
