/**
 * What the 3D terrain view is made of. Three ways to look at the area:
 *  - 'blocks' (the default): the slope grid itself in 3D — every cell raised
 *    as its own tile, as tall as the ground under it, coloured by its slope;
 *  - 'slope': the real relief (from the same Terrain Tiles the analysis
 *    reads) with the smooth slope picture laid over it;
 *  - 'satellite': the real relief with just the satellite photo.
 * Pure data and maths for MapLibre.
 */
import type { StyleSpecification } from 'maplibre-gl';
import type { ElevationGrid, TerrainAnalysis, TerrainPoint, TerrainStats } from '../types';
import { patchDownhill } from './buildSpot';
import { pointsBounds } from './gridGeometry';
import { rampHex } from './slopeRamp';

const readEnv = (name: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof value === 'string' ? value.trim() : '';
};

/** Terrarium elevation tiles (public, CORS-enabled). `VITE_TERRAIN_TILES_URL` overrides, like the backend's TERRAIN_TILES_URL. */
export const DEM_TILES =
  readEnv('VITE_TERRAIN_TILES_URL') || 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
/** The satellite imagery the business map already uses. */
export const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
/**
 * Esri has no photos past this zoom in much of the rural Balkans and answers
 * with a "Map data not yet available" picture instead (a valid image, so no
 * fallback kicks in). Zoom 17 exists almost everywhere; closer in, MapLibre
 * enlarges it.
 */
export const SATELLITE_MAX_ZOOM = 17;

export const EXAGGERATIONS = [1, 2, 3] as const;
export type Exaggeration = (typeof EXAGGERATIONS)[number];

/**
 * What the 3D window shows: Google's photorealistic 3D with the slope zones
 * on it ('slope') or without ('photo'), or the grid of raised blocks.
 */
export const SCENES = ['slope', 'photo', 'blocks'] as const;
export type Scene3D = (typeof SCENES)[number];

export const VIEWS = ['blocks', 'slope', 'satellite'] as const;
export type View3D = (typeof VIEWS)[number];

/** Whether a view stands on the real relief (the blocks stand on flat ground: relief under them would count the height twice). */
export const usesRelief = (view: View3D): boolean => view !== 'blocks';

export const DEM_SOURCE = 'dem';
export const SLOPE_SOURCE = 'terrain-slope';
export const AREA_SOURCE = 'terrain-area';
export const SHADOW_SOURCE = 'terrain-house-shadow';
export const BLOCKS_SOURCE = 'terrain-blocks';

/** Every block stands at least this tall, so the lowest ground still reads as a tile. */
export const BLOCK_BASE_M = 0.6;
/** Gap between neighbouring blocks, as a share of the cell: enough to read as a grid, not as holes. */
const BLOCK_GAP = 0.08;

/**
 * One raised tile per measured cell inside the area, a little smaller than
 * the cell so the grid shows. `rise` is the height above the area's lowest
 * point; `color` the colour scale at the cell's own slope, so neighbouring
 * tiles shade smoothly into each other.
 */
