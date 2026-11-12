/**
 * The terrain layers on the 3D MapLibre map (outline, block grid, slope
 * picture, house and its shadow), and the few things that change them. Thin wrappers over MapLibre calls; what they draw comes from
 * terrain3dScene, slopeImageUrl and house.
 */
import type * as maplibregl from 'maplibre-gl';
import type { BuildSpot, TerrainAnalysis, TerrainPoint } from '../types';
import { createHouseLayer } from './houseLayer3d';
import { houseShadowCorners } from './houseShadow';
import {
  AREA_SOURCE,
  BLOCKS_SOURCE,
  DEM_SOURCE,
  SHADOW_SOURCE,
  SLOPE_SOURCE,
  areaFeature,
  blockHeight,
  blockTop,
  cellBlocks,
  imageCorners,
  usesRelief,
  type View3D,
} from './terrain3dScene';

const AREA_CASING = 'terrain-area-casing';
const AREA_LINE = 'terrain-area-line';
const SLOPE_LAYER = 'terrain-slope';
const SHADOW_LAYER = 'terrain-house-shadow';
const BLOCKS_LAYER = 'terrain-blocks';
const SLOPE_OPACITY = 0.95;
/** How long the blocks take to grow or shrink to a new height. */
export const STRETCH_MS = 450;

/** Where the house stands for a view: on its block (metres above flat ground), or on the relief. */
export function houseStandsAt(map: maplibregl.Map, analysis: TerrainAnalysis, view: View3D, exaggeration: number): number | null {
  const spot = analysis.buildSpot;
  if (!spot) return null;
  return usesRelief(view)
    ? map.queryTerrainElevation([spot.lng, spot.lat])
    : blockTop(spot.elevation, analysis.stats.minElevation, exaggeration);
}

/**
 * The area's outline (white, on a soft dark edge so it reads on any ground),
 * the grid of raised blocks, and the house — which stands where `houseAt`
 * says. Call once the style has loaded.
 */
export function addTerrainLayers(
  map: maplibregl.Map,
  analysis: TerrainAnalysis,
  polygon: TerrainPoint[],
  view: View3D,
  exaggeration: number,
  houseAt: (map: maplibregl.Map) => number | null,
): void {
  map.addSource(AREA_SOURCE, { type: 'geojson', data: areaFeature(polygon) });
  const round = { 'line-join': 'round', 'line-cap': 'round' } as const;
  map.addLayer({ id: AREA_CASING, type: 'line', source: AREA_SOURCE, layout: round, paint: { 'line-color': '#000000', 'line-opacity': 0.25, 'line-width': 6, 'line-blur': 2 } });
  map.addLayer({ id: AREA_LINE, type: 'line', source: AREA_SOURCE, layout: round, paint: { 'line-color': '#ffffff', 'line-width': 2.5 } });
  map.addSource(BLOCKS_SOURCE, { type: 'geojson', data: cellBlocks(analysis) });
  map.addLayer({
    id: BLOCKS_LAYER,
    type: 'fill-extrusion',
    source: BLOCKS_SOURCE,
    layout: { visibility: usesRelief(view) ? 'none' : 'visible' },
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': blockHeight(exaggeration),
      'fill-extrusion-height-transition': { duration: STRETCH_MS, delay: 0 },
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    },
  });
  if (analysis.buildSpot) map.addLayer(createHouseLayer(analysis.buildSpot, houseAt));
}

/** The slope picture, laid on the relief under the outline. */
export function addSlopeImage(map: maplibregl.Map, url: string, analysis: TerrainAnalysis, view: View3D): void {
  map.addSource(SLOPE_SOURCE, { type: 'image', url, coordinates: imageCorners(analysis.grid) });
  map.addLayer(
    {
      id: SLOPE_LAYER,
      type: 'raster',
      source: SLOPE_SOURCE,
      paint: { 'raster-opacity': view === 'slope' ? SLOPE_OPACITY : 0, 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 350 } },
    },
    AREA_CASING,
  );
}

/** The soft shadow under the house, on top of the slope colours. */
export function addHouseShadow(map: maplibregl.Map, url: string, spot: BuildSpot, view: View3D): void {
  map.addSource(SHADOW_SOURCE, { type: 'image', url, coordinates: houseShadowCorners(spot) });
  map.addLayer(
    { id: SHADOW_LAYER, type: 'raster', source: SHADOW_SOURCE, layout: { visibility: usesRelief(view) ? 'visible' : 'none' }, paint: { 'raster-fade-duration': 0 } },
    AREA_CASING,
  );
}

const show = (map: maplibregl.Map, layer: string, visible: boolean): void => {
  if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
};

/**
 * Switch to a view: the blocks on flat ground, or the relief with the slope
 * colours (they fade) or the bare photo. Returns true when the relief has just
 * come in, so the caller can stand the camera on it once the heights arrive.
 */
