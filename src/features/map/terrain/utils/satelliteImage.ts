/**
 * The satellite photo of a box, stitched from Esri's World Imagery tiles
 * (the imagery the business map uses) onto one canvas, for the top of the 3D
 * model. Rejects if any tile can't be loaded, so the model keeps its slope
 * colours instead of showing a patchwork.
 */
import type { GridBounds } from '../types';
import { SATELLITE_MAX_ZOOM, SATELLITE_TILES } from './terrain3dScene';

const TILE = 256;
const MAX_PX = 2048;
const TIMEOUT_MS = 12000;

const worldX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const worldY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

/** The sharpest zoom whose pixels still fit the box within MAX_PX (and that Esri has everywhere). */
export function satelliteZoom(b: GridBounds): number {
  for (let z = SATELLITE_MAX_ZOOM; z > 1; z--) {
    if (Math.max(worldX(b.east, z) - worldX(b.west, z), worldY(b.south, z) - worldY(b.north, z)) <= MAX_PX) return z;
  }
  return 1;
}

function loadTile(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`tile ${url}`));
    img.src = url;
  });
}

export async function loadSatelliteImage(b: GridBounds): Promise<HTMLCanvasElement> {
  const z = satelliteZoom(b);
  const x0 = worldX(b.west, z);
  const y0 = worldY(b.north, z);
  const width = Math.max(1, Math.round(worldX(b.east, z) - x0));
  const height = Math.max(1, Math.round(worldY(b.south, z) - y0));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');

  const jobs: Array<Promise<void>> = [];
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + height) / TILE); ty++) {
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + width) / TILE); tx++) {
      const url = SATELLITE_TILES.replace('{z}', String(z)).replace('{x}', String(tx)).replace('{y}', String(ty));
      jobs.push(loadTile(url).then((img) => { ctx.drawImage(img, tx * TILE - x0, ty * TILE - y0); }));
    }
  }
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS); });
  try {
    await Promise.race([Promise.all(jobs), timeout]);
  } finally {
    window.clearTimeout(timer);
  }
  return canvas;
}
