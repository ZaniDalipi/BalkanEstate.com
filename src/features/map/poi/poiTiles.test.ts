import { describe, it, expect } from 'vitest';
import { tilesInBounds } from './poiTiles';

const SKOPJE = { north: 42.01, south: 41.99, east: 21.44, west: 21.41 };

describe('tilesInBounds', () => {
  it('covers a city block with one to four tiles', () => {
    const tiles = tilesInBounds(SKOPJE);
    expect(tiles.length).toBeGreaterThanOrEqual(1);
    expect(tiles.length).toBeLessThanOrEqual(4);
  });
  it('caps a wide view and keeps the tiles nearest the centre', () => {
    const wide = tilesInBounds({ north: 42.3, south: 41.7, east: 21.8, west: 21.0 }, 5);
    expect(wide).toHaveLength(5);
  });
  it('gives nothing for a missing, inverted or non-finite view', () => {
    expect(tilesInBounds(null)).toEqual([]);
    expect(tilesInBounds({ north: 1, south: 2, east: 3, west: 2 })).toEqual([]);
    expect(tilesInBounds({ north: NaN, south: 1, east: 3, west: 2 })).toEqual([]);
  });
});
