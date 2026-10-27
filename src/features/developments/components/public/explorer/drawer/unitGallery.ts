import type { LinkedListing, PublicUnit } from '../../../../types';

/**
 * The photos to show for a unit: its own gallery first; failing that, the
 * PRIMARY listing's photos (not just any listing's); failing that, that
 * listing's cover image. Empty arrays fall through (the old `?? ` chain
 * never did, so a listing with `images: []` hid its cover).
 */
export function unitGallery(unit: Pick<PublicUnit, 'gallery'>, primary?: LinkedListing): string[] {
  const own = (unit.gallery ?? []).map((g) => g.url).filter(Boolean);
  if (own.length) return own;
  const listing = (primary?.images ?? []).map((i) => i.url).filter(Boolean);
  if (listing.length) return listing;
  return primary?.imageUrl ? [primary.imageUrl] : [];
}
