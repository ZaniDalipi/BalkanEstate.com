/**
 * The elevation grid behind the map's terrain (slope) tool. No database; the
 * tile server is faked with real Terrarium PNGs made on the fly.
 */
process.env.SKIP_TEST_DB = 'true';

import sharp from 'sharp';
import {
  MAX_CELLS,
  MIN_CELL_M,
  boundsSizeM,
  getElevationGrid,
  planGrid,
  tilesFor,
  validateGridQuery,
} from '../services/terrain/elevationGridService';
import {
  TILE_SIZE,
  chooseTileZoom,
  decodeTerrarium,
  lngToPixelX,
  pixelMeters,
  tileUrl,
} from '../services/terrain/terrainMath';
import { TerrainUnavailableError, clearElevationTileCache } from '../services/terrain/terrainTileStore';

/** Encode heights as a Terrarium PNG tile. */
async function terrariumPng(height: (col: number, row: number) => number): Promise<Buffer> {
  const rgb = Buffer.alloc(TILE_SIZE * TILE_SIZE * 3);
  for (let row = 0; row < TILE_SIZE; row++) {
    for (let col = 0; col < TILE_SIZE; col++) {
      const v = height(col, row) + 32768;
      const i = (row * TILE_SIZE + col) * 3;
      rgb[i] = Math.floor(v / 256);
      rgb[i + 1] = Math.floor(v) % 256;
      rgb[i + 2] = Math.round((v - Math.floor(v)) * 256) % 256;
    }
  }
  return sharp(rgb, { raw: { width: TILE_SIZE, height: TILE_SIZE, channels: 3 } }).png().toBuffer();
}

type Height = (globalX: number, globalY: number) => number;

