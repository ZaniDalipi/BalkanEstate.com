/**
 * How much of each side of the map is hidden behind controls floating over it
 * (the search bar, the style/tool bars). Used to frame a drawn area in the part
 * of the map you can actually see, not under the toolbars.
 *
 * Overlays opt in with the `data-map-overlay` attribute.
 */
import type { Insets } from './clusterCamera';

export interface Box { top: number; right: number; bottom: number; left: number }

/** Room always kept around the framed area, on top of any overlay. */
export const FRAME_PADDING = 32;

/** No side may take more than this share of the map, so the area never collapses. */
const MAX_SHARE = 0.35;

/**
 * Insets for `map` given the boxes of the overlays drawn on it (all in the same
 * screen coordinates). An overlay taller than it is wide (a column of buttons)
 * clears the side it sits on; a bar clears the top or bottom, whichever half it
 * sits in.
 */
export function overlayInsets(map: Box, overlays: Box[], padding = FRAME_PADDING): Insets {
  const width = map.right - map.left;
  const height = map.bottom - map.top;
  const midX = map.left + width / 2;
  const midY = map.top + height / 2;
  const used: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

  for (const o of overlays) {
    const clip = {
      top: Math.max(o.top, map.top),
      bottom: Math.min(o.bottom, map.bottom),
      left: Math.max(o.left, map.left),
      right: Math.min(o.right, map.right),
    };
    if (clip.bottom <= clip.top || clip.right <= clip.left) continue; // not over the map

    if (clip.bottom - clip.top > clip.right - clip.left) {
      if ((clip.left + clip.right) / 2 < midX) used.left = Math.max(used.left, clip.right - map.left);
      else used.right = Math.max(used.right, map.right - clip.left);
    } else if ((clip.top + clip.bottom) / 2 < midY) {
      used.top = Math.max(used.top, clip.bottom - map.top);
    } else {
      used.bottom = Math.max(used.bottom, map.bottom - clip.top);
    }
  }

  const cap = (value: number, size: number) => Math.min(value + padding, size * MAX_SHARE);
  return {
    top: cap(used.top, height),
    bottom: cap(used.bottom, height),
    left: cap(used.left, width),
    right: cap(used.right, width),
  };
}

/** Reads the visible `data-map-overlay` elements on the page and measures them against `mapDiv`. */
export function measureOverlayInsets(mapDiv: HTMLElement): Insets {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('[data-map-overlay]'))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  return overlayInsets(mapDiv.getBoundingClientRect(), overlays);
}
