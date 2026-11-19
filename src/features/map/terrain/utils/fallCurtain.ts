/**
 * The coloured walls under the level glass lid on the 3D map: the plot's
 * outline cut into short pieces, each a wall from the lid down to the ground,
 * coloured by how far the ground lies below the lid there — pale where the
 * land is high, deep blue where it has fallen furthest. Pure.
 */
import type { TerrainPoint } from '../types';
import { metresBetween } from './gridGeometry';
import type { HeightAt } from './heightSampler';

export interface CurtainPiece {
  /** A thin strip along the outline, to stand as a wall. */
  path: TerrainPoint[];
  /** Metres from the lid down to the ground here. */
  depthM: number;
  color: string;
}

/** Pieces about this long, and never more than MAX_PIECES in all. */
const PIECE_M = 2;
const MAX_PIECES = 160;
/** The strips are this thin: walls, not bands on the ground. */
const STRIP_M = 0.3;
const SHALLOW = [186, 230, 253];
const DEEP = [30, 58, 138];

/** Pale sky blue at no depth, deep blue at `max`. */
export function depthColor(depthM: number, maxM: number, alpha = 1): string {
  const t = maxM > 0 ? Math.min(1, Math.max(0, depthM / maxM)) : 0;
  const c = SHALLOW.map((s, i) => Math.round(s + (DEEP[i] - s) * t));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

/** The CSS gradient of the depth colours, for the legend. */
export const DEPTH_GRADIENT_CSS = `linear-gradient(90deg, ${depthColor(0, 1)}, ${depthColor(1, 1)})`;

export function fallCurtain(polygon: TerrainPoint[], lidM: number, heightAt: HeightAt, alpha = 1): CurtainPiece[] {
  const n = polygon.length;
  const lengths = polygon.map((p, i) => metresBetween(p, polygon[(i + 1) % n]));
  const perimeter = lengths.reduce((s, l) => s + l, 0);
  const pieceM = Math.max(PIECE_M, perimeter / MAX_PIECES);
  // Inward is to the left or right of each edge depending on which way the outline runs.
  const turn = Math.sign(polygon.reduce((s, p, i) => {
    const q = polygon[(i + 1) % n];
    return s + (p.lng * q.lat - q.lng * p.lat);
  }, 0)) || 1;
  const pieces: Array<Omit<CurtainPiece, 'color'>> = [];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % n];
    const steps = Math.max(1, Math.round(lengths[i] / pieceM));
    // Strip width as a step in lat/lng, pointing into the plot.
    const len = lengths[i] || 1;
    const inLat = (turn * (b.lng - a.lng) * STRIP_M) / len * Math.cos((a.lat * Math.PI) / 180);
    const inLng = (-turn * (b.lat - a.lat) * STRIP_M) / len / Math.cos((a.lat * Math.PI) / 180);
    for (let k = 0; k < steps; k++) {
      const p = { lat: a.lat + ((b.lat - a.lat) * k) / steps, lng: a.lng + ((b.lng - a.lng) * k) / steps };
      const q = { lat: a.lat + ((b.lat - a.lat) * (k + 1)) / steps, lng: a.lng + ((b.lng - a.lng) * (k + 1)) / steps };
      const mid = { lat: (p.lat + q.lat) / 2, lng: (p.lng + q.lng) / 2 };
      pieces.push({
        path: [p, q, { lat: q.lat + inLat, lng: q.lng + inLng }, { lat: p.lat + inLat, lng: p.lng + inLng }],
        depthM: Math.max(0, lidM - heightAt(mid)),
      });
    }
  });
  const deepest = Math.max(0, ...pieces.map((p) => p.depthM));
  return pieces.map((p) => ({ ...p, color: depthColor(p.depthM, deepest, alpha) }));
}
