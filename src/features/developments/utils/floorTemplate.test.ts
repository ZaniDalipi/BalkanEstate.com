import { describe, expect, it } from 'vitest';
import type { Hotspot, Scene } from '../types';
import { drawnLevels, type FloorLevel, type LevelContext, type UnitRef } from './floorLevels';
import { fillFloors, floorTemplates, isSameSide, type FillInput } from './floorTemplate';

const rect = (id: string, y0: number, y1: number, linkType: Hotspot['linkType'], linkId: string): Hotspot =>
  ({ id, shape: 'rect', points: [[0.2, y0], [0.8, y1]], linkType, linkId, z: 0 });
const view = (id: string, targetId: string, dir: Scene['viewDirection'], hotspots: Hotspot[], viewName?: string): Scene =>
  ({ id, developmentId: 'd', targetType: 'building', targetId, viewKey: id, viewName, viewDirection: dir, sortOrder: 0, imageUrl: '', imageWidth: 1, imageHeight: 1, draft: { hotspots, version: 1 }, version: 1 }) as Scene;

// Building A: ground + floors 1–5; apartments x01/x02 on floors 1–4 (floor 5 has none yet).
const floors: FloorLevel[] = [0, 1, 2, 3, 4, 5].map((l) => ({ id: `f${l}`, buildingId: 'A', level: l, label: l === 0 ? 'Ground' : `Floor ${l}` }));
const units: UnitRef[] = [1, 2, 3, 4].flatMap((l) => [1, 2].map((p) => ({ id: `u${l}0${p}`, unitNumber: `A-${l}0${p}`, floorId: `f${l}` })));
units.push({ id: 'g1', unitNumber: 'A-001', floorId: 'f0' });
const ctx: LevelContext = { floors, units };
// Drawn on this view: the ground floor shop and both apartments of floor 1 (0.1 high).
const drawn = [rect('shop', 0.85, 0.98, 'unit', 'g1'), rect('a', 0.7, 0.8, 'unit', 'u101'), rect('b', 0.7, 0.8, 'unit', 'u102')];
const ids = () => { let n = 0; return () => `n${++n}`; };
const input = (over: Partial<FillInput> = {}): FillInput => {
  const groups = drawnLevels(drawn, 'A', ctx);
  return { groups, floors, drawn: new Set(groups.map((g) => g.level)), stepPct: 15, units, nextId: ids(), ...over };
};

describe('isSameSide', () => {
  it('matches the direction, and custom views by name', () => {
    expect(isSameSide({ viewDirection: 'right' }, { viewDirection: 'right', viewName: 'East' })).toBe(true);
    expect(isSameSide({ viewDirection: 'right' }, { viewDirection: 'left' })).toBe(false);
    expect(isSameSide({ viewDirection: 'custom', viewName: 'Pool ' }, { viewDirection: 'custom', viewName: 'pool' })).toBe(true);
    expect(isSameSide({ viewDirection: 'custom', viewName: 'Pool' }, { viewDirection: 'custom', viewName: 'Street' })).toBe(false);
  });
});

describe('floorTemplates', () => {
  it('offers other buildings\' views with linked regions, the same side first', () => {
    const cFloors: FloorLevel[] = [{ id: 'c1', buildingId: 'C', level: 1, label: 'C1' }];
    const all: LevelContext = { floors: [...floors, ...cFloors], units };
    const current = view('cR', 'C', 'right', []);
    const aFront = view('aF', 'A', 'front', drawn);
    const aRight = view('aR', 'A', 'right', [rect('a', 0.7, 0.8, 'unit', 'u101')]);
    const empty = view('aB', 'A', 'back', [rect('x', 0.1, 0.2, 'unit', '')]);
    const ownOther = view('cF', 'C', 'front', [rect('y', 0.1, 0.2, 'floor', 'c1')]);
    expect(floorTemplates([current, aFront, empty, ownOther, aRight], current, all).map((t) => [t.scene.id, t.levels, t.sameSide]))
      .toEqual([['aR', 1, true], ['aF', 2, false]]);
  });
});

describe('fillFloors', () => {
  it('copies the top drawn floor up the building, linking each copy to the apartment with the same number', () => {
    const r = fillFloors(input());
    expect(r.added).toEqual(['Floor 2', 'Floor 3', 'Floor 4', 'Floor 5']);
    const floor2 = r.hotspots.slice(0, 2);
    expect(floor2.map((h) => h.linkId)).toEqual(['u201', 'u202']);
    expect(floor2[0].points[0][1]).toBeCloseTo(0.55);
    // Floor 5 has no apartments yet: its copies are left to link.
    expect(r).toMatchObject({ linked: 6, toLink: 2, outside: [] });
  });

  it('leaves out floors that would leave the picture, and never touches drawn floors', () => {
    const r = fillFloors(input({ stepPct: 20 }));
    expect(r.added).toEqual(['Floor 2', 'Floor 3', 'Floor 4']);
    expect(r.outside).toEqual(['Floor 5']);
    expect(r.hotspots.every((h) => !['a', 'b', 'shop'].includes(h.id))).toBe(true);
  });

  it('links floor regions to their floor and clears other links', () => {
    const groups = [{ level: 1, regions: [rect('fl', 0.7, 0.8, 'floor', 'f1'), rect('ls', 0.7, 0.8, 'listing', 'L1')] }];
    const r = fillFloors(input({ groups, drawn: new Set([0, 1]) }));
    expect(r.hotspots.slice(0, 2).map((h) => [h.linkType, h.linkId])).toEqual([['floor', 'f2'], ['listing', '']]);
  });

  it('skips basements unless a basement level was drawn', () => {
    const withBasement = [...floors, { id: 'b1', buildingId: 'A', level: -1, label: 'Basement' }];
    expect(fillFloors(input({ floors: withBasement })).added).not.toContain('Basement');
  });

  it('adds nothing when every floor is drawn or nothing is drawn', () => {
    expect(fillFloors(input({ drawn: new Set([0, 1, 2, 3, 4, 5]) })).hotspots).toEqual([]);
    expect(fillFloors(input({ groups: [] })).added).toEqual([]);
  });
});

describe('fillFloors — whole floors', () => {
  it('outlines each added floor under its apartments, linked to the floor, and never guesses the ground floor', () => {
    const upper = drawnLevels([rect('a', 0.7, 0.8, 'unit', 'u101'), rect('b', 0.7, 0.8, 'unit', 'u102')], 'A', ctx);
    const r = fillFloors(input({ groups: upper, drawn: new Set([1]), floorOutline: true }));
    expect(r.added).not.toContain('Ground');
    const outline = r.hotspots[0];
    expect(outline).toMatchObject({ shape: 'rect', linkType: 'floor', linkId: 'f2', z: -1 });
    expect(outline.points).toEqual([[0.2, expect.closeTo(0.55)], [0.8, expect.closeTo(0.65)]]);
  });
});
