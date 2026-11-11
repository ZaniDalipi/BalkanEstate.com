/**
 * What the 3D terrain view is made of. Two ways to look at the area:
 *  - 'blocks': every grid cell raised as its own coloured tile, as tall as
 *    the ground under it — the slope grid itself in 3D;
 *  - 'surface': satellite imagery on the real relief (from the same Terrain
 *    Tiles the slope analysis reads) with the slope picture draped over it.
 * Pure data for MapLibre.
 */
import type { StyleSpecification } from 'maplibre-gl';
import type { ElevationGrid, TerrainAnalysis, TerrainPoint, TerrainStats } from '../types';
import { patchDownhill } from './buildSpot';
import { pointsBounds } from './gridGeometry';
import { SLOPE_BANDS, slopeBandIndex } from './slopeBands';

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

export const VIEW_MODES = ['blocks', 'surface'] as const;
export type View3DMode = (typeof VIEW_MODES)[number];

export const SLOPE_SOURCE = 'terrain-slope';
export const AREA_SOURCE = 'terrain-area';
export const BLOCKS_SOURCE = 'terrain-blocks';
export const HOUSE_SOURCE = 'terrain-house';

/** The camera the view opens with (and returns to on reset). */
export const START_PITCH = 62;
export const START_BEARING = -25;
export const MAX_PITCH = 80;
/** Fly-around speed. */
export const ORBIT_DEG_PER_SECOND = 8;
/** Every block stands at least this tall, so the lowest ground still reads as a tile. */
export const BLOCK_BASE_M = 0.6;
/** Gap between neighbouring blocks, as a share of the cell. */
const BLOCK_GAP = 0.1;

export const clampPitch = (pitch: number): number => Math.min(MAX_PITCH, Math.max(0, pitch));

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

/** Top of the block a point's ground is raised to in the blocks view, metres. */
export function blockTop(elevation: number, minElevation: number, exaggeration: Exaggeration): number {
  return BLOCK_BASE_M + (elevation - minElevation) * exaggeration;
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

/**
 * One raised tile per measured cell inside the area, a little smaller than
 * the cell so the grid shows. `rise` is the height above the area's lowest
 * point; `color` the cell's slope shade.
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
      properties: { rise: Math.round((h - stats.minElevation) * 10) / 10, color: SLOPE_BANDS[slopeBandIndex(field.slope[i])].color },
      geometry: { type: 'Polygon', coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** MapLibre expression for a block's height at an exaggeration. */
export function blockHeight(exaggeration: Exaggeration): ['+', number, ['*', ['get', 'rise'], number]] {
  return ['+', BLOCK_BASE_M, ['*', ['get', 'rise'], exaggeration]];
}

/** The base map: satellite imagery, the elevation source and a sky. Relief is switched on per view (see applyView). */
export function terrain3dStyle(): StyleSpecification {
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
      dem: {
        type: 'raster-dem',
        tiles: [DEM_TILES],
        tileSize: 256,
        // The survey behind the tiles is ~30 m; finer tiles add nothing.
        maxzoom: 14,
        encoding: 'terrarium',
        attribution: 'Terrain Tiles: Mapzen / AWS Open Data',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#dfe7d6' } },
      { id: 'satellite', type: 'raster', source: 'satellite' },
    ],
    sky: {
      'sky-color': '#9cc8f0',
      'horizon-color': '#eef5fb',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.6,
      'fog-color': '#eef5fb',
      'fog-ground-blend': 0.3,
    },
  };
}

/**
 * Exaggerate gentle land so its shape shows; leave hills near true height.
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
