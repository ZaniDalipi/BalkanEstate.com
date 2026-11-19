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
  it('raises a house into four walls (footing and storeys) under a hipped roof', () => {
    const m = buildingsMesh(t, ground, [house], 1);
    expect(m.count).toBe(1);
    // Each wall: two triangles of footing, two of storeys.
    expect(m.walls.positions.length).toBe(4 * 4 * 9);
    expect(m.walls.uvs.length).toBe((m.walls.positions.length / 3) * 2);
    // Hipped roof: two triangles on each long side, one at each end.
    expect(m.roofs.positions.length).toBe(6 * 9);
    expect(m.walls.colors.length).toBe(m.walls.positions.length);
    expect(m.roofs.colors.length).toBe(m.roofs.positions.length);
  });

  it('gives a big building a flat roof over its own outline', () => {
    const D = 0.0005; // ~40–55 m: far too big for a house
    const hall: Building = { ...house, ring: [{ lat, lng }, { lat, lng: lng + D }, { lat: lat - D, lng: lng + D }, { lat: lat - D, lng }] };
    const m = buildingsMesh(t, ground, [hall], 1);
    expect(m.roofs.positions.length).toBe(2 * 9);
  });

  it('gives the same building the same colours every time', () => {
    const a = buildingsMesh(t, ground, [house], 1);
    const b = buildingsMesh(t, ground, [house], 2);
    expect(Array.from(a.walls.colors.slice(0, 3))).toEqual(Array.from(b.walls.colors.slice(0, 3)));
    expect(Array.from(a.roofs.colors.slice(0, 3))).toEqual(Array.from(b.roofs.colors.slice(0, 3)));
  });

  it('stands on the lowest ground under it, with the roof its height above the highest', () => {
    const m = buildingsMesh(t, ground, [house], 1);
    const ys = [...m.walls.positions, ...m.roofs.positions].filter((_v, i) => i % 3 === 1);
    const corners = house.ring.map((p) => toModel(t, ground, p)).map((p) => surfaceAt(t, p.x, p.z, 1));
    expect(Math.min(...ys)).toBeLessThan(Math.min(...corners));
    expect(Math.max(...ys)).toBeCloseTo(Math.max(...corners) + 6 * t.scale, 6);
  });

  it('keeps true height when the ground is stretched', () => {
    const ys = (ex: number) => {
      const m = buildingsMesh(t, ground, [house], ex);
      return [...m.walls.positions, ...m.roofs.positions].filter((_v, i) => i % 3 === 1);
    };
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
