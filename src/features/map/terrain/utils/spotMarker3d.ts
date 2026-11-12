/**
 * The "Best spot" label in the 3D view, floating just above the house's roof
 * whichever way the camera looks. A MapLibre marker sits on the ground; it is
 * lifted on screen by the height of the house under it.
 */
import * as maplibregl from 'maplibre-gl';
import type { BuildSpot } from '../types';
import { HOUSE_HEIGHT_M } from './house';
import { verticalPx } from './terrain3dScene';

/** Gap between the roof ridge and the label's stem, metres. */
const CLEARANCE_M = 1.2;

function labelElement(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pointer-events-none flex flex-col items-center';
  const pill = document.createElement('span');
  pill.className = 'px-3 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.25)] text-xs font-semibold tracking-tight text-gray-900 whitespace-nowrap';
  pill.textContent = text;
  const stem = document.createElement('span');
  stem.className = 'w-px h-4 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.5)]';
  el.append(pill, stem);
  return el;
}

export interface SpotMarker3D {
  remove: () => void;
}

/** `lift` is how far above the map's ground the house stands (its block, in the blocks view), metres. */
export function createSpotMarker3D(map: maplibregl.Map, spot: BuildSpot, text: string, lift: () => number): SpotMarker3D {
  const marker = new maplibregl.Marker({ element: labelElement(text), anchor: 'bottom' }).setLngLat([spot.lng, spot.lat]).addTo(map);
  const update = () => {
    marker.setOffset([0, -verticalPx(lift() + HOUSE_HEIGHT_M + CLEARANCE_M, map.getZoom(), spot.lat, map.getPitch())]);
  };
  update();
  map.on('move', update);
  map.on('render', update);
  return {
    remove: () => {
      map.off('move', update);
      map.off('render', update);
      marker.remove();
    },
  };
}
