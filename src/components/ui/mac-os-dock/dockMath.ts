/**
 * Pure maths for the macOS-style dock: responsive sizing, the cosine
 * magnification curve and where each icon sits. No React, so it is unit-tested
 * without rendering.
 */

export interface DockConfig {
  baseIconSize: number;
  maxScale: number;
  effectWidth: number;
}

export const MIN_SCALE = 1;
/** Touch targets stay at least this big (CLAUDE.md: 44px). */
export const MIN_TOUCH_SIZE = 44;

const FALLBACK_CONFIG: DockConfig = { baseIconSize: 64, maxScale: 1.6, effectWidth: 240 };

/** Icon size and magnification for the smaller side of the viewport. */
export function getDockConfig(width: number, height: number): DockConfig {
  const side = Math.min(width, height);
  if (!Number.isFinite(side) || side <= 0) return FALLBACK_CONFIG;
  if (side < 480) {
    return { baseIconSize: Math.max(MIN_TOUCH_SIZE, side * 0.08), maxScale: 1.4, effectWidth: side * 0.4 };
  }
  if (side < 768) {
    return { baseIconSize: Math.max(48, side * 0.07), maxScale: 1.5, effectWidth: side * 0.35 };
  }
  if (side < 1024) {
    return { baseIconSize: Math.max(56, side * 0.06), maxScale: 1.6, effectWidth: side * 0.3 };
  }
  return { baseIconSize: Math.max(64, Math.min(80, side * 0.05)), maxScale: 1.8, effectWidth: 300 };
}

export const dockSpacing = (iconSize: number): number => Math.max(4, iconSize * 0.08);
export const dockPadding = (iconSize: number): number => Math.max(8, iconSize * 0.12);

/** Scale of each icon when the pointer is at `mouseX` (null = pointer away). */
export function getTargetScales(mouseX: number | null, count: number, cfg: DockConfig): number[] {
  if (mouseX === null) return Array.from({ length: count }, () => MIN_SCALE);
  const { baseIconSize, maxScale, effectWidth } = cfg;
  const step = baseIconSize + dockSpacing(baseIconSize);
  const minX = mouseX - effectWidth / 2;
  return Array.from({ length: count }, (_, i) => {
    const centre = i * step + baseIconSize / 2;
    if (centre < minX || centre > minX + effectWidth) return MIN_SCALE;
    const theta = ((centre - minX) / effectWidth) * 2 * Math.PI;
    const factor = (1 - Math.cos(theta)) / 2;
    return MIN_SCALE + factor * (maxScale - MIN_SCALE);
  });
}

/** Centre x of every icon, laid side by side at the given scales. */
export function getPositions(scales: number[], iconSize: number): number[] {
  const gap = dockSpacing(iconSize);
  let x = 0;
  return scales.map((scale) => {
    const width = iconSize * scale;
    const centre = x + width / 2;
    x += width + gap;
    return centre;
  });
}

/** Width of the icon row for the given scales and positions. */
export function getContentWidth(scales: number[], positions: number[], iconSize: number): number {
  if (positions.length === 0) return 0;
  return Math.max(...positions.map((p, i) => p + (iconSize * scales[i]) / 2));
}

export const lerp = (from: number, to: number, factor: number): number => from + (to - from) * factor;

/** True while any value is still visibly short of its target. */
export function isSettled(current: number[], target: number[], tolerance: number): boolean {
  return current.every((v, i) => Math.abs(v - target[i]) <= tolerance);
}
