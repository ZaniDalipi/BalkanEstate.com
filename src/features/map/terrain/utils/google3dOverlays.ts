/**
 * What goes on Google's 3D map over the plot: the slope colours draped on
 * the ground, the plot's outline, a pin at the best place to build, and what
 * shows how steep it is — a level glass lid at the height of the plot's
 * highest ground (the taller the gap under it, the further the land falls),
 * pins with the heights of the highest and lowest ground, and a line down
 * the slope between them. The slope colours can be hidden to see the photo.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { MIN_FALL_M, pointsBetween, type SlopeFall } from './slopeFall';
import { slopePatches } from './slopePatches';

export interface Google3DOverlays {
  setSlopeVisible: (on: boolean) => void;
}

export interface Google3DLabels {
  spot: string;
  high: string;
  low: string;
}

/** How solid the slope colours lie over the photo. */
const SLOPE_ALPHA = 0.62;
/** The lid floats this far above the highest ground, so the ground never pokes through it. */
const LID_CLEARANCE_M = 0.5;
/** Pins stand this high above their spot. */
const PIN_M = 14;

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

function pin(lib: google.maps.Maps3DLibrary, at: TerrainPoint, label: string, zIndex: number) {
  return new lib.Marker3DElement({
    position: { lat: at.lat, lng: at.lng, altitude: PIN_M },
    altitudeMode: 'RELATIVE_TO_GROUND',
    extruded: true,
    label,
    zIndex,
  });
}

export function addGoogle3DOverlays(
  map: google.maps.maps3d.Map3DElement,
  lib: google.maps.Maps3DLibrary,
  analysis: TerrainAnalysis,
  polygon: TerrainPoint[],
  fall: SlopeFall | null,
  labels: Google3DLabels,
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

  if (fall && fall.dropM >= MIN_FALL_M) {
    const lid = fall.high.elevation + LID_CLEARANCE_M;
    map.append(new lib.Polygon3DElement({
      path: polygon.map((p) => ({ ...p, altitude: lid })),
      altitudeMode: 'ABSOLUTE',
      extruded: true,
      fillColor: 'rgba(224, 242, 254, 0.22)',
      strokeColor: 'rgba(255, 255, 255, 0.95)',
      strokeWidth: 2,
      zIndex: 4,
    }));
    map.append(new lib.Polyline3DElement({
      path: pointsBetween(fall.high, fall.low, 24),
      altitudeMode: 'CLAMP_TO_GROUND',
      strokeColor: '#ffffff',
      strokeWidth: 6,
      outerColor: '#111827',
      outerWidth: 0.35,
      zIndex: 5,
    }));
    map.append(pin(lib, fall.high, labels.high, 6));
    map.append(pin(lib, fall.low, labels.low, 6));
  }

  const spot = analysis.buildSpot;
  if (spot) map.append(pin(lib, spot, labels.spot, 7));

  let shown = false;
  return {
    setSlopeVisible: (on) => {
      if (on === shown) return;
      shown = on;
      if (on) outline.before(...slope); else slope.forEach((p) => p.remove());
    },
  };
}
