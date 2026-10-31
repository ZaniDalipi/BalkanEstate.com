import { describe, it, expect } from 'vitest';
import type { Hotspot, PublicUnit } from '../types';
import { bundleIds, companionsOf, isExtraUnit, linkedHotspotIds } from './unitCompanions';

const u = (id: string, over: Partial<PublicUnit> = {}) => ({ id, unitNumber: id, linkedUnitIds: [], soldWithUnitIds: [], ...over }) as PublicUnit;
const units = new Map([
  ['A1', u('A1', { linkedUnitIds: ['P1', 'S1'] })],
  ['P1', u('P1', { unitType: 'parking', soldWithUnitIds: ['A1'] })],
  ['S1', u('S1', { unitType: 'storage', soldWithUnitIds: ['A1'] })],
  ['A2', u('A2')],
]);
const spot = (id: string, linkId: string, linkType: Hotspot['linkType'] = 'unit') => ({ id, linkId, linkType, shape: 'rect', points: [], z: 0 }) as Hotspot;
const hotspots = [spot('h-a1', 'A1'), spot('h-p1', 'P1'), spot('h-s1', 'S1'), spot('h-a2', 'A2'), spot('h-b', 'P1', 'building')];

describe('units sold together', () => {
  it('knows parking spots and storage rooms', () => {
    expect(isExtraUnit('parking')).toBe(true);
    expect(isExtraUnit('storage')).toBe(true);
    expect(isExtraUnit('apartment')).toBe(false);
  });

  it('lists what an apartment comes with, and what a spot is sold with', () => {
    expect(companionsOf(units.get('A1')!, units).comesWith.map((x) => x.id)).toEqual(['P1', 'S1']);
    expect(companionsOf(units.get('P1')!, units).soldWith.map((x) => x.id)).toEqual(['A1']);
  });

  it('a bundle is the apartment and all its extras, from whichever side', () => {
    expect([...bundleIds('A1', units)].sort()).toEqual(['P1', 'S1']);
    expect([...bundleIds('P1', units)].sort()).toEqual(['A1', 'S1']);
    expect(bundleIds('A2', units).size).toBe(0);
    expect(bundleIds('missing', units).size).toBe(0);
  });

  it('lights up the other units of the bundle on the picture, never other link types', () => {
    expect([...linkedHotspotIds(hotspots[0], hotspots, units)].sort()).toEqual(['h-p1', 'h-s1']);
    expect([...linkedHotspotIds(hotspots[1], hotspots, units)].sort()).toEqual(['h-a1', 'h-s1']);
    expect(linkedHotspotIds(hotspots[3], hotspots, units).size).toBe(0);
    expect(linkedHotspotIds(hotspots[4], hotspots, units).size).toBe(0);
    expect(linkedHotspotIds(undefined, hotspots, units).size).toBe(0);
  });
});