export function applyView(map: maplibregl.Map, view: View3D, exaggeration: number): boolean {
  const relief = usesRelief(view);
  const hadRelief = Boolean(map.getTerrain());
  show(map, BLOCKS_LAYER, !relief);
  show(map, SHADOW_LAYER, relief);
  if (map.getLayer(SLOPE_LAYER)) map.setPaintProperty(SLOPE_LAYER, 'raster-opacity', view === 'slope' ? SLOPE_OPACITY : 0);
  if (relief && !hadRelief) {
    setExaggeration(map, exaggeration);
    return true;
  }
  if (!relief && hadRelief) {
    map.setTerrain(null);
    if (map.getCenterElevation() !== 0) map.setCenterElevation(0);
  }
  return false;
}

/** Raise the blocks to an exaggeration; they grow over STRETCH_MS (at once when `instant`). */
export function setBlockHeight(map: maplibregl.Map, exaggeration: number, instant: boolean): void {
  if (!map.getLayer(BLOCKS_LAYER)) return;
  map.setPaintProperty(BLOCKS_LAYER, 'fill-extrusion-height-transition', { duration: instant ? 0 : STRETCH_MS, delay: 0 });
  map.setPaintProperty(BLOCKS_LAYER, 'fill-extrusion-height', blockHeight(exaggeration));
}

/**
 * Put the camera's centre on the ground under it, so the camera can't end up
 * inside land higher than where it thinks the ground is. False (and the camera
 * left alone) while the heights for that spot haven't arrived: MapLibre answers
 * 0 until then, and so does real ground at sea level — which is why
 * `whenGroundKnown` also accepts "every height tile is in".
 */
export function centreOnGround(map: maplibregl.Map): boolean {
  const ground = map.queryTerrainElevation(map.getCenter());
  if (ground === null || ground === 0) return false;
  // Only when it would move: every call is a camera move, and those restart tile loading.
  if (Math.abs(map.getCenterElevation() - ground) > 0.05) map.setCenterElevation(ground);
  return true;
}

/** Stretch the relief ×`exaggeration` and keep the camera on the ground. Rebuilds the relief: for a change that should stay. */
export function setExaggeration(map: maplibregl.Map, exaggeration: number): void {
  map.setTerrain({ source: DEM_SOURCE, exaggeration });
  centreOnGround(map);
}

/**
 * One frame of the relief moving between heights: only the stretch factor
 * changes, nothing is rebuilt, so it is as light as a camera move. False when
 * this MapLibre has no such factor to change (the caller then just sets the
 * final height).
 */
export function stretchRelief(map: maplibregl.Map, exaggeration: number): boolean {
  const relief = (map as { terrain?: { exaggeration?: unknown } | null }).terrain;
  if (!relief || typeof relief.exaggeration !== 'number') return false;
  relief.exaggeration = exaggeration;
  centreOnGround(map);
  map.triggerRepaint();
  return true;
}

/** Fold the map credits down to their ⓘ button, so they open on a tap instead of lying over the controls. */
export function foldCredits(map: maplibregl.Map): void {
  const credits = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  credits?.classList.remove('maplibregl-compact-show');
  credits?.removeAttribute('open');
}

/**
 * Wait for the ground under the camera, then stand the camera on it.
 * `onReady` runs once: when the ground is known, or after `timeoutMs` on a
 * slow connection (the view then opens without it). If the ground only turns
 * up after that, the camera is put on it and `onLateGround` runs, so the
 * caller can settle the view. Returns a function that stops watching.
 */
export function watchGround(map: maplibregl.Map, onReady: () => void, onLateGround: () => void, timeoutMs = 8000): () => void {
  let ready = false;
  let stopped = false;
  /** Whether any height tile has come in: before that, "all tiles loaded" is true of an empty list. */
  let sawTile = false;
  const stop = () => {
    stopped = true;
    map.off('idle', check);
    map.off('sourcedata', onData);
    window.clearTimeout(timer);
  };
  function check(): void {
    if (stopped) return;
    // Known: a real height under the camera, or every tile in and the ground really is at sea level.
    if (!centreOnGround(map) && !(sawTile && map.isSourceLoaded(DEM_SOURCE))) return;
    stop();
    if (ready) onLateGround(); else { ready = true; onReady(); }
  }
  function onData(e: { sourceId?: string; tile?: unknown }): void {
    if (e.sourceId === DEM_SOURCE && e.tile) sawTile = true;
    check();
  }
  const timer = window.setTimeout(() => {
    if (ready || stopped) return;
    ready = true;
    onReady();
  }, timeoutMs);
  map.on('idle', check);
  map.on('sourcedata', onData);
  check();
  return stop;
}
