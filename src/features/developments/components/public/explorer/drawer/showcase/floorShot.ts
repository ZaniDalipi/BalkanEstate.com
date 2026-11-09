import type { Hotspot, PublicSceneView } from '../../../../../types';
import { polygonArea, toPolygon, type Point } from '../../../../../utils/polygonGeometry';
import { unitHotspot } from '../../dive/useApartmentDive';

/** The apartment on its floor: the floor's picture and, when it is marked there, its outline (0–1 of the picture). */
export interface FloorShot {
  view: PublicSceneView;
  region?: Point[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The outline of a marked region, ready to draw: null when its points are
 * not numbers or it encloses nothing, so a broken mark never draws a wrong
 * outline (the plain floor shows instead).
 */
export function regionOutline(hotspot: Pick<Hotspot, 'shape' | 'points'>): Point[] | null {
  const ok = Array.isArray(hotspot.points) && hotspot.points.every((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!ok) return null;
  const points = hotspot.points.map(([x, y]) => [clamp01(x), clamp01(y)] as Point);
  const outline = toPolygon(hotspot.shape, points);
  return outline.length >= 3 && polygonArea(outline) > 0 ? outline : null;
}

/**
 * Pick the floor picture to show an apartment on: the first camera view of
 * its floor where the apartment is marked, else the floor's first picture
 * (it still shows the floor). Views without an image are skipped. Null when
 * the floor has no picture.
 */
export function pickFloorShot(views: PublicSceneView[], unitId: string): FloorShot | null {
  const pictures = views.filter((v) => !!v.imageUrl);
  for (const view of pictures) {
    const hotspot = unitHotspot(view.hotspots ?? [], unitId);
    const region = hotspot ? regionOutline(hotspot) : null;
    if (region) return { view, region };
  }
  return pictures[0] ? { view: pictures[0] } : null;
}
