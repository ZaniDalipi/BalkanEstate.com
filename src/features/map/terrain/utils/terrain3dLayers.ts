/**
 * The terrain layers on a 3D MapLibre map, and switching between the two
 * views. Thin wrappers over MapLibre calls; what they draw comes from
 * terrain3dScene.
 */
import type * as maplibregl from 'maplibre-gl';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import {
  AREA_SOURCE,
  BLOCKS_SOURCE,
  SLOPE_SOURCE,
  areaFeature,
  blockHeight,
  cellBlocks,
  imageCorners,
  type Exaggeration,
  type View3DMode,
} from './terrain3dScene';

const AREA_LINE = 'terrain-area-line';
const SLOPE_LAYER = 'terrain-slope';
const BLOCKS_LAYER = 'terrain-blocks';

/** The area outline and the raised-tile grid. Call once the style has loaded. */
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
 * Blocks: flat ground, every cell raised by its height × exaggeration.
 * Surface: the real relief × exaggeration, with the slope picture on it.
 * (Blocks on top of relief would count the height twice.)
 */
export function applyView(map: maplibregl.Map, mode: View3DMode, exaggeration: Exaggeration): void {
  const blocks = mode === 'blocks';
  map.setTerrain(blocks ? null : { source: 'dem', exaggeration });
  show(map, BLOCKS_LAYER, blocks);
  show(map, SLOPE_LAYER, !blocks);
  if (map.getLayer(BLOCKS_LAYER)) map.setPaintProperty(BLOCKS_LAYER, 'fill-extrusion-height', blockHeight(exaggeration));
}
