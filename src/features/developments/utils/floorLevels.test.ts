import { describe, expect, it } from 'vitest';
import type { Hotspot } from '../types';
import { drawnLevels, matchingUnit, parseStepPct, suggestStepPct, unitPosition, type LevelContext } from './floorLevels';

const rect = (id: string, y0: number, y1: number, linkType: Hotspot['linkType'], linkId: string): Hotspot =>
  ({ id, shape: 'rect', points: [[0.2, y0], [0.8, y1]], linkType, linkId, z: 0 });
const ctx: LevelContext = {
  floors: [{ id: 'f0', buildingId: 'A', level: 0, label: 'Ground' }, { id: 'f1', buildingId: 'A', level: 1, label: 'Floor 1' }, { id: 'f2', buildingId: 'A', level: 2, label: 'Floor 2' }, { id: 'x1', buildingId: 'B', level: 1, label: 'B1' }],
  units: [{ id: 'u001', unitNumber: 'A-001', floorId: 'f0' }, { id: 'u102', unitNumber: 'A-102', floorId: 'f1' }, { id: 'u103', unitNumber: 'A-103', floorId: 'f1' }],
};

describe('drawnLevels', () => {
  it('groups the regions by the floor their apartment or floor link is on, and skips unlinked ones', () => {
    const groups = drawnLevels([rect('a', 0.8, 0.9, 'unit', 'u001'), rect('b', 0.6, 0.7, 'unit', 'u102'), rect('c', 0.6, 0.7, 'unit', 'u103'), rect('d', 0.4, 0.5, 'floor', 'f2'), rect('e', 0.1, 0.2, 'unit', ''), rect('f', 0.1, 0.2, 'floor', 'x1')], 'A', ctx);
    expect(groups.map((g) => [g.level, g.regions.map((h) => h.id)])).toEqual([[0, ['a']], [1, ['b', 'c']], [2, ['d']]]);
  });
});

describe('suggestStepPct', () => {
  it('measures between the two highest levels, so a tall ground floor does not count', () => {
    const groups = drawnLevels([rect('g', 0.7, 0.95, 'unit', 'u001'), rect('a', 0.5, 0.6, 'unit', 'u102'), rect('b', 0.38, 0.48, 'floor', 'f2')], 'A', ctx);
    expect(suggestStepPct(groups)).toBe(12);
  });
  it('uses the level\'s own height plus the slab when only one is drawn', () => {
    expect(suggestStepPct(drawnLevels([rect('a', 0.5, 0.58, 'unit', 'u102')], 'A', ctx))).toBe(10);
  });
});

describe('apartment numbers', () => {
  it('reads the place within the floor from the end of the number', () => {
    expect([unitPosition('A-102'), unitPosition('C-305'), unitPosition('12'), unitPosition('PH')]).toEqual([2, 5, 12, null]);
  });
  it('matches the apartment in the same place on another floor, only when it is clear', () => {
    const floor2 = [{ id: 'a', unitNumber: 'A-201', floorId: 'f2' }, { id: 'b', unitNumber: 'A-202', floorId: 'f2' }];
    expect(matchingUnit('A-102', floor2)?.id).toBe('b');
    expect(matchingUnit('A-104', floor2)).toBeUndefined();
    expect(matchingUnit('A-102', [...floor2, { id: 'c', unitNumber: 'B-202', floorId: 'f2' }])).toBeUndefined();
  });
});

describe('parseStepPct', () => {
  it('accepts a comma and refuses values outside the limits', () => {
    expect(parseStepPct('9,5')).toEqual({ ok: true, value: 9.5 });
    expect(parseStepPct('')).toEqual({ ok: false });
    expect(parseStepPct('0.1')).toEqual({ ok: false });
    expect(parseStepPct('high')).toEqual({ ok: false });
  });
});
