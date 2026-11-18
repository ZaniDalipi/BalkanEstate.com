import type { MapStyleType } from '../components/googleMapConstants';

/** The styles the desktop bar offers, in order. `hybrid` is set elsewhere. */
export const DESKTOP_MAP_STYLES = ['clean', 'color', 'street', 'satellite'] as const;
export type DesktopMapStyle = (typeof DESKTOP_MAP_STYLES)[number];

export const isDesktopMapStyle = (value: unknown): value is DesktopMapStyle =>
  typeof value === 'string' && (DESKTOP_MAP_STYLES as readonly string[]).includes(value);

/**
 * What picking a style does: the new style, and whether the drawn area must be
 * cleared (the Clean style shows no drawn shapes). `null` for an unknown style,
 * so a bad value never reaches the map.
 */
export function planStyleChange(
  next: unknown,
  hasDrawnArea: boolean,
): { style: MapStyleType; clearDrawnArea: boolean } | null {
  if (!isDesktopMapStyle(next)) return null;
  return { style: next, clearDrawnArea: next === 'clean' && hasDrawnArea };
}
