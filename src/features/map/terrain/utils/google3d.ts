/**
 * Google's photorealistic 3D map (the `maps3d` library of the Maps JavaScript
 * API the app already loads): real buildings, trees and hills in 3D. Only the
 * few calls the terrain view uses are typed here; the installed type
 * definitions predate some of them.
 *
 * Needs the Map Tiles API switched on for the app's Google key. When the
 * library can't be loaded, `loadMaps3d` answers null and the view falls back
 * to the grid of blocks.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { METERS_PER_DEG_LAT, METERS_PER_DEG_LNG, pointsBounds } from './gridGeometry';
import { START_PITCH, openingBearing } from './terrain3dScene';

export interface LatLngAlt {
  lat: number;
  lng: number;
  altitude: number;
}

export interface Camera3DState {
  center: LatLngAlt;
  range: number;
  tilt: number;
  heading: number;
}

export interface Map3D extends HTMLElement {
  center: LatLngAlt | null;
  range: number | null;
  tilt: number | null;
  heading: number | null;
  flyCameraTo?: (options: { endCamera: Camera3DState; durationMillis?: number }) => void;
  flyCameraAround?: (options: { camera: Camera3DState; durationMillis?: number; repeatCount?: number }) => void;
  stopCameraAnimation?: () => void;
}

type ElementClass<T extends HTMLElement = HTMLElement> = new (options?: Record<string, unknown>) => T;

export interface Maps3dLibrary {
  Map3DElement: ElementClass<Map3D>;
  Polygon3DElement: ElementClass;
  Polyline3DElement: ElementClass;
  Marker3DElement?: ElementClass;
}

type ImportLibrary = (name: string) => Promise<unknown>;

/** The 3D library, or null when it isn't available (no Google Maps on the page, or the key can't use it). */
export async function loadMaps3d(): Promise<Maps3dLibrary | null> {
  const google = (window as { google?: { maps?: { importLibrary?: ImportLibrary } } }).google;
  const importLibrary = google?.maps?.importLibrary;
  if (!importLibrary) return null;
  try {
    const lib = (await importLibrary('maps3d')) as Partial<Maps3dLibrary>;
    return lib.Map3DElement && lib.Polygon3DElement && lib.Polyline3DElement ? (lib as Maps3dLibrary) : null;
  } catch {
    return null;
  }
}

/** Set a 3D shape's outline: newer versions call it `path`, earlier ones `outerCoordinates` (and `innerPaths` / `innerCoordinates` for holes). */
export function setShapePath(el: HTMLElement, path: LatLngAlt[] | TerrainPoint[], holes?: Array<LatLngAlt[] | TerrainPoint[]>): void {
  const shape = el as unknown as Record<string, unknown>;
  if ('path' in el) shape.path = path; else shape.outerCoordinates = path;
  if (!holes?.length) return;
  if ('innerPaths' in el) shape.innerPaths = holes; else shape.innerCoordinates = holes;
}

/** The camera that opens the view: over the middle of the area, far enough back to see all of it, tilted, looking uphill. */
export function openingCamera(analysis: TerrainAnalysis, polygon: TerrainPoint[]): Camera3DState {
  const b = pointsBounds(polygon);
  const lat = (b.north + b.south) / 2;
  const widthM = (b.east - b.west) * METERS_PER_DEG_LNG * Math.cos((lat * Math.PI) / 180);
  const heightM = (b.north - b.south) * METERS_PER_DEG_LAT;
  return {
    center: { lat, lng: (b.east + b.west) / 2, altitude: (analysis.stats.minElevation + analysis.stats.maxElevation) / 2 },
    range: Math.max(220, Math.hypot(widthM, heightM) * 1.35),
    tilt: START_PITCH + 4,
    heading: openingBearing(analysis),
  };
}
