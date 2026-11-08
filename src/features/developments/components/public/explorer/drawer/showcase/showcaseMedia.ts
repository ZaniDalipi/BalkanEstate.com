import type { PublicUnit } from '../../../../../types';

/** What the showcase beside the apartment details shows: its floor plan as a model, else its photos. */
export type ShowcaseMedia =
  | { kind: 'plan'; url: string; ratio: number }
  | { kind: 'photos'; urls: string[] };

/** At most this many photos get a thumbnail under the showcase. */
export const SHOWCASE_PHOTOS = 8;

/**
 * Pick what to put on show for an apartment: whatever the developer posted,
 * best first — the floor plan (it becomes the 3D model), else the photos
 * (`photos` as `unitGallery` orders them). Null when there is nothing.
 */
export function showcaseMedia(unit: Pick<PublicUnit, 'floorplan'>, photos: string[]): ShowcaseMedia | null {
  const plan = unit.floorplan;
  if (plan?.url) return { kind: 'plan', url: plan.url, ratio: plan.width && plan.height ? plan.width / plan.height : 4 / 3 };
  const urls = photos.filter(Boolean).slice(0, SHOWCASE_PHOTOS);
  return urls.length ? { kind: 'photos', urls } : null;
}
