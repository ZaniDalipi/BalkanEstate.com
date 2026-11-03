import type { Development } from '../types';

/** Every photo of a residence for the viewer: the cover first, then the gallery in the owner's order, no repeats. */
export const residencePhotos = (d: Pick<Development, 'coverImage' | 'gallery'>): string[] => {
  const all = [d.coverImage, ...(d.gallery ?? []).map((p) => p.url)].filter((u): u is string => !!u);
  return [...new Set(all)];
};

/** The gallery's URLs with the photo at `from` moved to `to` (clamped), for reordering. */
export const movePhoto = (urls: string[], from: number, to: number): string[] => {
  const target = Math.max(0, Math.min(urls.length - 1, to));
  if (from < 0 || from >= urls.length || from === target) return urls;
  const next = [...urls];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
};
