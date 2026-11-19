import { describe, expect, it } from 'vitest';
import { pointInPolygon } from '@/src/features/developments/utils/polygonGeometry';
import { depthColor, fallCurtain } from './fallCurtain';
import { heightSampler } from './heightSampler';
import { makeGrid, wholeGrid } from './testGrid';

// 60 m square, falling 1 m per 10 m cell to the east.
const grid = makeGrid(6, 6, (_r, c) => 410 - c);
const polygon = wholeGrid(grid);

describe('fallCurtain', () => {
  const pieces = fallCurtain(polygon, 410, heightSampler(grid));

  it('stands short walls all round the outline', () => {
    expect(pieces.length).toBeGreaterThan(40);
    pieces.forEach((p) => expect(p.path).toHaveLength(4));
  });

  it('has the deepest gap where the land is lowest, and colours it darkest', () => {
    const deepest = pieces.reduce((a, b) => (b.depthM > a.depthM ? b : a));
    const shallowest = pieces.reduce((a, b) => (b.depthM < a.depthM ? b : a));
    expect(deepest.path[0].lng).toBeGreaterThan(shallowest.path[0].lng);
    expect(deepest.color).toBe(depthColor(1, 1));
    expect(shallowest.color).not.toBe(deepest.color);
  });

  it('turns its strips into the plot, whichever way the outline runs', () => {
    const ring: [number, number][] = polygon.map((p) => [p.lng, p.lat]);
    for (const outline of [polygon, [...polygon].reverse()]) {
      const strip = fallCurtain(outline, 410, heightSampler(grid))[3].path;
      const inner = { lat: (strip[2].lat + strip[3].lat) / 2, lng: (strip[2].lng + strip[3].lng) / 2 };
      expect(pointInPolygon([inner.lng, inner.lat], ring)).toBe(true);
    }
  });
});

describe('depthColor', () => {
  it('goes from pale to deep blue', () => {
    expect(depthColor(0, 5)).toBe('rgba(186, 230, 253, 1)');
    expect(depthColor(5, 5, 0.5)).toBe('rgba(30, 58, 138, 0.5)');
  });
});