export function cellBlocks(analysis: TerrainAnalysis): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const { grid, inside, field, stats } = analysis;
  const latStep = (grid.north - grid.south) / grid.rows;
  const lngStep = (grid.east - grid.west) / grid.cols;
  const pad = BLOCK_GAP / 2;
  const features: Array<GeoJSON.Feature<GeoJSON.Polygon>> = [];
  for (let i = 0; i < inside.length; i++) {
    const h = grid.elevations[i];
    if (!inside[i] || h === null || Number.isNaN(field.slope[i])) continue;
    const r = Math.floor(i / grid.cols);
    const c = i % grid.cols;
    const n = grid.north - (r + pad) * latStep;
    const s = grid.north - (r + 1 - pad) * latStep;
    const w = grid.west + (c + pad) * lngStep;
    const e = grid.west + (c + 1 - pad) * lngStep;
    features.push({
      type: 'Feature',
      properties: { rise: Math.round((h - stats.minElevation) * 10) / 10, color: rampHex(field.slope[i]) },
      geometry: { type: 'Polygon', coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** MapLibre expression for a block's height at an exaggeration. */
export function blockHeight(exaggeration: number): ['+', number, ['*', ['get', 'rise'], number]] {
  return ['+', BLOCK_BASE_M, ['*', ['get', 'rise'], exaggeration]];
}

/** Top of the block a point's ground is raised to, metres above the flat ground of the blocks view. */
export function blockTop(elevation: number, minElevation: number, exaggeration: number): number {
  return BLOCK_BASE_M + (elevation - minElevation) * exaggeration;
}

/** The camera the view opens with (and returns to on reset). */
export const START_PITCH = 58;
export const START_BEARING = -25;
export const MAX_PITCH = 78;
/** Fly-around speed. */
export const ORBIT_DEG_PER_SECOND = 8;

export const clampPitch = (pitch: number): number => Math.min(MAX_PITCH, Math.max(0, pitch));

export interface FramePadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Room to leave around the area when framing it, so it sits clear of the
 * info card (top) and the controls (bottom). On a narrow screen the controls
 * stack in two rows and the card is wider, so both take more.
 */
export function framePadding(viewWidth: number): FramePadding {
  return viewWidth < 640
    ? { top: 190, bottom: 180, left: 28, right: 28 }
    : { top: 80, bottom: 130, left: 80, right: 80 };
}

/**
 * Which way the camera first looks: uphill, from the low side, when the area
 * slopes — so the slope faces the viewer and higher ground beyond the area
 * can't stand between them and it. Level areas get the default view.
 */
export function openingBearing(analysis: TerrainAnalysis): number {
  const cells: number[] = [];
  analysis.inside.forEach((v, i) => { if (v && !Number.isNaN(analysis.field.slope[i])) cells.push(i); });
  const downhill = cells.length ? patchDownhill(cells, analysis.field) : null;
  return downhill === null ? START_BEARING : (downhill + 180) % 360;
}

/**
 * How many screen pixels a vertical height spans at this camera (near the
 * middle of the view) — to lift a label above something standing up.
 * MapLibre's world is 512 px wide at zoom 0.
 */
export function verticalPx(heightM: number, zoom: number, lat: number, pitchDeg: number): number {
  const metersPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
  return (heightM / metersPerPx) * Math.sin((pitchDeg * Math.PI) / 180);
}

const dem = (attribution?: string) => ({
  type: 'raster-dem' as const,
  tiles: [DEM_TILES],
  tileSize: 256,
  // The survey behind the tiles is ~30 m; finer tiles add nothing.
  maxzoom: 14,
  encoding: 'terrarium' as const,
  ...(attribution ? { attribution } : {}),
});

/** The base map: satellite imagery with soft relief shading under a pale sky, standing on the relief unless the view is the blocks. */
export function terrain3dStyle(view: View3D, exaggeration: Exaggeration): StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: SATELLITE_MAX_ZOOM,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
      [DEM_SOURCE]: dem('Terrain Tiles: Mapzen / AWS Open Data'),
      // MapLibre wants relief and shading to read the heights through separate sources.
      'dem-shade': dem(),
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#e7eae4' } },
      { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-fade-duration': 200 } },
      {
        id: 'relief-shade',
        type: 'hillshade',
        source: 'dem-shade',
        paint: {
          'hillshade-exaggeration': 0.3,
          'hillshade-shadow-color': '#1d1d1f',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#1d1d1f',
        },
      },
    ],
    ...(usesRelief(view) ? { terrain: { source: DEM_SOURCE, exaggeration } } : {}),
    // Soft light from the north-west, high: the blocks' sides read without going dark.
    light: { anchor: 'map', position: [1.4, 315, 40], color: '#ffffff', intensity: 0.32 },
    sky: {
      'sky-color': '#a8cdf0',
      'horizon-color': '#f2f6fa',
      'sky-horizon-blend': 0.7,
      'horizon-fog-blend': 0.7,
      'fog-color': '#f2f6fa',
      'fog-ground-blend': 0.2,
    },
  };
}

/**
 * Stretch gentle land so its shape shows; leave hills near true height.
 * Relief is height range against the area's width.
 */
export function defaultExaggeration(stats: TerrainStats): Exaggeration {
  const widthM = Math.sqrt(Math.max(stats.areaM2, 1));
  const relief = (stats.maxElevation - stats.minElevation) / widthM;
  if (relief < 0.05) return 3;
  if (relief < 0.15) return 2;
  return 1;
}

/** The drawn area as a closed GeoJSON polygon ([lng, lat]). */
export function areaFeature(points: TerrainPoint[]): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring = points.map((p) => [p.lng, p.lat]);
  if (ring.length) ring.push(ring[0]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

/** Corners of the slope picture, clockwise from the north-west, as MapLibre's image source wants. */
export function imageCorners(grid: ElevationGrid): [[number, number], [number, number], [number, number], [number, number]] {
  return [[grid.west, grid.north], [grid.east, grid.north], [grid.east, grid.south], [grid.west, grid.south]];
}

/** South-west and north-east corners of the area, for framing the camera. */
export function areaBounds(points: TerrainPoint[]): [[number, number], [number, number]] {
  const b = pointsBounds(points);
  return [[b.west, b.south], [b.east, b.north]];
}

/** Ease in and out (0–1 → 0–1), for moving the relief between heights. */
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
