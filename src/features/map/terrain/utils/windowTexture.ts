/**
 * The picture repeated along the walls of the buildings round the plot: one
 * window bay of one storey (BAY_M × STOREY_M), a window with its frame and
 * sill on white plaster, so the wall's own colour tints the plaster. Bottom
 * of the picture is the floor. null where the browser has no 2D canvas.
 */
import * as THREE from 'three';
import { BAY_M, STOREY_M } from './buildingsMesh';

const PX_PER_M = 48;
/** Window, metres from the bay's left and from the floor. */
const WINDOW = { x: 1.0, sill: 0.95, width: 1.2, height: 1.4 };

export function createWindowTexture(anisotropy: number): THREE.Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(BAY_M * PX_PER_M);
  canvas.height = Math.round(STOREY_M * PX_PER_M);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const m = (v: number) => v * PX_PER_M;
  const top = canvas.height - m(WINDOW.sill + WINDOW.height);

  // Plaster, a shade darker under the eaves of each storey.
  const plaster = ctx.createLinearGradient(0, 0, 0, canvas.height);
  plaster.addColorStop(0, '#e9e9e9');
  plaster.addColorStop(0.12, '#ffffff');
  plaster.addColorStop(1, '#f7f7f7');
  ctx.fillStyle = plaster;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Frame, glass with a little sky in it, the glazing bar, the sill.
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(m(WINDOW.x - 0.08), top - m(0.08), m(WINDOW.width + 0.16), m(WINDOW.height + 0.16));
  const glass = ctx.createLinearGradient(0, top, 0, top + m(WINDOW.height));
  glass.addColorStop(0, '#5d7083');
  glass.addColorStop(1, '#2c3743');
  ctx.fillStyle = glass;
  ctx.fillRect(m(WINDOW.x), top, m(WINDOW.width), m(WINDOW.height));
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(m(WINDOW.x + WINDOW.width / 2) - 2, top, 4, m(WINDOW.height));
  ctx.fillStyle = '#bdb7ad';
  ctx.fillRect(m(WINDOW.x - 0.15), top + m(WINDOW.height + 0.08), m(WINDOW.width + 0.3), m(0.07));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}
