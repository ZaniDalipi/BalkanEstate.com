/**
 * Where grid cells sit on the ground, and which ones fall inside the drawn
 * area. Small areas only (a few km), so a local flat-earth approximation is
 * accurate to well under a metre.
 */
import { pointInPolygon, type Point } from '@/src/features/developments/utils/polygonGeometry';
import type { ElevationGrid, GridBounds, TerrainPoint } from '../types';

export const METERS_PER_DEG_LAT = 110574;
export const METERS_PER_DEG_LNG = 111320;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Ground spacing between cell centres, in metres. */
export function cellSpacingM(grid: GridBounds & { rows: number; cols: number }): { dx: number; dy: number } {
  const midLat = (grid.north + grid.south) / 2;
  return {
    dx: ((grid.east - grid.west) / grid.cols) * METERS_PER_DEG_LNG * Math.cos(toRad(midLat)),
    dy: ((grid.north - grid.south) / grid.rows) * METERS_PER_DEG_LAT,
  };
}

/** Centre of the cell at `index` (row-major, row 0 at the north). */
export function cellCenter(grid: ElevationGrid, index: number): TerrainPoint {
  const row = Math.floor(index / grid.cols);
  const col = index % grid.cols;
  return {
    lat: grid.north - ((row + 0.5) * (grid.north - grid.south)) / grid.rows,
    lng: grid.west + ((col + 0.5) * (grid.east - grid.west)) / grid.cols,
  };
}

/** Ground distance between two points, metres (flat-earth: fine across one area). */
export function metresBetween(a: TerrainPoint, b: TerrainPoint): number {
  return Math.hypot((a.lat - b.lat) * METERS_PER_DEG_LAT, (a.lng - b.lng) * METERS_PER_DEG_LNG * Math.cos(toRad(a.lat)));
}

/** Bounding box of the points. */
export function pointsBounds(points: TerrainPoint[]): GridBounds {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return { south: Math.min(...lats), west: Math.min(...lngs), north: Math.max(...lats), east: Math.max(...lngs) };
}

/** Margin around the area: at least 20 m, and about one grid cell on large areas. */
export const MARGIN_SHARE = 0.015;

/**
 * The box to ask heights for: the area's bounds plus a margin, so cells on the
 * edge of the area still have neighbours to measure slope against. Rounded to
 * ~1 m so redrawing the same area hits the same cached answer.
 */
export function requestBounds(points: TerrainPoint[]): GridBounds {
  const b = pointsBounds(points);
  const midLat = (b.north + b.south) / 2;
  const sideM = Math.max(
    (b.north - b.south) * METERS_PER_DEG_LAT,
    (b.east - b.west) * METERS_PER_DEG_LNG * Math.cos(toRad(midLat)),
  );
  const marginM = Math.max(20, sideM * MARGIN_SHARE);
  const padLat = marginM / METERS_PER_DEG_LAT;
  const padLng = marginM / (METERS_PER_DEG_LNG * Math.cos(toRad(midLat)));
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return {
    south: round(b.south - padLat),
    west: round(b.west - padLng),
    north: round(b.north + padLat),
    east: round(b.east + padLng),
  };
}

/** 1 for each cell whose centre is inside the polygon. */
export function insideMask(grid: ElevationGrid, polygon: TerrainPoint[]): Uint8Array {
  const ring: Point[] = polygon.map((p) => [p.lng, p.lat]);
  const mask = new Uint8Array(grid.rows * grid.cols);
  for (let i = 0; i < mask.length; i++) {
    const c = cellCenter(grid, i);
    mask[i] = pointInPolygon([c.lng, c.lat], ring) ? 1 : 0;
  }
  return mask;
}
