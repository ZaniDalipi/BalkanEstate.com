/**
 * Can this drawn area be analysed? Checked before asking the server, which
 * checks the size again. Errors are codes; the panel turns them into text.
 */
import { isSelfIntersecting, type Point } from '@/src/features/developments/utils/polygonGeometry';
import { calculatePolygonArea } from '../../hooks/useMeasurement';
import type { TerrainPoint } from '../types';
import { METERS_PER_DEG_LAT, METERS_PER_DEG_LNG, pointsBounds } from './gridGeometry';

/** Longest side of the area's bounding box. The server allows 8 km including its margin. */
export const TERRAIN_MAX_SIDE_M = 7500;
/** Smaller than this and there is nothing meaningful to show. */
export const TERRAIN_MIN_AREA_M2 = 100;

export type TerrainAreaError = 'tooFewPoints' | 'edgesCross' | 'tooSmall' | 'tooLarge';

export type TerrainAreaValidation = { isValid: true } | { isValid: false; error: TerrainAreaError };

export function validateTerrainArea(points: TerrainPoint[]): TerrainAreaValidation {
  if (points.length < 3) return { isValid: false, error: 'tooFewPoints' };
  const ring: Point[] = points.map((p) => [p.lng, p.lat]);
  if (isSelfIntersecting(ring)) return { isValid: false, error: 'edgesCross' };
  const b = pointsBounds(points);
  const midLat = ((b.north + b.south) / 2) * (Math.PI / 180);
  const widthM = (b.east - b.west) * METERS_PER_DEG_LNG * Math.cos(midLat);
  const heightM = (b.north - b.south) * METERS_PER_DEG_LAT;
  if (widthM > TERRAIN_MAX_SIDE_M || heightM > TERRAIN_MAX_SIDE_M) return { isValid: false, error: 'tooLarge' };
  if (calculatePolygonArea(points) < TERRAIN_MIN_AREA_M2) return { isValid: false, error: 'tooSmall' };
  return { isValid: true };
}
