/**
 * Paint the slope map for a drawn area, cut to the drawn shape, so the grid
 * reads as raised 3D tiles:
 *  - one square per grid cell in its slope shade, lit from the north-west so
 *    the relief shows (slopeBands, hillshade);
 *  - a bevel on every cell (light top-left edge, dark bottom-right edge);
 *  - a soft shadow where the ground steps down from the north or west, as
 *    deep as the step is tall;
 *  - a white line where the shade changes, like contour steps.
 * The picture is laid over the map (and draped on the 3D view) covering the grid.
 */
import type { ElevationGrid, SlopeField, TerrainPoint } from '../types';
import { cellSpacingM } from './gridGeometry';
import { shadeColor, shadeFactor } from './hillshade';
import { SLOPE_BANDS, slopeBandIndex } from './slopeBands';

/** Longest side of the picture, in pixels: sharp at any zoom, small in memory. */
export const MAX_IMAGE_PX = 2048;
/** Up to this many pixels per cell, so lines stay crisp on small plots seen close up. */
const MAX_PX_PER_CELL = 64;
const FILL_ALPHA = 0.8;
const BEVEL_LIGHT = 'rgba(255, 255, 255, 0.45)';
const BEVEL_DARK = 'rgba(0, 0, 0, 0.22)';
const STEP_SHADOW = 'rgba(0, 0, 0, 0.2)';
/** Shadow depth per unit of step steepness (step height ÷ cell size), in cells. */
const STEP_SHADOW_SCALE = 4;
const BAND_LINE = 'rgba(255, 255, 255, 0.95)';

export interface ImagePlan {
  width: number;
  height: number;
  pxPerCell: number;
}

export function planSlopeImage(rows: number, cols: number, maxPx = MAX_IMAGE_PX): ImagePlan {
  const pxPerCell = Math.max(1, Math.min(MAX_PX_PER_CELL, Math.floor(maxPx / Math.max(rows, cols))));
  return { width: cols * pxPerCell, height: rows * pxPerCell, pxPerCell };
}

/** The 2D-context calls this needs, so tests can pass a recorder. */
export type SlopeCanvas = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'clip' | 'fillRect' | 'stroke' | 'save' | 'restore'
> & { fillStyle: CanvasRenderingContext2D['fillStyle']; strokeStyle: CanvasRenderingContext2D['strokeStyle']; lineWidth: number; globalAlpha: number };

function clipToPolygon(ctx: SlopeCanvas, grid: ElevationGrid, polygon: TerrainPoint[], plan: ImagePlan): void {
  ctx.beginPath();
  polygon.forEach((pt, k) => {
    const x = ((pt.lng - grid.west) / (grid.east - grid.west)) * plan.width;
    const y = ((grid.north - pt.lat) / (grid.north - grid.south)) * plan.height;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
}

/** Lines between cells where `differ(a, b)` holds for the cells either side. */
function strokeEdges(ctx: SlopeCanvas, rows: number, cols: number, p: number, differ: (a: number, b: number) => boolean): void {
  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c + 1 < cols && differ(i, i + 1)) { ctx.moveTo((c + 1) * p, r * p); ctx.lineTo((c + 1) * p, (r + 1) * p); }
      if (r + 1 < rows && differ(i, i + cols)) { ctx.moveTo(c * p, (r + 1) * p); ctx.lineTo((c + 1) * p, (r + 1) * p); }
    }
  }
  ctx.stroke();
}

/** Light top-left and dark bottom-right inner edges on every painted cell: raised tiles. */
function drawBevels(ctx: SlopeCanvas, rows: number, cols: number, p: number, painted: (i: number) => boolean): void {
  const w = Math.max(1, p / 14);
  const half = w / 2;
  ctx.lineWidth = w;
  const pass = (color: string, edges: (x: number, y: number) => void) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < rows * cols; i++) if (painted(i)) edges((i % cols) * p, Math.floor(i / cols) * p);
    ctx.stroke();
  };
  pass(BEVEL_LIGHT, (x, y) => { ctx.moveTo(x + half, y + p); ctx.lineTo(x + half, y + half); ctx.lineTo(x + p, y + half); });
  pass(BEVEL_DARK, (x, y) => { ctx.moveTo(x + p - half, y); ctx.lineTo(x + p - half, y + p - half); ctx.lineTo(x, y + p - half); });
}

/** Shadow strips inside cells that sit lower than their north or west neighbour. */
function drawStepShadows(ctx: SlopeCanvas, grid: ElevationGrid, p: number, painted: (i: number) => boolean): void {
  const { rows, cols, elevations } = grid;
  const { dx, dy } = cellSpacingM(grid);
  const depth = (higher: number | null, lower: number | null, cellM: number): number => {
    if (higher === null || lower === null || higher <= lower) return 0;
    return Math.min(p * 0.5, ((higher - lower) / cellM) * p * STEP_SHADOW_SCALE);
  };
  ctx.fillStyle = STEP_SHADOW;
  for (let i = 0; i < rows * cols; i++) {
    if (!painted(i)) continue;
    const x = (i % cols) * p;
    const y = Math.floor(i / cols) * p;
    const fromNorth = i >= cols ? depth(elevations[i - cols], elevations[i], dy) : 0;
    const fromWest = i % cols > 0 ? depth(elevations[i - 1], elevations[i], dx) : 0;
    if (fromNorth >= 0.5) ctx.fillRect(x, y, p, fromNorth);
    if (fromWest >= 0.5) ctx.fillRect(x, y, fromWest, p);
  }
}

export function drawSlopeImage(
  ctx: SlopeCanvas,
  grid: ElevationGrid,
  field: SlopeField,
  polygon: TerrainPoint[],
  plan: ImagePlan,
): void {
  const { rows, cols } = grid;
  const p = plan.pxPerCell;
  const band = (i: number): number => (Number.isNaN(field.slope[i]) ? -1 : slopeBandIndex(field.slope[i]));
  const painted = (i: number): boolean => band(i) >= 0;

  ctx.save();
  clipToPolygon(ctx, grid, polygon, plan);

  ctx.globalAlpha = FILL_ALPHA;
  for (let i = 0; i < rows * cols; i++) {
    const b = band(i);
    if (b < 0) continue;
    ctx.fillStyle = shadeColor(SLOPE_BANDS[b].color, shadeFactor(field.gradEast[i], field.gradNorth[i]));
    ctx.fillRect((i % cols) * p, Math.floor(i / cols) * p, p, p);
  }

  ctx.globalAlpha = 1;
  // Depth details only when cells are big enough to show them.
  if (p >= 6) {
    drawStepShadows(ctx, grid, p, painted);
    drawBevels(ctx, rows, cols, p, painted);
  }
  if (p >= 4) {
    ctx.strokeStyle = BAND_LINE;
    ctx.lineWidth = Math.max(1, p / 12);
    strokeEdges(ctx, rows, cols, p, (a, b) => band(a) !== band(b));
  }
  ctx.restore();
}
