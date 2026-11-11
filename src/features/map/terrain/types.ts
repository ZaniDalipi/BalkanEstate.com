/**
 * Types for the map's terrain tool: draw an area, see how steep each part of
 * it is, which way it falls, and where it is easiest to build.
 */
import type { MeasurementPoint } from '../hooks/useMeasurement';

/** A corner of the drawn area. Same shape as a measurement point. */
export type TerrainPoint = MeasurementPoint;

export interface GridBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Heights on a regular grid, as `/api/terrain/elevation-grid` returns them. */
export interface ElevationGrid extends GridBounds {
  rows: number;
  cols: number;
  /** Approximate cell edge on the ground, in metres. */
  cellSizeM: number;
  /** Row-major heights in metres at each cell centre, row 0 at the north. null = water / no data. */
  elevations: Array<number | null>;
}

export interface ElevationGridResponse {
  grid: ElevationGrid;
  source: { name: string; resolutionM: number };
}

export type SlopeClassId = 'flat' | 'gentle' | 'moderate' | 'steep' | 'verySteep';

/** Slope and fall line of every cell. NaN where there is no height. */
export interface SlopeField {
  /** Rise over run, in percent. */
  slope: Float32Array;
  /** Height change per metre going east. */
  gradEast: Float32Array;
  /** Height change per metre going north. */
  gradNorth: Float32Array;
}

export interface TerrainStats {
  areaM2: number;
  minElevation: number;
  maxElevation: number;
  meanSlope: number;
  maxSlope: number;
  /** Share (0–1) of the measured ground in each slope class. */
  classShares: Record<SlopeClassId, number>;
}

/** An arrow on the map pointing downhill. */
export interface SlopeArrow {
  lat: number;
  lng: number;
  /** Compass bearing of the downhill direction, degrees clockwise from north. */
  bearing: number;
}

/** The roomiest patch of easy ground in the area. */
export interface BuildSpot {
  lat: number;
  lng: number;
  /** Size of the connected patch, m². */
  areaM2: number;
  /** 'easy' = flat or gentle ground; 'workable' = up to moderate slopes. */
  quality: 'easy' | 'workable';
}

export interface TerrainAnalysis {
  grid: ElevationGrid;
  /** 1 for cells whose centre lies inside the drawn area. */
  inside: Uint8Array;
  field: SlopeField;
  stats: TerrainStats;
  arrows: SlopeArrow[];
  buildSpot: BuildSpot | null;
}

export type TerrainAnalysisResult =
  | { ok: true; value: TerrainAnalysis }
  | { ok: false; error: 'noData' };
