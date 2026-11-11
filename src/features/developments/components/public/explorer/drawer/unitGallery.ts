import type { LinkedListing, PublicUnit } from '../../../../types';

/**
 * The photos to show for a unit: its own gallery first; failing that, the
 * PRIMARY listing's photos (not just any listing's); failing that, that
 * listing's cover image. Empty arrays fall through (the old `?? ` chain
 * never did, so a listing with `images: []` hid its cover).
 */
export function unitGallery(unit: Pick<PublicUnit, 'gallery'>, primary?: LinkedListing): string[] {
  return unitPhotos(unit, primary).map((p) => p.url);
}

/** A photo of a unit with its room tag, when the listing tagged it (living_room, kitchen, …). */
export interface UnitPhoto {
  url: string;
  tag?: string;
}

/** {@link unitGallery} with each photo's room tag, so the showcase can label it. */
export function unitPhotos(unit: Pick<PublicUnit, 'gallery'>, primary?: LinkedListing): UnitPhoto[] {
  const own = (unit.gallery ?? []).filter((g) => !!g.url).map((g) => ({ url: g.url }));
  if (own.length) return own;
  const listing = (primary?.images ?? []).filter((i) => !!i.url).map((i) => (i.tag ? { url: i.url, tag: i.tag } : { url: i.url }));
  if (listing.length) return listing;
  return primary?.imageUrl ? [{ url: primary.imageUrl }] : [];
}

/** Whether the unit has a photo or a plan to lead its details with. */
export const hasUnitMedia = (unit: Pick<PublicUnit, 'gallery' | 'floorplan'>, primary?: LinkedListing): boolean =>
  !!unit.floorplan?.url || unitPhotos(unit, primary).length > 0;
