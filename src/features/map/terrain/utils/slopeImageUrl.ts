/**
 * The slope picture for an analysis as an object URL, for the 2D ground
 * overlay and the 3D view alike. The caller revokes it when done.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { drawSlopeImage, planSlopeImage } from './drawSlopeImage';

export function createSlopeImageUrl(analysis: TerrainAnalysis, polygon: TerrainPoint[]): Promise<string | null> {
  const { grid, field } = analysis;
  const plan = planSlopeImage(grid.rows, grid.cols);
  const canvas = document.createElement('canvas');
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  drawSlopeImage(ctx, grid, field, polygon, plan);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
  });
}
