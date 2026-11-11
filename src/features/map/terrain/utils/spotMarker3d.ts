/**
 * The "Best spot" label in the 3D view, floating just above the house's roof
 * whichever way the camera looks. A MapLibre marker sits on the ground (or the
 * relief); it is lifted on screen by the height of what stands under it.
 */
import * as maplibregl from 'maplibre-gl';
import type { BuildSpot, TerrainAnalysis } from '../types';
import { HOUSE_HEIGHT_M } from './house';
import { houseLift } from './terrain3dLayers';
import { verticalPx, type Exaggeration, type View3DMode } from './terrain3dScene';

/** Gap between the roof ridge and the label's stem, metres. */
const CLEARANCE_M = 1.5;

function labelElement(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pointer-events-none flex flex-col items-center';
  const pill = document.createElement('span');
  pill.className = 'px-2.5 py-1 rounded-full bg-white shadow-lg border-2 border-emerald-500 text-xs font-bold text-emerald-800 whitespace-nowrap';
  pill.textContent = `⌂ ${text}`;
  const stem = document.createElement('span');
  stem.className = 'w-0.5 h-4 bg-emerald-600';
  el.append(pill, stem);
  return el;
}

export interface SpotMarker3D {
  /** Re-place the label for the current camera and view. */
  update: () => void;
  remove: () => void;
}

export function createSpotMarker3D(
  map: maplibregl.Map,
  analysis: TerrainAnalysis & { buildSpot: BuildSpot },
  text: string,
  view: () => { mode: View3DMode; exaggeration: Exaggeration },
): SpotMarker3D {
  const spot = analysis.buildSpot;
  const marker = new maplibregl.Marker({ element: labelElement(text), anchor: 'bottom' }).setLngLat([spot.lng, spot.lat]).addTo(map);
  const update = () => {
    const { mode, exaggeration } = view();
    const heightM = houseLift(analysis, mode, exaggeration) + HOUSE_HEIGHT_M + CLEARANCE_M;
    marker.setOffset([0, -verticalPx(heightM, map.getZoom(), spot.lat, map.getPitch())]);
  };
  update();
  map.on('move', update);
  return {
    update,
    remove: () => {
      map.off('move', update);
      marker.remove();
    },
  };
}
