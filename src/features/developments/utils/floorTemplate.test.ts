import { describe, expect, it } from 'vitest';
import type { Hotspot, Scene } from '../types';
import { drawnLevels, type FloorLevel, type LevelContext, type UnitRef } from './floorLevels';
import { fillFloors, floorTemplates, isSameSide, type FillInput } from './floorTemplate';

const rect = (id: string, y0: number, y1: number, linkType: Hotspot['linkType'], linkId: string, x0 = 0.2, x1 = 0.8): Hotspot =>
  ({ id, shape: 'rect', points: [[x0, y0], [x1, y1]], linkType, linkId, z: 0 });
const view = (id: string, targetId: string, dir: Scene['viewDirection'], hotspots: Hotspot[], viewName?: string): Scene =>
  ({ id, developmentId: 'd', targetType: 'building', targetId, viewKey: id, viewName, viewDirection: dir, sortOrder: 0, imageUrl: '', imageWidth: 1, imageHeight: 1, draft: { hotspots, version: 1 }, version: 1 }) as Scene;

// Building A: ground + floors 1–5; apartments x01/x02 on floors 1–4 (floor 5 has none yet).
const floors: FloorLevel[] = [0, 1, 2, 3, 4, 5].map((l) => ({ id: `f${l}`, buildingId: 'A', level: l, label: l === 0 ? 'Ground' : `Floor ${l}` }));
const units: UnitRef[] = [1, 2, 3, 4].flatMap((l) => [1, 2].map((p) => ({ id: `u${l}0${p}`, unitNumber: `A-${l}0${p}`, floorId: `f${l}` })));
units.push({ id: 'g1', unitNumber: 'A-001', floorId: 'f0' });
const ctx: LevelContext = { floors, units };
// Drawn on this view: the ground floor shop and both apartments of floor 1 (0.1 high).
const drawn = [rect('shop', 0.85, 0.98, 'unit', 'g1'), rect('a', 0.7, 0.8, 'unit', 'u101', 0.2, 0.45), rect('b', 0.7, 0.8, 'unit', 'u102', 0.55, 0.8)];
const ids = () => { let n = 0; return () => `n${++n}`; };
const input = (over: Partial<FillInput> = {}, regions = drawn): FillInput => {
  const groups = drawnLevels(regions, 'A', ctx);
  return { groups, floors, drawn: new Set(groups.map((g) => g.level)), spacingPct: 100, units, nextId: ids(), ...over };
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
  it('copies the drawn floor up the building, linking each copy to the apartment with the same number', () => {
    const r = fillFloors(input());
    expect(r.added).toEqual(['Floor 2', 'Floor 3', 'Floor 4', 'Floor 5']);
    expect(r.quality).toBe('estimated');
    const floor2 = r.hotspots.slice(0, 2);
    expect(floor2.map((h) => h.linkId)).toEqual(['u201', 'u202']);
    // One floor drawn: each region climbs by its own height plus the slab (0.1 × 1.25).
    expect(floor2[0].points[0][1]).toBeCloseTo(0.575);
    // Floor 5 has no apartments yet: its copies are left to link.
    expect(r).toMatchObject({ linked: 6, toLink: 2, outside: [], partial: [] });
  });

  it('follows each column\'s measured perspective when two floors are drawn', () => {
    // Floor 2's apartment A-201 sits higher, a little to the right and 10 % smaller than A-101.
    const two = [...drawn, rect('a2', 0.585, 0.675, 'unit', 'u201', 0.2325, 0.4575), rect('b2', 0.58, 0.68, 'unit', 'u202', 0.55, 0.8)];
    const r = fillFloors(input({}, two));
    expect(r.added[0]).toBe('Floor 3');
    const a3 = r.hotspots.find((h) => h.linkId === 'u301') as Hotspot;
    const [[x0, y0], [x1, y1]] = a3.points;
    // Measured step from floor 1 to 2: +0.02 / −0.12, 10 % smaller; floor 2 → 3 shrinks by the same 10 %.
    expect((x0 + x1) / 2).toBeCloseTo(0.363);
    expect((y0 + y1) / 2).toBeCloseTo(0.522);
    expect(x1 - x0).toBeCloseTo(0.2025);
    expect(y1 - y0).toBeCloseTo(0.081);
    expect(r.quality).toBe('measured');
  });

  it('keeps the regions of a floor that fit when others would leave the picture', () => {
    const tall = [rect('a', 0.15, 0.25, 'unit', 'u101', 0.2, 0.45), rect('b', 0.3, 0.4, 'unit', 'u102', 0.55, 0.8)];
    const r = fillFloors(input({}, tall));
    // Floor 3: the upper apartment would leave the top, the lower one still fits.
    expect(r.added).toEqual(['Floor 2', 'Floor 3']);
    expect(r.partial).toEqual(['Floor 3']);
    expect(r.left).toBe(1);
  });

  it('applies the spacing correction, and leaves out whole floors that do not fit', () => {
    const r = fillFloors(input({ spacingPct: 200 }));
    expect(r.added).toEqual(['Floor 2', 'Floor 3']);
    expect(r.outside).toEqual(['Floor 4', 'Floor 5']);
    expect(r.hotspots.every((h) => !['a', 'b', 'shop'].includes(h.id))).toBe(true);
  });

  it('outlines each added floor under its apartments as a band, linked to the floor', () => {
    const r = fillFloors(input({ floorOutline: true }));
    const outline = r.hotspots[0];
    expect(outline).toMatchObject({ shape: 'polygon', linkType: 'floor', linkId: 'f2', z: -1 });
    expect(outline.points.length).toBeGreaterThanOrEqual(4);
  });

  it('links floor regions to their floor and clears other links', () => {
    const groups = [{ level: 1, regions: [rect('fl', 0.7, 0.8, 'floor', 'f1'), rect('ls', 0.7, 0.8, 'listing', 'L1')] }];
    const r = fillFloors(input({ groups, drawn: new Set([0, 1]) }));
    expect(r.hotspots.slice(0, 2).map((h) => [h.linkType, h.linkId])).toEqual([['floor', 'f2'], ['listing', '']]);
  });

  it('never guesses the ground floor or basements, and needs a drawn floor above the ground', () => {
    const withBasement = [...floors, { id: 'b1', buildingId: 'A', level: -1, label: 'Basement' }];
    const upper = drawn.filter((h) => h.id !== 'shop');
    const r = fillFloors(input({ floors: withBasement }, upper));
    expect(r.added).not.toContain('Ground');
    expect(r.added).not.toContain('Basement');
    expect(fillFloors(input({}, [drawn[0]])).added).toEqual([]);
  });

  it('adds nothing when every floor is drawn', () => {
    expect(fillFloors(input({ drawn: new Set([0, 1, 2, 3, 4, 5]) })).hotspots).toEqual([]);
  });
});
