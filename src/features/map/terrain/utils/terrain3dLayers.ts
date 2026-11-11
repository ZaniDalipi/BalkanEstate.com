/**
 * The terrain layers on a 3D MapLibre map, and switching between the two
 * views. Thin wrappers over MapLibre calls; what they draw comes from
 * terrain3dScene.
 */
import type * as maplibregl from 'maplibre-gl';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { houseFeatures } from './house';
import {
  AREA_SOURCE,
  BLOCKS_SOURCE,
  HOUSE_SOURCE,
  SLOPE_SOURCE,
  areaFeature,
  blockHeight,
  blockTop,
  cellBlocks,
  imageCorners,
  type Exaggeration,
  type View3DMode,
} from './terrain3dScene';

const AREA_LINE = 'terrain-area-line';
const SLOPE_LAYER = 'terrain-slope';
const BLOCKS_LAYER = 'terrain-blocks';
const HOUSE_LAYER = 'terrain-house';

/** The area outline, the raised-tile grid and the house at the best spot. Call once the style has loaded. */
export function addTerrainLayers(map: maplibregl.Map, analysis: TerrainAnalysis, polygon: TerrainPoint[]): void {
  map.addSource(AREA_SOURCE, { type: 'geojson', data: areaFeature(polygon) });
  map.addLayer({ id: AREA_LINE, type: 'line', source: AREA_SOURCE, paint: { 'line-color': '#ffffff', 'line-width': 3 } });
  map.addSource(BLOCKS_SOURCE, { type: 'geojson', data: cellBlocks(analysis) });
  map.addLayer({
    id: BLOCKS_LAYER,
    type: 'fill-extrusion',
    source: BLOCKS_SOURCE,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': blockHeight(1),
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.95,
      'fill-extrusion-vertical-gradient': true,
    },
  });
  if (!analysis.buildSpot) return;
  map.addSource(HOUSE_SOURCE, { type: 'geojson', data: houseFeatures(analysis.buildSpot) });
  map.addLayer({
    id: HOUSE_LAYER,
    type: 'fill-extrusion',
    source: HOUSE_SOURCE,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    },
  });
}

/** How high the house stands above the map's ground: on its block in the blocks view, on the ground (the relief) otherwise. */
export function houseLift(analysis: TerrainAnalysis, mode: View3DMode, exaggeration: Exaggeration): number {
  const spot = analysis.buildSpot;
  if (!spot || mode !== 'blocks') return 0;
  return blockTop(spot.elevation, analysis.stats.minElevation, exaggeration);
}

/** The slope picture, draped over the relief in the surface view. */
export function addSlopeImage(map: maplibregl.Map, url: string, analysis: TerrainAnalysis): void {
  map.addSource(SLOPE_SOURCE, { type: 'image', url, coordinates: imageCorners(analysis.grid) });
  map.addLayer(
    { id: SLOPE_LAYER, type: 'raster', source: SLOPE_SOURCE, paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } },
    AREA_LINE,
  );
}

const show = (map: maplibregl.Map, layer: string, visible: boolean): void => {
  if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
};

/**
 * Blocks: flat ground, every cell raised by its height × exaggeration, the
 * house standing on its block.
 * Surface: the real relief × exaggeration, with the slope picture on it and
 * the house on the ground (MapLibre stands extrusions on the relief).
 * (Blocks on top of relief would count the height twice.)
 */
/**
 * Put the camera's centre on the ground under it. MapLibre leaves it at sea
 * level when relief is switched on, which puts the camera inside any land
 * higher than its own height; checked again once the elevation tiles are in.
 */
function centreOnGround(map: maplibregl.Map, relief: boolean): void {
  if (!relief) {
    map.setCenterElevation(0);
    return;
  }
  const sync = () => {
    const ground = map.queryTerrainElevation(map.getCenter());
    if (ground !== null) map.setCenterElevation(ground);
  };
  sync();
  map.once('idle', sync);
}

export function applyView(map: maplibregl.Map, analysis: TerrainAnalysis, mode: View3DMode, exaggeration: Exaggeration): void {
  const blocks = mode === 'blocks';
  const hadRelief = Boolean(map.getTerrain());
  map.setTerrain(blocks ? null : { source: 'dem', exaggeration });
  // Re-seat the camera only while there is relief or as it goes: it is a jump, and would cut short a camera move under way.
  if (!blocks || hadRelief) centreOnGround(map, !blocks);
  show(map, BLOCKS_LAYER, blocks);
  show(map, SLOPE_LAYER, !blocks);
  if (map.getLayer(BLOCKS_LAYER)) map.setPaintProperty(BLOCKS_LAYER, 'fill-extrusion-height', blockHeight(exaggeration));
  if (map.getLayer(HOUSE_LAYER)) {
    const lift = houseLift(analysis, mode, exaggeration);
    map.setPaintProperty(HOUSE_LAYER, 'fill-extrusion-base', ['+', ['get', 'base'], lift]);
    map.setPaintProperty(HOUSE_LAYER, 'fill-extrusion-height', ['+', ['get', 'height'], lift]);
  }
}
