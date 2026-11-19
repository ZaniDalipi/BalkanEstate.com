import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { pointsBetween, slopeFall } from './slopeFall';
import { makeGrid, wholeGrid } from './testGrid';

const analyse = (grid: ReturnType<typeof makeGrid>) => {
  const result = analyzeTerrain(grid, wholeGrid(grid));
  if (result.ok === false) throw new Error(result.error);
  return result.value;
};

describe('slopeFall', () => {
  it('finds the highest and lowest ground and the average grade between them', () => {
    // 10 m cells, rising 2 m per cell to the east: 20%.
    const fall = slopeFall(analyse(makeGrid(6, 6, (_r, c) => 500 + c * 2)));
    expect(fall).not.toBeNull();
    if (!fall) return;
    expect(fall.high.elevation).toBe(510);
    expect(fall.low.elevation).toBe(500);
    expect(fall.dropM).toBe(10);
    expect(fall.high.lng).toBeGreaterThan(fall.low.lng);
    // The highest and lowest cells found first lie on the same row, 5 cells (50 m) apart.
    expect(fall.runM).toBeCloseTo(50, 0);
    expect(fall.gradePct).toBeCloseTo(20, 0);
  });

  it('says level ground falls nothing', () => {
    const fall = slopeFall(analyse(makeGrid(4, 4, () => 300)));
    expect(fall?.dropM).toBe(0);
    expect(fall?.gradePct).toBe(0);
  });
});

describe('pointsBetween', () => {
  it('spaces points evenly from one end to the other', () => {
    const pts = pointsBetween({ lat: 0, lng: 0 }, { lat: 4, lng: 8 }, 4);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ lat: 0, lng: 0 });
    expect(pts[2]).toEqual({ lat: 2, lng: 4 });
    expect(pts[4]).toEqual({ lat: 4, lng: 8 });
  });
});
