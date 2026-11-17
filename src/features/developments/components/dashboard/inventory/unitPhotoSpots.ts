import type { UnitImage, UnitPhotoSpot, UnitPhotoSpotChange } from '../../../types';

const sameSpot = (a?: UnitPhotoSpot, b?: UnitPhotoSpot) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.angle === b.angle);

/**
 * The spot changes to send after the floor-plan placer: one per photo whose
 * spot was added, moved, turned or removed, named by URL. `spots` is
 * index-aligned with `gallery` (undefined = not on the plan).
 */
export const gallerySpotChanges = (
  gallery: readonly UnitImage[],
  spots: readonly ({ x: number; y: number; angle: number } | undefined)[]
): UnitPhotoSpotChange[] =>
  gallery.flatMap((img, i) => {
    const next = spots[i] ? { x: spots[i]!.x, y: spots[i]!.y, angle: spots[i]!.angle } : undefined;
    return sameSpot(img.floorplanSpot, next) ? [] : [{ url: img.url, spot: next ?? null }];
  });

/** How many gallery photos are on the floor plan. */
export const placedCount = (gallery: readonly UnitImage[]): number => gallery.filter((g) => !!g.floorplanSpot).length;
