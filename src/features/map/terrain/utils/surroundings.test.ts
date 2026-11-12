import { describe, expect, it } from 'vitest';
import { boxSizeM, surroundingsBounds } from './surroundings';
import { makeGrid } from './testGrid';

const sizeOf = (b: ReturnType<typeof surroundingsBounds>) => boxSizeM({ ...b, rows: 1, cols: 1 });

describe('surroundingsBounds', () => {
  it('reaches four plot widths round a mid-sized plot, centred on it', () => {
    const plot = makeGrid(50, 50, () => 400); // 500 m
    const b = surroundingsBounds(plot);
    expect(sizeOf(b).widthM).toBeCloseTo(2000, -1);
    expect(sizeOf(b).depthM).toBeCloseTo(2000, -1);
    expect((b.north + b.south) / 2).toBeCloseTo((plot.north + plot.south) / 2, 4);
    expect((b.east + b.west) / 2).toBeCloseTo((plot.east + plot.west) / 2, 4);
  });

  it('shows at least the neighbourhood of a small plot', () => {
    expect(sizeOf(surroundingsBounds(makeGrid(5, 5, () => 400))).widthM).toBeCloseTo(1200, -1);
  });

  it('stays inside the elevation service limit, with a margin even round a large plot', () => {
    expect(sizeOf(surroundingsBounds(makeGrid(30, 30, () => 400, 100))).widthM).toBeCloseTo(7000, -1); // 3 km plot
    const huge = sizeOf(surroundingsBounds(makeGrid(65, 65, () => 400, 100))).widthM; // 6.5 km plot
    expect(huge).toBeGreaterThan(6500);
    expect(huge).toBeLessThan(8000);
  });
});
