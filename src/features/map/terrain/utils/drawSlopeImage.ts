/**
 * Paint the slope map for a drawn area: one coloured square per grid cell,
 * a white line wherever the slope band changes, all cut to the drawn shape.
 * The picture is laid over the map as a ground overlay covering the grid.
 */
import type { ElevationGrid, SlopeField, TerrainPoint } from '../types';
import { SLOPE_CLASSES, slopeClassIndex } from './slopeClasses';

/** Longest side of the picture, in pixels: sharp at any zoom, small in memory. */
export const MAX_IMAGE_PX = 2048;
const FILL_ALPHA = 0.6;
const EDGE_COLOR = 'rgba(255, 255, 255, 0.75)';

export interface ImagePlan {
  width: number;
  height: number;
  pxPerCell: number;
}

export function planSlopeImage(rows: number, cols: number, maxPx = MAX_IMAGE_PX): ImagePlan {
  const pxPerCell = Math.max(1, Math.min(24, Math.floor(maxPx / Math.max(rows, cols))));
  return { width: cols * pxPerCell, height: rows * pxPerCell, pxPerCell };
}

/** The 2D-context calls this needs, so tests can pass a recorder. */
export type SlopeCanvas = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'clip' | 'fillRect' | 'stroke' | 'save' | 'restore'
> & { fillStyle: CanvasRenderingContext2D['fillStyle']; strokeStyle: CanvasRenderingContext2D['strokeStyle']; lineWidth: number; globalAlpha: number };

export function drawSlopeImage(
  ctx: SlopeCanvas,
  grid: ElevationGrid,
  field: SlopeField,
  polygon: TerrainPoint[],
  plan: ImagePlan,
): void {
  const { rows, cols } = grid;
  const p = plan.pxPerCell;
  const band = (i: number): number => (Number.isNaN(field.slope[i]) ? -1 : slopeClassIndex(field.slope[i]));

  ctx.save();
  ctx.beginPath();
  polygon.forEach((pt, k) => {
    const x = ((pt.lng - grid.west) / (grid.east - grid.west)) * plan.width;
    const y = ((grid.north - pt.lat) / (grid.north - grid.south)) * plan.height;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();

  ctx.globalAlpha = FILL_ALPHA;
  for (let i = 0; i < rows * cols; i++) {
    const b = band(i);
    if (b < 0) continue;
    ctx.fillStyle = SLOPE_CLASSES[b].color;
    ctx.fillRect((i % cols) * p, Math.floor(i / cols) * p, p, p);
  }

  // Outline the bands where they meet (only when cells are big enough to see it).
  if (p >= 4) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = EDGE_COLOR;
    ctx.lineWidth = Math.max(1, Math.round(p / 10));
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c + 1 < cols && band(i) !== band(i + 1)) { ctx.moveTo((c + 1) * p, r * p); ctx.lineTo((c + 1) * p, (r + 1) * p); }
        if (r + 1 < rows && band(i) !== band(i + cols)) { ctx.moveTo(c * p, (r + 1) * p); ctx.lineTo((c + 1) * p, (r + 1) * p); }
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}
