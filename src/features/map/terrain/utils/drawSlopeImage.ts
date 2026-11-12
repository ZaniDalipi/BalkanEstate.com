/**
 * Put the slope picture (see slopePixels) on a canvas, cut cleanly to the
 * drawn shape. The picture is laid over the 2D map and draped on the 3D view,
 * covering the grid's box.
 */
import type { ElevationGrid, SlopeField, TerrainPoint } from '../types';
import { renderSlopePixels, type ImagePlan } from './slopePixels';

export type { ImagePlan } from './slopePixels';

/** Longest side of the picture, in pixels: sharp when zoomed in, quick to paint. */
export const MAX_IMAGE_PX = 1024;
/** Up to this many pixels per grid cell, so small plots stay sharp close up. */
const MAX_PX_PER_CELL = 96;

export function planSlopeImage(rows: number, cols: number, maxPx = MAX_IMAGE_PX): ImagePlan {
  const pxPerCell = Math.max(1, Math.min(MAX_PX_PER_CELL, Math.floor(maxPx / Math.max(rows, cols))));
  return { width: cols * pxPerCell, height: rows * pxPerCell, pxPerCell };
}

/** The 2D-context calls this needs, so tests can pass a recorder. */
export type SlopeCanvas = Pick<
  CanvasRenderingContext2D,
  'createImageData' | 'putImageData' | 'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill'
> & { globalCompositeOperation: CanvasRenderingContext2D['globalCompositeOperation'] };

export function drawSlopeImage(
  ctx: SlopeCanvas,
  grid: ElevationGrid,
  field: SlopeField,
  polygon: TerrainPoint[],
  plan: ImagePlan,
  contourIntervalM: number | null,
): void {
  const image = ctx.createImageData(plan.width, plan.height);
  image.data.set(renderSlopePixels(grid, field, plan, contourIntervalM));
  ctx.putImageData(image, 0, 0);

  // Keep only what lies inside the drawn shape; the canvas smooths the cut edge.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  polygon.forEach((pt, k) => {
    const x = ((pt.lng - grid.west) / (grid.east - grid.west)) * plan.width;
    const y = ((grid.north - pt.lat) / (grid.north - grid.south)) * plan.height;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
