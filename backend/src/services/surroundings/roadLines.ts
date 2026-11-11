/**
 * The road shapes around a home, for the typical-traffic map: every main road
 * and street within MAP_RADIUS_M, as [lat, lng] lines. Pure.
 *
 * Kept small for the response: coordinates rounded to ~1 m, points beyond
 * CLIP_M dropped, and the farthest lines dropped past MAX_POINTS.
 */

import type { RoadKind } from './osmSources';
import { kindOf, polylineDistance, type OsmElement } from './osmSources';
import { linesOf, tileKindOf, type TileFeature } from './tileSources';

export type MapRoadKind = RoadKind | 'street';

export interface RoadLine {
  kind: MapRoadKind;
  name?: string;
  /** [lat, lng] pairs. */
  points: Array<[number, number]>;
}

export const MAP_RADIUS_M = 600;
const CLIP_M = 900;
const MAX_POINTS = 6000;

const MAP_KINDS: readonly string[] = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street'];

const round5 = (v: number) => Math.round(v * 100_000) / 100_000;

/** Keep a line if it comes within the map radius; drop its far points. */
const shapeLine = (
  home: { lat: number; lng: number },
  latLngs: Array<[number, number]>
): { points: Array<[number, number]>; distance: number } | null => {
  const origin = { lat: home.lat, lon: home.lng };
  const asLatLon = latLngs.map(([lat, lon]) => ({ lat, lon }));
  const distance = polylineDistance(origin, asLatLon);
  if (!Number.isFinite(distance) || distance > MAP_RADIUS_M) return null;
  const points = latLngs
    .filter(([lat, lon]) => polylineDistance(origin, [{ lat, lon }]) <= CLIP_M)
    .map(([lat, lon]) => [round5(lat), round5(lon)] as [number, number]);
  return points.length >= 2 ? { points, distance } : null;
};

/** Nearest lines first, until the point budget is spent. */
const withinBudget = (lines: Array<RoadLine & { distance: number }>): RoadLine[] => {
  const out: RoadLine[] = [];
  let used = 0;
  for (const { distance: _d, ...line } of [...lines].sort((a, b) => a.distance - b.distance)) {
    if (used + line.points.length > MAX_POINTS) break;
    used += line.points.length;
    out.push(line);
  }
  return out;
};

/** Road lines from vector-tile features (the `transportation` layer holds every piece). */
export const tileRoadLines = (features: TileFeature[], home: { lat: number; lng: number }): RoadLine[] => {
  const lines: Array<RoadLine & { distance: number }> = [];
  for (const f of features) {
    if (f?.layer !== 'transportation' || !f.properties || !f.geometry) continue;
    const kind = tileKindOf(f.layer, f.properties);
    if (!kind || !MAP_KINDS.includes(kind)) continue;
    for (const line of linesOf(f.geometry)) {
      const shaped = shapeLine(home, line.map(([lon, lat]) => [lat, lon] as [number, number]));
      if (shaped) lines.push({ kind: kind as MapRoadKind, ...shaped });
    }
  }
  return withinBudget(lines);
};

/** Road lines from Overpass ways (`out geom`). */
export const osmRoadLines = (elements: unknown, home: { lat: number; lng: number }): RoadLine[] => {
  if (!Array.isArray(elements)) return [];
  const lines: Array<RoadLine & { distance: number }> = [];
  for (const raw of elements as OsmElement[]) {
    const kind = raw?.tags ? kindOf(raw.tags) : null;
    if (!kind || !MAP_KINDS.includes(kind) || !Array.isArray(raw.geometry)) continue;
    const latLngs = raw.geometry
      .filter((p): p is { lat: number; lon: number } => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => [p.lat, p.lon] as [number, number]);
    const shaped = shapeLine(home, latLngs);
    if (!shaped) continue;
    const name = raw.tags?.name?.trim() || undefined;
    lines.push({ kind: kind as MapRoadKind, ...(name ? { name } : {}), ...shaped });
  }
  return withinBudget(lines);
};
