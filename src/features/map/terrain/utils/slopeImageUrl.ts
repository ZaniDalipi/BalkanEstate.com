/**
 * The slope picture for an analysis, as an object URL for the 2D ground
 * overlay and the 3D view. Painted once per analysis and shared; each caller
 * gets (and later revokes) its own URL.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { drawSlopeImage, planSlopeImage } from './drawSlopeImage';

const pictures = new WeakMap<TerrainAnalysis, Promise<Blob | null>>();

function paint(analysis: TerrainAnalysis, polygon: TerrainPoint[]): Promise<Blob | null> {
  const { grid, field } = analysis;
  const plan = planSlopeImage(grid.rows, grid.cols);
  const canvas = document.createElement('canvas');
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  drawSlopeImage(ctx, grid, field, polygon, plan, analysis.contourIntervalM);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function createSlopeImageUrl(analysis: TerrainAnalysis, polygon: TerrainPoint[]): Promise<string | null> {
  let picture = pictures.get(analysis);
  if (!picture) {
    picture = paint(analysis, polygon);
    pictures.set(analysis, picture);
  }
  const blob = await picture;
  return blob ? URL.createObjectURL(blob) : null;
}
