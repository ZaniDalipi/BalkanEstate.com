/**
 * Check the elevation answer before using it: a grid whose size doesn't match
 * its heights would draw cells in the wrong place.
 */
import type { ElevationGridResponse } from '../types';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseElevationGridResponse(raw: unknown): ElevationGridResponse | null {
  const body = raw as Partial<ElevationGridResponse> | null;
  const grid = body?.grid;
  if (!grid || typeof grid !== 'object') return null;
  const { south, west, north, east, rows, cols, cellSizeM, elevations } = grid;
  if (![south, west, north, east, rows, cols, cellSizeM].every(isNum)) return null;
  if (!(south < north && west < east) || !Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) return null;
  if (!Array.isArray(elevations) || elevations.length !== rows * cols) return null;
  if (!elevations.every((h) => h === null || isNum(h))) return null;
  const resolutionM = isNum(body?.source?.resolutionM) ? body.source.resolutionM : 30;
  const name = typeof body?.source?.name === 'string' ? body.source.name : '';
  return { grid: { south, west, north, east, rows, cols, cellSizeM, elevations }, source: { name, resolutionM } };
}