/** A fake tile server; counts requests. */
function fakeTiles(height: Height, status = 200) {
  const calls: string[] = [];
  const fetchImpl = (async (url: string) => {
    calls.push(url);
    const [, x, y] = url.match(/\/\d+\/(\d+)\/(\d+)\.png$/)!.map(Number);
    if (status !== 200) return { ok: false, status, arrayBuffer: async () => new ArrayBuffer(0) };
    const png = await terrariumPng((col, row) => height(x * TILE_SIZE + col, y * TILE_SIZE + row));
    return { ok: true, status, arrayBuffer: async () => png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) };
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

// ~1 km box near Prizren (lat 42.2).
const BOX = { south: 42.2, west: 20.7, north: 42.209, east: 20.712 };

beforeEach(() => clearElevationTileCache());

describe('validateGridQuery', () => {
  it('accepts a box given as strings', () => {
    expect(validateGridQuery({ south: '42.2', west: '20.7', north: '42.209', east: '20.712' })).toEqual({ isValid: true, value: BOX });
  });

  it.each([
    [{ south: '42.2', west: '20.7', north: '42.21' }, 'south, west, north and east must be numbers'],
    [{ south: 'x', west: '20.7', north: '42.21', east: '20.71' }, 'south, west, north and east must be numbers'],
    [{ south: ['42'], west: '20.7', north: '42.21', east: '20.71' }, 'south, west, north and east must be numbers'],
    [{ south: '-89', west: '20.7', north: '42.21', east: '20.71' }, 'Coordinates are out of range'],
    [{ south: '42.21', west: '20.7', north: '42.2', east: '20.71' }, 'south must be below north and west left of east'],
    [{ south: '42', west: '20', north: '42.2', east: '20.05' }, 'The area is too large: keep each side under 8 km'],
    [{ south: '42.2', west: '20.7', north: '42.20001', east: '20.71' }, 'The area is too small to measure'],
  ])('rejects %j', (query, error) => {
    expect(validateGridQuery(query as never)).toEqual({ isValid: false, error });
  });
});

describe('terrain maths', () => {
  it('decodes Terrarium colours to metres', () => {
    // (128·256 + 100 + 128/256) − 32768 = 100.5 m; (127·256 + 0 + 0) − 32768 = −256 m
    expect(Array.from(decodeTerrarium(new Uint8Array([128, 100, 128, 127, 0, 0]), 3))).toEqual([100.5, -256]);
  });

  it('fills the tile URL template', () => {
    expect(tileUrl('https://t.example/{z}/{x}/{y}.png', 14, 9100, 6000)).toBe('https://t.example/14/9100/6000.png');
  });

  it('picks a tile zoom whose pixels are at most half a cell, capped at 14', () => {
    expect(pixelMeters(42, chooseTileZoom(80, 42))).toBeLessThanOrEqual(40);
    expect(pixelMeters(42, chooseTileZoom(80, 42) - 1)).toBeGreaterThan(40);
    expect(chooseTileZoom(2, 42)).toBe(14);
  });
});

describe('planGrid', () => {
  it('uses the finest cells on a small plot', () => {
    const plan = planGrid({ south: 42.2, west: 20.7, north: 42.2009, east: 20.7012 }); // ~100 m
    expect(plan.cellSizeM).toBe(MIN_CELL_M);
    expect(plan.rows).toBeGreaterThanOrEqual(10);
    expect(plan.zoom).toBe(14);
  });

  it('keeps a large area under the cell budget with near-square cells', () => {
    const box = { south: 42.2, west: 20.7, north: 42.26, east: 20.78 }; // ~6.6 × 6.6 km
    const plan = planGrid(box);
    expect(plan.rows * plan.cols).toBeLessThanOrEqual(MAX_CELLS * 1.05);
    const { widthM, heightM } = boundsSizeM(box);
    expect(widthM / plan.cols / (heightM / plan.rows)).toBeCloseTo(1, 1);
    expect(tilesFor(box, plan.zoom).length).toBeLessThanOrEqual(9);
  });
});

describe('getElevationGrid', () => {
  it('samples a slope rising to the east from the tiles', async () => {
    const plan = planGrid(BOX);
    const baseX = Math.floor(lngToPixelX(BOX.west, plan.zoom)) - 10;
    const { fetchImpl } = fakeTiles((gx) => 300 + 0.5 * (gx - baseX));
    const { grid, source } = await getElevationGrid(BOX, fetchImpl);

    expect(source.resolutionM).toBe(30);
    expect(grid.rows * grid.cols).toBe(grid.elevations.length);
    const row = grid.elevations.slice(0, grid.cols) as number[];
    for (let i = 1; i < row.length; i++) expect(row[i]).toBeGreaterThan(row[i - 1]);
    // Rise per cell = 0.5 m per tile pixel × pixels per cell.
    const pxPerCell = (lngToPixelX(BOX.east, plan.zoom) - lngToPixelX(BOX.west, plan.zoom)) / grid.cols;
    expect(row[1] - row[0]).toBeCloseTo(0.5 * pxPerCell, 0);
    // Same height down a column: the slope is east-west only.
    expect(grid.elevations[grid.cols * (grid.rows - 1)]).toBeCloseTo(row[0], 0);
  });

  it('marks sea-floor heights as no data', async () => {
    const { fetchImpl } = fakeTiles(() => -40);
    const { grid } = await getElevationGrid(BOX, fetchImpl);
    expect(grid.elevations.every((h) => h === null)).toBe(true);
  });

  it('keeps tiles in memory between requests', async () => {
    const { fetchImpl, calls } = fakeTiles(() => 500);
    await getElevationGrid(BOX, fetchImpl);
    const first = calls.length;
    await getElevationGrid(BOX, fetchImpl);
    expect(first).toBeGreaterThan(0);
    expect(calls.length).toBe(first);
  });

  it('fails with TerrainUnavailableError when tiles cannot be read, and does not keep the failure', async () => {
    await expect(getElevationGrid(BOX, fakeTiles(() => 500, 503).fetchImpl)).rejects.toBeInstanceOf(TerrainUnavailableError);
    const { grid } = await getElevationGrid(BOX, fakeTiles(() => 500).fetchImpl);
    expect(grid.elevations[0]).toBe(500);
  });
});
