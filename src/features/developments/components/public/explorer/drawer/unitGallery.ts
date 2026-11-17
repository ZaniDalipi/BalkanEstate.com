import type { PropertyImage } from '@/types';
import type { LinkedListing, PublicUnit, UnitPhotoSpot } from '../../../../types';

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
  /** Where on the unit's floor plan the developer placed this photo. */
  floorplanSpot?: UnitPhotoSpot;
}

/** {@link unitGallery} with each photo's room tag, so the showcase can label it. */
export function unitPhotos(unit: Pick<PublicUnit, 'gallery'>, primary?: LinkedListing): UnitPhoto[] {
  const own = (unit.gallery ?? []).filter((g) => !!g.url).map((g) => (g.floorplanSpot ? { url: g.url, floorplanSpot: g.floorplanSpot } : { url: g.url }));
  if (own.length) return own;
  const listing = (primary?.images ?? []).filter((i) => !!i.url).map((i) => (i.tag ? { url: i.url, tag: i.tag } : { url: i.url }));
  if (listing.length) return listing;
  return primary?.imageUrl ? [{ url: primary.imageUrl }] : [];
}

/** Whether the unit has a photo or a plan to lead its details with. */
export const hasUnitMedia = (unit: Pick<PublicUnit, 'gallery' | 'floorplan'>, primary?: LinkedListing): boolean =>
  !!unit.floorplan?.url || unitPhotos(unit, primary).length > 0;

/**
 * The photos for the floor-plan viewer, when the developer placed any of them
 * on the plan (the viewer then shows a camera per photo); otherwise undefined.
 */
export const planViewerPhotos = (photos: readonly UnitPhoto[]): PropertyImage[] | undefined =>
  photos.some((p) => p.floorplanSpot)
    ? photos.map((p) => ({ url: p.url, tag: 'other', ...(p.floorplanSpot ? { floorplanSpot: p.floorplanSpot } : {}) }))
    : undefined;
