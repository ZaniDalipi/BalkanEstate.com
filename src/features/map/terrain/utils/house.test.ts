import { describe, expect, it } from 'vitest';
import { findBuildSpot, patchDownhill } from './buildSpot';
import { METERS_PER_DEG_LAT, METERS_PER_DEG_LNG } from './gridGeometry';
import { HOUSE, HOUSE_HEIGHT_M, houseAxis, houseFeatures, houseFootprint, rectangleAround } from './house';
import { computeSlopeField } from './slopeField';
import { analyzeTerrain } from './analyzeTerrain';
import { SATELLITE_MAX_ZOOM, START_BEARING, blockTop, openingBearing, terrain3dStyle, verticalPx } from './terrain3dScene';
import { wholeGrid } from './testGrid';
import { makeGrid } from './testGrid';
import type { BuildSpot, TerrainPoint } from '../types';

/** Ground distance between two points, metres (flat-earth, fine at house scale). */
const metres = (a: TerrainPoint, b: TerrainPoint): number =>
  Math.hypot((b.lat - a.lat) * METERS_PER_DEG_LAT, (b.lng - a.lng) * METERS_PER_DEG_LNG * Math.cos((a.lat * Math.PI) / 180));

const spot = (downhill: number | null): BuildSpot => ({ lat: 41, lng: 20, areaM2: 500, quality: 'easy', elevation: 600, downhill });

describe('best spot', () => {
  it('knows its ground height and which way the patch falls', () => {
    // Gentle 5 % slope falling to the west.
    const grid = makeGrid(12, 12, (_r, c) => 400 + c * 0.5);
    const found = findBuildSpot(grid, new Uint8Array(144).fill(1), computeSlopeField(grid))!;
    expect(found.elevation).toBeGreaterThan(400);
    expect(found.elevation).toBeLessThan(406);
    expect(found.downhill).toBe(270);
  });

  it('calls level ground level', () => {
    const grid = makeGrid(6, 6, () => 400);
    expect(patchDownhill([0, 1, 2, 7], computeSlopeField(grid))).toBeNull();
  });
});

describe('house', () => {
  it('runs its long side across the fall line, or east–west on level ground', () => {
    expect(houseAxis(spot(270))).toBe(0); // falls west → long side north–south
    expect(houseAxis(spot(180))).toBe(270); // falls south → long side east–west
    expect(houseAxis(spot(null))).toBe(90);
  });

  it('is about 12 × 9 m on the ground, centred on the spot', () => {
    const [a, b, c, d] = houseFootprint(spot(null));
    expect(metres(a, b)).toBeCloseTo(HOUSE.lengthM, 1);
    expect(metres(b, c)).toBeCloseTo(HOUSE.widthM, 1);
    expect(metres(a, c)).toBeCloseTo(Math.hypot(12, 9), 1);
    expect((a.lat + c.lat) / 2).toBeCloseTo(41, 9);
    expect((b.lng + d.lng) / 2).toBeCloseTo(20, 9);
  });

  it('turns with the slope', () => {
    // Long side north–south: the first two corners differ in latitude only.
    const [a, b] = rectangleAround({ lat: 41, lng: 20 }, 0, 12, 9);
    expect(a.lng).toBeCloseTo(b.lng, 9);
    expect(metres(a, b)).toBeCloseTo(12, 1);
  });

  it('is walls under a roof that narrows to a ridge', () => {
    const { features } = houseFeatures(spot(180));
    const [walls, ...roof] = features;
    expect(walls.properties).toMatchObject({ base: 0, height: HOUSE.wallM, color: HOUSE.wallColor });
    expect(roof.every((f) => f.properties?.color === HOUSE.roofColor)).toBe(true);
    expect(roof[0].properties?.base).toBe(HOUSE.wallM);
    expect(roof.at(-1)?.properties?.height).toBeCloseTo(HOUSE_HEIGHT_M, 6);
    const width = (f: GeoJSON.Feature<GeoJSON.Polygon>) => {
      const [p, , q] = f.geometry.coordinates[0];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    };
    expect(width(roof.at(-1)!)).toBeLessThan(width(roof[0]));
  });
});

describe('3D placement', () => {
  const analysed = (height: (r: number, c: number) => number) => {
    const grid = makeGrid(10, 10, height);
    const result = analyzeTerrain(grid, wholeGrid(grid));
    if (result.ok === false) throw new Error(result.error);
    return result.value;
  };

  it('opens looking uphill from the low side, so higher ground beyond cannot hide the area', () => {
    expect(openingBearing(analysed((_r, c) => 400 + c * 2))).toBe(90); // rises to the east → look east
    expect(openingBearing(analysed((r) => 400 + r * 2))).toBe(180); // rises to the south → look south
  });

  it('opens on the default view over level ground', () => {
    expect(openingBearing(analysed(() => 400))).toBe(START_BEARING);
  });

  it('stands the house on its block, raised by the exaggeration', () => {
    expect(blockTop(610, 600, 1)).toBeCloseTo(10.6, 6);
    expect(blockTop(610, 600, 3)).toBeCloseTo(30.6, 6);
  });

  it('lifts a label by what stands under it, more when tilted, none from straight above', () => {
    expect(verticalPx(10, 18, 41, 0)).toBe(0);
    expect(verticalPx(10, 18, 41, 60)).toBeGreaterThan(verticalPx(10, 18, 41, 30));
    expect(verticalPx(10, 19, 41, 60)).toBeCloseTo(2 * verticalPx(10, 18, 41, 60), 6);
  });

  it('never asks for satellite zooms that show "Map data not yet available"', () => {
    expect(SATELLITE_MAX_ZOOM).toBe(17);
    expect(terrain3dStyle().sources.satellite).toMatchObject({ maxzoom: 17 });
  });
});
