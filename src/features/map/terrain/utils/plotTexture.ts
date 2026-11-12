/**
 * The picture on top of the model. Two kinds:
 *  - slope: the smooth slope colours inside the drawn area; the land around
 *    it in soft grey with the same relief shading, so the plot stands out;
 *  - satellite: the satellite photo of the whole box (see satelliteImage).
 * Both get the area's outline in white. Canvas in, canvas out.
 */
import type { ElevationGrid, SlopeField, TerrainPoint } from '../types';
import { planSlopeImage } from './drawSlopeImage';
import { renderSlopePixels } from './slopePixels';

/** How far the surroundings fade towards pale grey (0–1). */
const SURROUNDINGS_FADE = 0.62;
const SURROUNDINGS_TONE = 236;

/** Colours of the land outside the area, faded to grey: luminance kept, colour dropped, lifted towards white. */
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

function tracePolygon(ctx: CanvasRenderingContext2D, grid: ElevationGrid, polygon: TerrainPoint[], w: number, h: number): void {
  ctx.beginPath();
  polygon.forEach((p, k) => {
    const x = ((p.lng - grid.west) / (grid.east - grid.west)) * w;
    const y = ((grid.north - p.lat) / (grid.north - grid.south)) * h;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function outline(ctx: CanvasRenderingContext2D, grid: ElevationGrid, polygon: TerrainPoint[], w: number, h: number): void {
  const width = Math.max(2, Math.max(w, h) / 360);
  tracePolygon(ctx, grid, polygon, w, h);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = width * 2.4;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width;
  ctx.stroke();
}

/** The slope picture for the model's top, or null without a 2D canvas. */
export function slopeTexture(grid: ElevationGrid, field: SlopeField, polygon: TerrainPoint[], contourIntervalM: number | null): HTMLCanvasElement | null {
  const plan = planSlopeImage(grid.rows, grid.cols);
  const canvas = document.createElement('canvas');
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const colour = renderSlopePixels(grid, field, plan, contourIntervalM);
  // Water stays clear in the slope picture; on the model it is solid like the rest.
  for (let p = 3; p < colour.length; p += 4) colour[p] = 255;
  const faded = new Uint8ClampedArray(colour);
  fadeSurroundings(faded);

  const image = ctx.createImageData(plan.width, plan.height);
  image.data.set(faded);
  ctx.putImageData(image, 0, 0);
  const inside = document.createElement('canvas');
  inside.width = plan.width;
  inside.height = plan.height;
  const insideCtx = inside.getContext('2d');
  if (insideCtx) {
    const full = insideCtx.createImageData(plan.width, plan.height);
    full.data.set(colour);
    insideCtx.putImageData(full, 0, 0);
    ctx.save();
    tracePolygon(ctx, grid, polygon, plan.width, plan.height);
    ctx.clip();
    ctx.drawImage(inside, 0, 0);
    ctx.restore();
  }
  outline(ctx, grid, polygon, plan.width, plan.height);
  return canvas;
}

/** The satellite photo with the area's outline on it. */
export function satelliteTexture(photo: HTMLCanvasElement, grid: ElevationGrid, polygon: TerrainPoint[]): HTMLCanvasElement {
  const ctx = photo.getContext('2d');
  if (ctx) outline(ctx, grid, polygon, photo.width, photo.height);
  return photo;
}
