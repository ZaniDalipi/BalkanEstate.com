/**
 * A soft shadow on the ground around the house in the 3D view, so it sits on
 * the land instead of floating over it: a dark blur, strongest under the
 * walls. Laid on the relief like the slope picture.
 */
import type { BuildSpot } from '../types';
import { HOUSE, houseAxis, rectangleAround } from './house';

const SIZE_PX = 128;
/** The shadow reaches this far past the walls, metres. */
const REACH_M = 5;

export function createHouseShadowUrl(): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE_PX;
  canvas.height = SIZE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  const half = SIZE_PX / 2;
  const fade = ctx.createRadialGradient(half, half, half * 0.35, half, half, half);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, SIZE_PX, SIZE_PX);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png'));
}

/** Where the shadow lies: the house's footprint grown by its reach, as [lng, lat] corners for MapLibre. */
export function houseShadowCorners(spot: BuildSpot): [[number, number], [number, number], [number, number], [number, number]] {
  const [a, b, c, d] = rectangleAround(spot, houseAxis(spot), HOUSE.lengthM + 2 * REACH_M, HOUSE.widthM + 2 * REACH_M);
  return [[a.lng, a.lat], [b.lng, b.lat], [c.lng, c.lat], [d.lng, d.lat]];
}
