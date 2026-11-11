import type { UnitPhoto } from '../unitGallery';

/**
 * A label for each photo of the showcase: the room it shows (from the
 * listing's tag), numbered when several share one ("Bedroom 1", "Bedroom 2"),
 * else "Photo 3". `roomName` names a tag; `photoName` names photo n (1-based).
 */
export function photoLabels(photos: UnitPhoto[], roomName: (tag: string) => string, photoName: (n: number) => string): string[] {
  const named = (p: UnitPhoto) => (p.tag && p.tag !== 'other' ? p.tag : null);
  const total = new Map<string, number>();
  for (const p of photos) {
    const tag = named(p);
    if (tag) total.set(tag, (total.get(tag) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return photos.map((p, i) => {
    const tag = named(p);
    if (!tag) return photoName(i + 1);
    const n = (seen.get(tag) ?? 0) + 1;
    seen.set(tag, n);
    return (total.get(tag) ?? 0) > 1 ? `${roomName(tag)} ${n}` : roomName(tag);
  });
}
