/**
 * The pictures of the 3D view, in two layers:
 *  - the ground: the satellite photo of the surroundings (or, until it
 *    arrives or if it can't, the relief in soft grey), fading into haze at
 *    its edges;
 *  - the plot, on its own sharp sheet just above: its slope colours inside
 *    the drawn area — or, in the satellite view, nothing, so the photo shows
 *    through — and the area's outline in white.
 * Canvas in, canvas out.
 */
import type { ElevationGrid, GridBounds, SlopeField, TerrainPoint } from '../types';
import { drawSlopeImage, planSlopeImage } from './drawSlopeImage';
import { renderSlopePixels } from './slopePixels';
import { HAZE } from './terrain3dScene';

/** How far the relief fades towards pale grey (0–1). */
const SURROUNDINGS_FADE = 0.62;
const SURROUNDINGS_TONE = 236;
/** Longest side of the draped picture, pixels. */
const SURFACE_PX = 2048;
/** The edges fade into haze over this share of the picture. */
const HAZE_SHARE = 0.14;

/** Relief colours faded to grey: luminance kept, colour dropped, lifted towards white. */
export function fadeSurroundings(rgba: Uint8ClampedArray): void {
  for (let p = 0; p < rgba.length; p += 4) {
    const grey = 0.3 * rgba[p] + 0.59 * rgba[p + 1] + 0.11 * rgba[p + 2];
    const v = grey + (SURROUNDINGS_TONE - grey) * SURROUNDINGS_FADE;
    rgba[p] = v;
    rgba[p + 1] = v;
    rgba[p + 2] = v;
    rgba[p + 3] = 255;
  }
}

function canvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  return ctx ? { canvas: c, ctx } : null;
}

/** The surroundings' relief in soft grey (shaded, with contour lines), for when there is no photo. */
export function groundRelief(ground: ElevationGrid, field: SlopeField, contourIntervalM: number | null): HTMLCanvasElement | null {
  const plan = planSlopeImage(ground.rows, ground.cols);
  const out = canvas(plan.width, plan.height);
  if (!out) return null;
  const rgba = renderSlopePixels(ground, field, plan, contourIntervalM);
  fadeSurroundings(rgba);
  const image = out.ctx.createImageData(plan.width, plan.height);
  image.data.set(rgba);
  out.ctx.putImageData(image, 0, 0);
  return out.canvas;
}

/** The plot's slope colours and contour lines, cut to the drawn area (clear outside it). */
export function plotSlopeOverlay(plot: ElevationGrid, field: SlopeField, polygon: TerrainPoint[], contourIntervalM: number | null): HTMLCanvasElement | null {
  const plan = planSlopeImage(plot.rows, plot.cols);
  const out = canvas(plan.width, plan.height);
  if (!out) return null;
  drawSlopeImage(out.ctx, plot, field, polygon, plan, contourIntervalM);
  return out.canvas;
}

function tracePolygon(ctx: CanvasRenderingContext2D, box: GridBounds, polygon: TerrainPoint[], w: number, h: number): void {
  ctx.beginPath();
  polygon.forEach((p, k) => {
    const x = ((p.lng - box.west) / (box.east - box.west)) * w;
    const y = ((box.north - p.lat) / (box.north - box.south)) * h;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function outline(ctx: CanvasRenderingContext2D, box: GridBounds, polygon: TerrainPoint[], w: number, h: number): void {
  const width = Math.max(2, Math.max(w, h) / 320);
  tracePolygon(ctx, box, polygon, w, h);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = width * 2.4;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Fade the four edges into the haze, so the ground has no hard end. */
function hazeEdges(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const reach = Math.max(w, h) * HAZE_SHARE;
  const clear = `${HAZE}00`;
  const edges: Array<[number, number, number, number, number, number, number, number]> = [
    [0, 0, 0, reach, 0, 0, w, reach],
    [0, h, 0, h - reach, 0, h - reach, w, reach],
    [0, 0, reach, 0, 0, 0, reach, h],
    [w, 0, w - reach, 0, w - reach, 0, reach, h],
  ];
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, HAZE);
    g.addColorStop(1, clear);
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  }
}

/** The ground's picture: `base` (photo or grey relief) at a size the GPU takes well, its edges fading into haze. */
export function groundSurface(ground: { widthM: number; depthM: number }, base: HTMLCanvasElement): HTMLCanvasElement | null {
  const longest = Math.max(ground.widthM, ground.depthM);
  const w = Math.round((SURFACE_PX * ground.widthM) / longest);
  const h = Math.round((SURFACE_PX * ground.depthM) / longest);
  const out = canvas(w, h);
  if (!out) return null;
  out.ctx.imageSmoothingQuality = 'high';
  out.ctx.drawImage(base, 0, 0, w, h);
  hazeEdges(out.ctx, w, h);
  return out.canvas;
}

/** The plot's sheet: `overlay` (its slope colours) or nothing, and the outline; clear elsewhere. */
export function plotSurface(plot: ElevationGrid, polygon: TerrainPoint[], overlay: HTMLCanvasElement | null): HTMLCanvasElement | null {
  const plan = planSlopeImage(plot.rows, plot.cols);
  const out = canvas(plan.width, plan.height);
  if (!out) return null;
  if (overlay) out.ctx.drawImage(overlay, 0, 0, plan.width, plan.height);
  outline(out.ctx, plot, polygon, plan.width, plan.height);
  return out.canvas;
}
