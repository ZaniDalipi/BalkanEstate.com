/**
 * What goes on Google's 3D map over the plot: the slope colours draped on
 * the ground, the plot's outline, and a pin at the best place to build.
 * The slope colours can be hidden to see the photo underneath.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { slopePatches } from './slopePatches';

export interface Google3DOverlays {
  setSlopeVisible: (on: boolean) => void;
}

/** How solid the slope colours lie over the photo. */
const SLOPE_ALPHA = 0.62;

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export function addGoogle3DOverlays(
  map: google.maps.maps3d.Map3DElement,
  lib: google.maps.Maps3DLibrary,
  analysis: TerrainAnalysis,
  polygon: TerrainPoint[],
  markerLabel: string,
): Google3DOverlays {
  const slope = slopePatches(analysis, polygon).map(
    (patch) => new lib.Polygon3DElement({
      path: patch.path,
      altitudeMode: 'CLAMP_TO_GROUND',
      fillColor: withAlpha(patch.color, SLOPE_ALPHA),
      strokeWidth: 0,
    }),
  );
  const outline = new lib.Polygon3DElement({
    path: polygon,
    altitudeMode: 'CLAMP_TO_GROUND',
    fillColor: 'rgba(255, 255, 255, 0.08)',
    strokeColor: '#ffffff',
    strokeWidth: 3,
    zIndex: 2,
  });
  map.append(outline);

  const spot = analysis.buildSpot;
  if (spot) {
    map.append(new lib.Marker3DElement({
      position: { lat: spot.lat, lng: spot.lng, altitude: 18 },
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true,
      label: markerLabel,
      zIndex: 3,
    }));
  }

  let shown = false;
  return {
    setSlopeVisible: (on) => {
      if (on === shown) return;
      shown = on;
      if (on) outline.before(...slope); else slope.forEach((p) => p.remove());
    },
  };
}
