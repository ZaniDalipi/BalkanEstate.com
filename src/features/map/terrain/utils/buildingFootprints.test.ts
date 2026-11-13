import { describe, expect, it } from 'vitest';
import { buildingHeight, clipToTile, DEFAULT_HEIGHT_M, tileBuildings, tilesCovering } from './buildingFootprints';

const square = (x: number, y: number, s: number) => [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];

describe('tilesCovering', () => {
  it('finds the zoom-14 tiles under a box', () => {
    const tiles = tilesCovering({ south: 42.2, west: 20.73, north: 42.215, east: 20.76 });
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles).toContainEqual({ z: 14, x: 9135, y: 6069 });
  });
});

describe('buildingHeight', () => {
  it('uses the map height, or a one-storey default when there is none', () => {
    expect(buildingHeight({ render_height: 12 })).toEqual({ heightM: 12, measured: true });
    expect(buildingHeight({ render_height: 0 })).toEqual({ heightM: DEFAULT_HEIGHT_M, measured: false });
    expect(buildingHeight({})).toEqual({ heightM: DEFAULT_HEIGHT_M, measured: false });
  });
});

describe('clipToTile', () => {
  it('keeps a building inside the tile as it is, and cuts one across the edge', () => {
    expect(clipToTile(square(10, 10, 20), 4096)).toHaveLength(4);
    const cut = clipToTile(square(4086, 10, 20), 4096);
    expect(Math.max(...cut.map((p) => p.x))).toBe(4096);
    expect(clipToTile(square(4200, 10, 20), 4096)).toEqual([]);
  });
});

describe('tileBuildings', () => {
  it('turns tile features into outlines on the map, skipping holes', () => {
    const tile = { z: 14, x: 9135, y: 6069 };
    const outer = square(100, 100, 50);
    const hole = [...square(110, 110, 10)].reverse();
    const buildings = tileBuildings(tile, 4096, [{ rings: [[...outer, outer[0]], hole], properties: { render_height: 9 } }]);
    expect(buildings).toHaveLength(1);
    expect(buildings[0].ring).toHaveLength(4);
    expect(buildings[0].heightM).toBe(9);
    // The tile's north-west corner is at (lng 20.7202, lat 42.2208); the building lies just south-east of it.
    expect(buildings[0].ring[0].lng).toBeGreaterThan(20.7202);
    expect(buildings[0].ring[0].lat).toBeLessThan(42.2208);
  });
});
