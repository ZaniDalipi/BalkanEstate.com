import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../types';
import type { Point } from './polygonGeometry';
import { columnMotions, columnPartner, floorHull, measureMotion, moveByFloors } from './floorPerspective';

const rect = (id: string, x0: number, y0: number, x1: number, y1: number, linkId = ''): Hotspot =>
  ({ id, shape: 'rect', points: [[x0, y0], [x1, y1]], linkType: 'unit', linkId, z: 0 });
const numbers = new Map([['u101', 'A-101'], ['u102', 'A-102'], ['u201', 'A-201'], ['u202', 'A-202']]);

describe('columnPartner', () => {
  it('pairs by apartment number ending, else by horizontal overlap', () => {
    const upper = [rect('x', 0.6, 0.5, 0.8, 0.6, 'u202'), rect('y', 0.2, 0.5, 0.4, 0.6, 'u201')];
    expect(columnPartner(rect('a', 0.2, 0.7, 0.4, 0.8, 'u102'), upper, numbers)?.id).toBe('x');
    expect(columnPartner(rect('b', 0.21, 0.7, 0.39, 0.8), upper, numbers)?.id).toBe('y');
    expect(columnPartner(rect('c', 0.45, 0.7, 0.55, 0.8), upper, numbers)).toBeUndefined();
  });
});

describe('measureMotion and moveByFloors', () => {
  const lower = rect('l', 0.2, 0.7, 0.4, 0.8);
  const upper = rect('u', 0.23, 0.585, 0.41, 0.675);
  const m = measureMotion(upper, 2, lower, 1);

  it('measures the sideways drift and shrink of one floor', () => {
    expect(m.dx).toBeCloseTo(0.018);
    expect(m.sx).toBeCloseTo(0.9);
    expect(m.sy).toBeCloseTo(0.9);
  });

  it('steps from the upper floor on with the perspective, and back down onto the lower one', () => {
    // From the upper floor the next step up is 10 % shorter than the measured one.
    expect(m.dy).toBeCloseTo(-0.108);
    const down = moveByFloors(upper.points as Point[], m, -1);
    (lower.points as Point[]).forEach(([x, y], i) => { expect(down[i][0]).toBeCloseTo(x); expect(down[i][1]).toBeCloseTo(y); });
    const up = moveByFloors(lower.points as Point[], measureMotion(lower, 1, upper, 2), 1);
    (upper.points as Point[]).forEach(([x, y], i) => { expect(up[i][0]).toBeCloseTo(x); expect(up[i][1]).toBeCloseTo(y); });
  });

  it('stretches or shortens every step with the spacing correction', () => {
    const [[, y0], [, y1]] = moveByFloors(upper.points as Point[], m, 1, 1.5);
    expect((y0 + y1) / 2).toBeCloseTo(0.63 - 0.108 * 1.5);
  });
});

describe('columnMotions', () => {
  it('measures paired columns and scales the others by their height, never using the ground floor', () => {
    const groups = [
      { level: 0, regions: [rect('g', 0.1, 0.85, 0.9, 0.98)] },
      { level: 1, regions: [rect('a', 0.2, 0.7, 0.4, 0.8, 'u101'), rect('lone', 0.6, 0.72, 0.8, 0.77)] },
      { level: 2, regions: [rect('a2', 0.23, 0.585, 0.41, 0.675, 'u201')] },
    ];
    const { motions, quality } = columnMotions(groups, numbers);
    expect(quality).toBe('partial');
    expect(motions.has('g')).toBe(false);
    // The unpaired region is half as tall as the measured one, so it climbs half as far.
    expect(motions.get('lone')?.dy).toBeCloseTo(-0.06);
  });
});

describe('floorHull', () => {
  it('wraps the corners of an angled floor in one outline', () => {
    const hull = floorHull([[0, 0.5], [0.4, 0.6], [0.4, 0.7], [0, 0.6], [0.6, 0.6], [1, 0.5], [1, 0.6], [0.6, 0.7], [0.3, 0.6]]);
    expect(hull).toHaveLength(6);
    expect(hull).not.toContainEqual([0.3, 0.6]);
  });
});
