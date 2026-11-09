import type { PublicUnit } from '../../../../../types';
import type { UnitPhoto } from '../unitGallery';
import type { FloorShot } from './floorShot';

/**
 * What the showcase beside the apartment details can show — whatever the
 * developer posted: the apartment's own floor plan (it becomes the 3D model),
 * the apartment on its floor's picture, and its photos.
 */
export interface ShowcaseMedia {
  plan?: { url: string; ratio: number };
  floor?: FloorShot;
  photos?: UnitPhoto[];
}

export type ShowcaseMode = 'plan' | 'floor' | 'photos';

/** Most telling first: the apartment's own plan, then where it sits on its floor, then its photos. */
const ORDER: ShowcaseMode[] = ['plan', 'floor', 'photos'];

/** At most this many photos get a thumbnail under the showcase. */
export const SHOWCASE_PHOTOS = 8;

/**
 * Gather what there is to show for an apartment (`photos` as `unitPhotos`
 * orders them, `floor` from its floor's pictures). Null when there is nothing.
 */
export function showcaseMedia(unit: Pick<PublicUnit, 'floorplan'>, photos: UnitPhoto[], floor?: FloorShot | null): ShowcaseMedia | null {
  const media: ShowcaseMedia = {};
  const plan = unit.floorplan;
  if (plan?.url) media.plan = { url: plan.url, ratio: plan.width && plan.height ? plan.width / plan.height : 4 / 3 };
  if (floor) media.floor = floor;
  const shown = photos.filter((p) => !!p.url).slice(0, SHOWCASE_PHOTOS);
  if (shown.length) media.photos = shown;
  return showcaseModes(media).length ? media : null;
}

/** The ways to show this apartment, most telling first. */
export const showcaseModes = (media: ShowcaseMedia): ShowcaseMode[] => ORDER.filter((mode) => !!media[mode]);
