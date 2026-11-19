/**
 * The buildings round the plot as two 3D meshes: plastered walls (with
 * texture coordinates in storeys and window bays, so a window picture can
 * repeat along them) and roofs, hipped tile roofs on houses, flat ones on
 * the rest (see buildingForm). On a slope the walls start at the lowest
 * ground under the building and the roof is its height above the highest, as
 * a house built into a hillside is. Heights are true size; only the ground
 * is stretched. Pure geometry.
 */
import earcut from 'earcut';
import { Color } from 'three';
import type { ElevationGrid, GridBounds } from '../types';
import type { Building } from './buildingFootprints';
import { boxCorners, buildingForm, type OrientedBox, type XZ } from './buildingForm';
import { buildingSeed, roofColour, wallColour } from './buildingLook';
import { surfaceAt, toModel, type PlotTerrain } from './plotModel';

/** Walls reach this far below the ground, so no gap shows where the ground dips between samples. */
const SINK_M = 1.5;
/** One window bay along a wall, and one storey up it, in metres (the window picture's size). */
export const BAY_M = 3.2;
export const STOREY_M = 3;
/** A spot on the window picture with only plaster: for the footing below the ground line. */
const PLAIN_V = 0.08;
/** Eaves reach past the walls by this much. */
const OVERHANG_M = 0.5;

export interface MeshPart {
  /** Triangles, three vertices each, not shared (so the faces shade flat). */
  positions: Float32Array;
  /** Linear RGB per vertex. */
  colors: Float32Array;
}

export interface BuildingsMesh {
  walls: MeshPart & { uvs: Float32Array };
  roofs: MeshPart;
  count: number;
}

const inside = (b: GridBounds, p: { lat: number; lng: number }) =>
  p.lat <= b.north && p.lat >= b.south && p.lng >= b.west && p.lng <= b.east;

/** The buildings whose whole outline lies in `area`. */
export function buildingsWithin(buildings: Building[], area: GridBounds): Building[] {
  return buildings.filter((b) => b.ring.every((p) => inside(area, p)));
}

class Part {
  pos: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  colour = new Color();
  vertex(x: number, y: number, z: number, u = 0, v = 0) {
    this.pos.push(x, y, z);
    this.col.push(this.colour.r, this.colour.g, this.colour.b);
    this.uv.push(u, v);
  }
}

/** Walls round `outline` from `foot` (below ground) through `ground` (where the storeys start) up to `top`. */
function addWalls(walls: Part, outline: XZ[], foot: number, ground: number, top: number, scale: number) {
  const bay = BAY_M * scale;
  const storey = STOREY_M * scale;
  const vTop = (top - ground) / storey;
  let along = 0;
  outline.forEach((a, i) => {
    const c = outline[(i + 1) % outline.length];
    const u0 = along / bay;
    along += Math.hypot(c.x - a.x, c.z - a.z);
    const u1 = along / bay;
    // Footing: plain plaster.
    walls.vertex(a.x, foot, a.z, u0, PLAIN_V); walls.vertex(c.x, foot, c.z, u1, PLAIN_V); walls.vertex(c.x, ground, c.z, u1, PLAIN_V);
    walls.vertex(a.x, foot, a.z, u0, PLAIN_V); walls.vertex(c.x, ground, c.z, u1, PLAIN_V); walls.vertex(a.x, ground, a.z, u0, PLAIN_V);
    // Storeys, with their windows.
    walls.vertex(a.x, ground, a.z, u0, 0); walls.vertex(c.x, ground, c.z, u1, 0); walls.vertex(c.x, top, c.z, u1, vTop);
    walls.vertex(a.x, ground, a.z, u0, 0); walls.vertex(c.x, top, c.z, u1, vTop); walls.vertex(a.x, top, a.z, u0, vTop);
  });
}

/** A hipped roof over `box`: two sloping sides meeting at a ridge, two triangular ends. */
function addHippedRoof(roofs: Part, box: OrientedBox, wallTop: number, rise: number, scale: number) {
  const slope = rise / box.halfW;
  const over = OVERHANG_M * scale;
  const eave = wallTop - over * slope;
  const ridgeY = wallTop + rise;
  const [p0, p1, p2, p3] = boxCorners(box, over);
  const ridge = Math.max(0, box.halfL - box.halfW);
  const r0 = { x: box.cx - ridge * box.ux, z: box.cz - ridge * box.uz };
  const r1 = { x: box.cx + ridge * box.ux, z: box.cz + ridge * box.uz };
  const tri = (a: XZ, ay: number, b: XZ, by: number, c: XZ, cy: number) => {
    roofs.vertex(a.x, ay, a.z); roofs.vertex(b.x, by, b.z); roofs.vertex(c.x, cy, c.z);
  };
  // Long sides (p0→p1 and p2→p3), then the ends (p1→p2 and p3→p0).
  tri(p0, eave, p1, eave, r1, ridgeY); tri(p0, eave, r1, ridgeY, r0, ridgeY);
  tri(p2, eave, p3, eave, r0, ridgeY); tri(p2, eave, r0, ridgeY, r1, ridgeY);
  tri(p1, eave, p2, eave, r1, ridgeY);
  tri(p3, eave, p0, eave, r0, ridgeY);
}

function addFlatRoof(roofs: Part, outline: XZ[], y: number) {
  for (const i of earcut(outline.flatMap((p) => [p.x, p.z]))) roofs.vertex(outline[i].x, y, outline[i].z);
}

export function buildingsMesh(t: PlotTerrain, ground: ElevationGrid, buildings: Building[], exaggeration: number): BuildingsMesh {
  const walls = new Part();
  const roofs = new Part();
  for (const b of buildings) {
    const ring = b.ring.map((p) => toModel(t, ground, p));
    const form = buildingForm(ring, b.heightM, t.scale);
    const outline = form.kind === 'hipped' ? boxCorners(form.box) : ring;
    const heights = outline.map((p) => surfaceAt(t, p.x, p.z, exaggeration));
    const low = Math.min(...heights);
    const wallTop = Math.max(...heights) + form.wallM * t.scale;
    const seed = buildingSeed(b.ring);
    walls.colour.set(wallColour(seed));
    addWalls(walls, outline, low - SINK_M * t.scale, low, wallTop, t.scale);
    roofs.colour.set(roofColour(seed, form.kind === 'flat'));
    if (form.kind === 'hipped') addHippedRoof(roofs, form.box, wallTop, form.riseM * t.scale, t.scale);
    else addFlatRoof(roofs, outline, wallTop);
  }
  return {
    walls: { positions: new Float32Array(walls.pos), colors: new Float32Array(walls.col), uvs: new Float32Array(walls.uv) },
    roofs: { positions: new Float32Array(roofs.pos), colors: new Float32Array(roofs.col) },
    count: buildings.length,
  };
}
