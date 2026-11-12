/**
 * What the 3D terrain view is made of: satellite imagery on the real relief
 * (from the same Terrain Tiles the slope analysis reads), softly shaded, with
 * the slope picture laid over the drawn area. Pure data and maths for MapLibre.
 */
import type { StyleSpecification } from 'maplibre-gl';
import type { ElevationGrid, TerrainAnalysis, TerrainPoint, TerrainStats } from '../types';
import { patchDownhill } from './buildSpot';
import { pointsBounds } from './gridGeometry';

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

/** What is laid over the land: the slope colours, or nothing (the satellite photo alone). */
export const OVERLAYS = ['slope', 'satellite'] as const;
export type Overlay3D = (typeof OVERLAYS)[number];

export const DEM_SOURCE = 'dem';
export const SLOPE_SOURCE = 'terrain-slope';
export const AREA_SOURCE = 'terrain-area';
export const SHADOW_SOURCE = 'terrain-house-shadow';

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

/** The base map: satellite imagery with soft relief shading, standing on the relief, under a pale sky. */
export function terrain3dStyle(exaggeration: Exaggeration): StyleSpecification {
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
    terrain: { source: DEM_SOURCE, exaggeration },
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
