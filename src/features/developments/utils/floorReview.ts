/**
 * Automatically placed regions are a first guess on an angled photo; each must be
 * checked by the owner. A region counts as checked once it was moved or
 * reshaped, or marked as right. Pure function, so the rule is tested on its own.
 */
import type { Hotspot } from '../types';

/**
 * Ids of the placed regions still on the view that are unchecked, in drawing
 * order (lowest floor first). `placed` maps each placed id to its points as
 * placed (JSON).
 */
export function pendingReview(hotspots: Hotspot[], placed: ReadonlyMap<string, string>, checked: ReadonlySet<string>): string[] {
  return hotspots
    .filter((h) => placed.get(h.id) === JSON.stringify(h.points) && !checked.has(h.id))
    .map((h) => h.id);
}
