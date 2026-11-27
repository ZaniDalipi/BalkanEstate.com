import { describe, expect, it } from 'vitest';
import type { Hotspot, Scene } from '../types';
import { buildFloorRegions, floorTemplates, isSameSide, type AutoFloorsInput, type FloorLevel } from './floorTemplate';

const rect = (id: string, y0: number, y1: number, linkType: Hotspot['linkType'], linkId: string, x0 = 0.2, x1 = 0.8): Hotspot =>
  ({ id, shape: 'rect', points: [[x0, y0], [x1, y1]], linkType, linkId, z: 0 });
const view = (id: string, targetId: string, dir: Scene['viewDirection'], hotspots: Hotspot[], viewName?: string): Scene =>
  ({ id, developmentId: 'd', targetType: 'building', targetId, viewKey: id, viewName, viewDirection: dir, sortOrder: 0, imageUrl: '', imageWidth: 1, imageHeight: 1, draft: { hotspots, version: 1 }, version: 1 }) as Scene;
const floor = (id: string, buildingId: string, level: number): FloorLevel => ({ id, buildingId, level, label: `L${level}` });

// Building A (template): ground + two floors, each band 0.1 high, 0.15 apart.
const aFloors = [floor('a0', 'A', 0), floor('a1', 'A', 1), floor('a2', 'A', 2)];
const aRight = view('aR', 'A', 'right', [
  rect('g', 0.75, 0.85, 'floor', 'a0'),
  rect('f1', 0.6, 0.7, 'floor', 'a1'),
  rect('f2', 0.45, 0.55, 'floor', 'a2'),
  rect('apt', 0.62, 0.68, 'unit', 'u-a1', 0.25, 0.4),
]);
const noAdjust = { mirror: false, sizePct: 100, moveXPct: 0, moveYPct: 0 };
const ids = () => { let n = 0; return () => `n${++n}`; };
const input = (over: Partial<AutoFloorsInput>): AutoFloorsInput =>
  ({ template: aRight, floors: [...aFloors, floor('c0', 'C', 0), floor('c1', 'C', 1)], buildingId: 'C', existing: [], withUnits: false, adjust: noAdjust, nextId: ids(), ...over });

describe('isSameSide', () => {
  it('matches the direction, and custom views by name', () => {
    expect(isSameSide({ viewDirection: 'right' }, { viewDirection: 'right', viewName: 'East' })).toBe(true);
    expect(isSameSide({ viewDirection: 'right' }, { viewDirection: 'left' })).toBe(false);
    expect(isSameSide({ viewDirection: 'custom', viewName: 'Pool ' }, { viewDirection: 'custom', viewName: 'pool' })).toBe(true);
    expect(isSameSide({ viewDirection: 'custom', viewName: 'Pool' }, { viewDirection: 'custom', viewName: 'Street' })).toBe(false);
  });
});

describe('floorTemplates', () => {
  it('offers views with floor regions, same side first, another building before this one', () => {
    const floors = [...aFloors, floor('c0', 'C', 0)];
    const current = view('cR', 'C', 'right', []);
    const aFront = view('aF', 'A', 'front', [rect('x', 0.1, 0.2, 'floor', 'a0'), rect('y', 0.3, 0.4, 'floor', 'a1')]);
    const cFront = view('cF', 'C', 'front', [rect('z', 0.1, 0.2, 'floor', 'c0')]);
    const unitsOnly = view('aB', 'A', 'back', [rect('u', 0.1, 0.2, 'unit', 'u1')]);
    const list = floorTemplates([current, cFront, aFront, unitsOnly, aRight], current, floors);
    expect(list.map((t) => [t.scene.id, t.floors, t.sameSide])).toEqual([['aR', 3, true], ['aF', 2, false], ['cF', 1, false]]);
  });

  it('ignores floor links to another building', () => {
    const odd = view('odd', 'A', 'right', [rect('x', 0.1, 0.2, 'floor', 'c0')]);
    expect(floorTemplates([odd], view('cR', 'C', 'right', []), [floor('c0', 'C', 0)])).toEqual([]);
  });
});

describe('buildFloorRegions', () => {
  it('links one region to each floor of the building at the template\'s place', () => {
    const r = buildFloorRegions(input({}));
    expect(r.ok).toBe(true);
    if (r.ok === false) return;
    expect(r.hotspots.map((h) => [h.id, h.linkType, h.linkId])).toEqual([['n1', 'floor', 'c0'], ['n2', 'floor', 'c1']]);
    expect(r.hotspots[1].points).toEqual([[0.2, 0.6], [0.8, 0.7]]);
    expect(r).toMatchObject({ floors: 2, estimated: 0, alreadyThere: 0, outside: 0 });
  });

  it('places levels the template lacks at its floor spacing, and leaves out what would leave the picture', () => {
    const floors = [...aFloors, ...[0, 1, 2, 3, 4, 5, 6].map((l) => floor(`c${l}`, 'C', l))];
    const r = buildFloorRegions(input({ floors }));
    if (r.ok === false) throw new Error('expected ok');
    // Level 3 sits one step (0.15) above level 2; level 5 touches the top edge, level 6 would be above it.
    const l3 = r.hotspots.find((h) => h.linkId === 'c3') as Hotspot;
    expect(l3.points[0][1]).toBeCloseTo(0.3);
    expect(l3.points[1][1]).toBeCloseTo(0.4);
    expect(r).toMatchObject({ floors: 6, estimated: 3, outside: 1 });
  });

  it('brings the apartment outlines of each floor along, unlinked', () => {
    const r = buildFloorRegions(input({ withUnits: true }));
    if (r.ok === false) throw new Error('expected ok');
    const apts = r.hotspots.filter((h) => h.linkType === 'unit');
    expect(apts).toHaveLength(1);
    expect(apts[0]).toMatchObject({ linkId: '', points: [[0.25, 0.62], [0.4, 0.68]] });
    expect(r.units).toBe(1);
  });

  it('leaves floors that already have a region on the view as they are', () => {
    const r = buildFloorRegions(input({ existing: [rect('mine', 0.7, 0.9, 'floor', 'c0')] }));
    if (r.ok === false) throw new Error('expected ok');
    expect(r.hotspots.map((h) => h.linkId)).toEqual(['c1']);
    expect(r.alreadyThere).toBe(1);
  });

  it('applies the fit (move) before placing the floors', () => {
    const r = buildFloorRegions(input({ adjust: { ...noAdjust, moveYPct: 10 } }));
    if (r.ok === false) throw new Error('expected ok');
    expect(r.hotspots[0].points[0][1]).toBeCloseTo(0.85);
  });

  it('names the reason it cannot place anything', () => {
    expect(buildFloorRegions(input({ buildingId: 'Z' }))).toEqual({ ok: false, problem: 'noFloors' });
    expect(buildFloorRegions(input({ template: view('e', 'A', 'right', []) }))).toEqual({ ok: false, problem: 'noTemplate' });
    expect(buildFloorRegions(input({ adjust: { ...noAdjust, moveYPct: 50 } }))).toEqual({ ok: false, problem: 'outside' });
  });
});
