/**
 * The buildings round the plot as one 3D mesh: each outline raised into walls
 * and a flat roof, standing on the ground of the model. On a slope the walls
 * start at the lowest ground under the building and the roof is its height
 * above the highest, as a house built into a hillside is. Heights are true
 * size; only the ground is stretched. Pure geometry.
 */
import earcut from 'earcut';
import type { ElevationGrid, GridBounds } from '../types';
import type { Building } from './buildingFootprints';
import { surfaceAt, toModel, type PlotTerrain } from './plotModel';

/** Walls reach this far below the ground, so no gap shows where the ground dips between samples. */
const SINK_M = 1.5;

export interface BuildingsMesh {
  /** Triangles, three vertices each, not shared (so the faces shade flat). */
  positions: Float32Array;
  count: number;
}

const inside = (b: GridBounds, p: { lat: number; lng: number }) =>
  p.lat <= b.north && p.lat >= b.south && p.lng >= b.west && p.lng <= b.east;

/** The buildings whose whole outline lies in `area`. */
export function buildingsWithin(buildings: Building[], area: GridBounds): Building[] {
  return buildings.filter((b) => b.ring.every((p) => inside(area, p)));
}

export function buildingsMesh(t: PlotTerrain, ground: ElevationGrid, buildings: Building[], exaggeration: number): BuildingsMesh {
  const out: number[] = [];
  const push = (x: number, y: number, z: number) => { out.push(x, y, z); };
  for (const b of buildings) {
    const pts = b.ring.map((p) => toModel(t, ground, p));
    const heights = pts.map((p) => surfaceAt(t, p.x, p.z, exaggeration));
    const foot = Math.min(...heights) - SINK_M * t.scale;
    const roof = Math.max(...heights) + b.heightM * t.scale;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const c = pts[(i + 1) % n];
      push(a.x, foot, a.z); push(c.x, foot, c.z); push(c.x, roof, c.z);
      push(a.x, foot, a.z); push(c.x, roof, c.z); push(a.x, roof, a.z);
    }
    const flat = pts.flatMap((p) => [p.x, p.z]);
    for (const i of earcut(flat)) push(pts[i].x, roof, pts[i].z);
  }
  return { positions: new Float32Array(out), count: buildings.length };
}
