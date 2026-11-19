import { describe, expect, it } from 'vitest';
import { contourLines, joinSegments } from './contourLines';
import { makeGrid, wholeGrid } from './testGrid';

describe('contourLines', () => {
  // Rising 1 m per 10 m cell to the east: lines run north–south.
  const grid = makeGrid(6, 10, (_r, c) => 400 + c);

  it('draws one unbroken line per level, every interval', () => {
    const lines = contourLines(grid, wholeGrid(grid), 1, 5);
    // 400 m is the lowest edge of the grid: no line there.
    expect(lines.map((l) => l.elevation)).toEqual([401, 402, 403, 404, 405, 406, 407, 408, 409]);
    lines.forEach((l) => {
      expect(l.points.length).toBe(6);
      // Straight north–south: one longitude all along.
      l.points.forEach((p) => expect(p.lng).toBeCloseTo(l.points[0].lng, 9));
    });
    expect(lines.find((l) => l.elevation === 405)?.index).toBe(true);
    expect(lines.find((l) => l.elevation === 404)?.index).toBe(false);
  });

  it('keeps to the drawn outline', () => {
    const westHalf = [
      { lat: grid.north, lng: grid.west },
      { lat: grid.north, lng: (grid.west + grid.east) / 2 },
      { lat: grid.south, lng: (grid.west + grid.east) / 2 },
      { lat: grid.south, lng: grid.west },
    ];
    const levels = contourLines(grid, westHalf, 1, 5).map((l) => l.elevation);
    expect(Math.max(...levels)).toBeLessThanOrEqual(404);
  });

  it('draws nothing on level ground', () => {
    expect(contourLines(makeGrid(4, 4, () => 300), wholeGrid(grid), 1, 5)).toEqual([]);
  });
});

describe('joinSegments', () => {
  it('joins pieces given in any order and either way round', () => {
    const p = (n: number) => ({ lat: n, lng: n });
    const lines = joinSegments([[p(2), p(3)], [p(1), p(0)], [p(1), p(2)]]);
    expect(lines).toHaveLength(1);
    expect(lines[0].map((q) => q.lat).sort()).toEqual([0, 1, 2, 3]);
  });
});
