import { describe, expect, it } from 'vitest';
import { centreOf, flightPath } from './flightPath';

const size = { width: 1000, height: 600 };
const home = { scale: 1, x: 0, y: 0 };
const target = { scale: 2.5, x: -1100, y: -500 };

describe('flightPath', () => {
  const path = flightPath(home, target, size, { samples: 20 });

  it('starts where the camera is and ends on the apartment', () => {
    expect(path).toHaveLength(21);
    expect(path[0]).toEqual(home);
    expect(path[20].scale).toBeCloseTo(2.5);
    expect(path[20].x).toBeCloseTo(-1100);
    expect(path[20].y).toBeCloseTo(-500);
  });

  it('zooms at a steady pace (each step multiplies the zoom by the same factor)', () => {
    const ratios = path.slice(1).map((t, i) => t.scale / path[i].scale);
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 6);
  });

  it('climbs: half way, the view is above the straight line between start and end', () => {
    const a = centreOf(path[0], size);
    const b = centreOf(path[20], size);
    const mid = centreOf(path[10], size);
    expect(mid.y).toBeLessThan((a.y + b.y) / 2);
  });

  it('never shows past the edge of the picture', () => {
    for (const t of path) {
      expect(t.x).toBeLessThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(0);
      expect(t.x).toBeGreaterThanOrEqual(size.width - size.width * t.scale - 1e-6);
      expect(t.y).toBeGreaterThanOrEqual(size.height - size.height * t.scale - 1e-6);
    }
  });

  it('flies home along the same kind of path', () => {
    const back = flightPath(target, home, size, { samples: 8, lift: 0.02 });
    expect(back[0].scale).toBeCloseTo(2.5);
    expect(back[8]).toEqual(home);
  });
});
