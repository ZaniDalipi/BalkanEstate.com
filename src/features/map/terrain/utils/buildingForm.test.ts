import { describe, expect, it } from 'vitest';
import { boxCorners, buildingForm, orientedBox, polygonArea } from './buildingForm';

const rect = (w: number, h: number, turn = 0) => {
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  return [[0, 0], [w, 0], [w, h], [0, h]].map(([x, z]) => ({ x: x * c - z * s + 5, z: x * s + z * c - 3 }));
};

describe('orientedBox', () => {
  it('fits a turned rectangle exactly, long side first', () => {
    const b = orientedBox(rect(4, 10, 0.6));
    expect(b.halfL).toBeCloseTo(5, 9);
    expect(b.halfW).toBeCloseTo(2, 9);
    expect(polygonArea(boxCorners(b))).toBeCloseTo(40, 9);
  });
});

describe('buildingForm', () => {
  it('gives a house-sized rectangle a hipped roof, ridge at its height', () => {
    const f = buildingForm(rect(12, 9), 7, 1);
    expect(f.kind).toBe('hipped');
    if (f.kind !== 'hipped') return;
    expect(f.wallM + f.riseM).toBeCloseTo(7, 9);
    expect(f.wallM).toBeGreaterThanOrEqual(2.6);
    expect(f.riseM).toBeGreaterThan(1);
  });

  it('keeps walls a storey high on a low default-height building', () => {
    const f = buildingForm(rect(10, 8), 5, 1);
    expect(f.wallM).toBeGreaterThanOrEqual(2.6);
  });

  it('puts flat roofs on tall blocks, big halls and odd outlines', () => {
    expect(buildingForm(rect(20, 12), 24, 1).kind).toBe('flat');
    expect(buildingForm(rect(60, 40), 6, 1).kind).toBe('flat');
    const ell = [{ x: 0, z: 0 }, { x: 12, z: 0 }, { x: 12, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 12 }, { x: 0, z: 12 }];
    expect(buildingForm(ell, 6, 1).kind).toBe('flat');
  });

  it('works in model units', () => {
    // The same 12 × 9 m house at 0.01 units per metre.
    expect(buildingForm(rect(0.12, 0.09), 7, 0.01).kind).toBe('hipped');
  });
});
