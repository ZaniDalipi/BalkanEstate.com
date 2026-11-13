/** Test helper: a synthetic heights grid with square cells near lat 42°. */
import type { ElevationGrid } from '../types';
import { METERS_PER_DEG_LAT, METERS_PER_DEG_LNG } from './gridGeometry';

export function makeGrid(
  rows: number,
  cols: number,
  height: (row: number, col: number) => number | null,
  cellM = 10,
): ElevationGrid {
  const south = 42;
  const west = 20;
  const north = south + (rows * cellM) / METERS_PER_DEG_LAT;
  // Square cells at the grid's middle latitude.
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  const east = west + (cols * cellM) / (METERS_PER_DEG_LNG * Math.cos(midLat));
  const elevations: Array<number | null> = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) elevations.push(height(r, c));
  return { south, west, north, east, rows, cols, cellSizeM: cellM, elevations };
}

/** The four corners of a grid, as a drawn area covering all of it. */
export function wholeGrid(grid: ElevationGrid) {
  return [
    { lat: grid.north, lng: grid.west },
    { lat: grid.north, lng: grid.east },
    { lat: grid.south, lng: grid.east },
    { lat: grid.south, lng: grid.west },
  ];
}
