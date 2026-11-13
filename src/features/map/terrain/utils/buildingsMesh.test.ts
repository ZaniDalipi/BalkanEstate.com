import { describe, expect, it } from 'vitest';
import type { Building } from './buildingFootprints';
import { buildingsMesh, buildingsWithin } from './buildingsMesh';
import { plotTerrain, surfaceAt, toModel } from './plotModel';
import { makeGrid } from './testGrid';

// 200 m square, rising 1 m per 10 m to the east.
const ground = makeGrid(20, 20, (_r, c) => 400 + c);
const t = plotTerrain(ground);
const lat = (ground.north + ground.south) / 2;
const lng = (ground.west + ground.east) / 2;
const d = 0.0001; // about 8–11 m
const house: Building = {
  ring: [{ lat, lng }, { lat, lng: lng + d }, { lat: lat - d, lng: lng + d }, { lat: lat - d, lng }],
  heightM: 6,
  measured: true,
};

describe('buildingsMesh', () => {
  it('raises an outline into four walls and a two-triangle roof', () => {
    const m = buildingsMesh(t, ground, [house], 1);
    expect(m.count).toBe(1);
    expect(m.positions.length).toBe((4 * 2 + 2) * 9);
  });

  it('stands on the lowest ground under it, with the roof its height above the highest', () => {
    const m = buildingsMesh(t, ground, [house], 1);
    const ys = Array.from(m.positions.filter((_v, i) => i % 3 === 1));
    const corners = house.ring.map((p) => toModel(t, ground, p)).map((p) => surfaceAt(t, p.x, p.z, 1));
    expect(Math.min(...ys)).toBeLessThan(Math.min(...corners));
    expect(Math.max(...ys)).toBeCloseTo(Math.max(...corners) + 6 * t.scale, 6);
  });

  it('keeps true height when the ground is stretched', () => {
    const ys = (ex: number) => Array.from(buildingsMesh(t, ground, [house], ex).positions.filter((_v, i) => i % 3 === 1));
    const rise = (ex: number) => {
      const corners = house.ring.map((p) => toModel(t, ground, p)).map((p) => surfaceAt(t, p.x, p.z, ex));
      return Math.max(...ys(ex)) - Math.max(...corners);
    };
    expect(rise(3)).toBeCloseTo(rise(1), 6);
  });
});

describe('buildingsWithin', () => {
  it('keeps only buildings wholly inside the area', () => {
    const area = { south: lat - 2 * d, north: lat + d, west: lng - d, east: lng + 2 * d };
    expect(buildingsWithin([house], area)).toHaveLength(1);
    expect(buildingsWithin([house], { ...area, east: lng + d / 2 })).toHaveLength(0);
  });
});
