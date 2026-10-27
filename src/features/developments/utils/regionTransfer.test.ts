import { describe, expect, it } from 'vitest';
import { transferHotspots, validateTransferFields, type TransferOptions } from './regionTransfer';
import type { Hotspot } from '../types';

const same: TransferOptions = { mirror: false, sizePct: 100, moveXPct: 0, moveYPct: 0 };
const rect = (id: string, x0: number, y0: number, x1: number, y1: number, linkId = 'u1'): Hotspot => ({ id, shape: 'rect', points: [[x0, y0], [x1, y1]], linkType: 'unit', linkId, z: 0, label: id });
const poly = (id: string): Hotspot => ({ id, shape: 'polygon', points: [[0.1, 0.1], [0.3, 0.1], [0.2, 0.3]], linkType: 'floor', linkId: 'f1', z: 1 });
const ids = (n: number) => Array.from({ length: n }, (_, i) => `n${i + 1}`);
const ok = (r: ReturnType<typeof transferHotspots>) => {
  if (r.ok === false) throw new Error('expected ok');
  return r.hotspots;
};

describe('validateTransferFields', () => {
  it('accepts sensible values, with a decimal comma', () => {
    expect(validateTransferFields('100', '0', '0')).toEqual({ ok: true, sizePct: 100, moveXPct: 0, moveYPct: 0 });
    expect(validateTransferFields('85,5', '-12', '3.5')).toEqual({ ok: true, sizePct: 85.5, moveXPct: -12, moveYPct: 3.5 });
  });
  it('names the field that is wrong', () => {
    expect(validateTransferFields('', '0', '0')).toEqual({ ok: false, problem: 'size' });
    expect(validateTransferFields('5', '0', '0')).toEqual({ ok: false, problem: 'size' });
    expect(validateTransferFields('301', '0', '0')).toEqual({ ok: false, problem: 'size' });
    expect(validateTransferFields('100', 'x', '0')).toEqual({ ok: false, problem: 'moveX' });
    expect(validateTransferFields('100', '101', '0')).toEqual({ ok: false, problem: 'moveX' });
    expect(validateTransferFields('100', '0', '')).toEqual({ ok: false, problem: 'moveY' });
  });
});

describe('transferHotspots', () => {
  it('copies as they are, with new ids, and keeps the links and labels', () => {
    const out = ok(transferHotspots([rect('a', 0.1, 0.1, 0.2, 0.2), poly('b')], same, true, ids(2)));
    expect(out.map((h) => h.id)).toEqual(['n1', 'n2']);
    expect(out[0]).toMatchObject({ points: [[0.1, 0.1], [0.2, 0.2]], linkId: 'u1', label: 'a' });
    expect(out[1]).toMatchObject({ shape: 'polygon', linkId: 'f1', linkType: 'floor' });
  });

  it('clears what each region links to when asked, keeping the kind of link', () => {
    const out = ok(transferHotspots([rect('a', 0.1, 0.1, 0.2, 0.2)], same, false, ids(1)));
    expect(out[0]).toMatchObject({ linkId: '', linkType: 'unit' });
  });

  it('mirrors across the picture, keeping a rect as (min, max) and reversing a polygon', () => {
    const [r, p] = ok(transferHotspots([rect('a', 0.1, 0.1, 0.3, 0.2), poly('b')], { ...same, mirror: true }, true, ids(2)));
    expect(r.points[0][0]).toBeCloseTo(0.7);
    expect(r.points[1][0]).toBeCloseTo(0.9);
    expect(r.points[0][1]).toBeCloseTo(0.1);
    // (0.1, 0.3, 0.2) → mirrored (0.9, 0.7, 0.8), then listed the other way round.
    expect(p.points.map((pt) => pt[0].toFixed(2))).toEqual(['0.80', '0.70', '0.90']);
  });

  it('resizes about the centre of the whole group, so the layout keeps its proportions', () => {
    const out = ok(transferHotspots([rect('a', 0.2, 0.2, 0.3, 0.3), rect('b', 0.6, 0.6, 0.7, 0.7)], { ...same, sizePct: 50 }, true, ids(2)));
    // The group spans 0.2…0.7 (centre 0.45); half the size puts it at 0.325…0.575.
    expect(out[0].points[0][0]).toBeCloseTo(0.325);
    expect(out[1].points[1][0]).toBeCloseTo(0.575);
    expect(out[0].points[1][0] - out[0].points[0][0]).toBeCloseTo(0.05);
  });

  it('moves the group', () => {
    const out = ok(transferHotspots([rect('a', 0.2, 0.2, 0.3, 0.3)], { ...same, moveXPct: 10, moveYPct: -5 }, true, ids(1)));
    expect(out[0].points[0]).toEqual([expect.closeTo(0.3), expect.closeTo(0.15)]);
  });

  it('refuses a transform that would push anything off the picture, instead of squashing it', () => {
    expect(transferHotspots([rect('a', 0.8, 0.1, 0.95, 0.2)], { ...same, moveXPct: 10 }, true, ids(1))).toEqual({ ok: false, problem: 'outside' });
    expect(transferHotspots([rect('a', 0.2, 0.2, 0.8, 0.8)], { ...same, sizePct: 300 }, true, ids(1))).toEqual({ ok: false, problem: 'outside' });
    expect(transferHotspots([rect('a', 0.4, 0.4, 0.6, 0.6)], { ...same, sizePct: 300 }, true, ids(1)).ok).toBe(true);
  });

  it('has nothing to do for no regions', () => {
    expect(transferHotspots([], same, true, [])).toEqual({ ok: true, hotspots: [] });
  });
});
