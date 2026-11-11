import { usePublicUnit } from '../../../../../hooks/useDevelopment';
import type { DevelopmentFloor, PublicUnit } from '../../../../../types';
import { unitPhotos } from '../unitGallery';
import type { FloorShotState } from './floorShotState';
import { showcaseMedia, type ShowcaseMedia } from './showcaseMedia';
import { useFloorShot } from './useFloorShot';

export interface Showcase {
  /** The open apartment: full details once loaded, the list row until then. */
  unit?: PublicUnit;
  /** What there is to show; null while its floor picture is on its way, or when there is nothing. */
  media: ShowcaseMedia | null;
  floor: FloorShotState;
  /** The showcase takes the stage (and the details float as a card beside it). */
  open: boolean;
}

interface ShowcaseOptions {
  /** Tablet and up: the showcase only exists there. */
  desktop: boolean;
  /** The residence's floors: which of them have a picture. */
  floors?: Pick<DevelopmentFloor, 'id' | 'hasViews'>[];
}

/**
 * What the showcase beside the apartment details shows: its plan, its floor's
 * picture, its photos. Shares the details sheet's and the explorer's queries.
 * A floor picture on its way is waited for, so the pictures arrive together
 * and in their order (the plan does not give way to the floor a moment later).
 */
export function useShowcase(slug: string, unitId: string | null, preview: PublicUnit | undefined, { desktop, floors }: ShowcaseOptions): Showcase {
  const { unit: full, listings } = usePublicUnit(slug, unitId ?? undefined);
  const unit = full ?? preview;
  const hasPicture = unit?.floorId ? floors?.find((f) => f.id === unit.floorId)?.hasViews : undefined;
  const floor = useFloorShot(slug, unit, { enabled: desktop, hasPicture });
  const primary = unit ? listings.find((l) => l.id === unit.primaryListingId) : undefined;
  const settled = floor.status !== 'loading';
  const media = desktop && unit && settled ? showcaseMedia(unit, unitPhotos(unit, primary), floor.status === 'ready' ? floor.shot : null) : null;
  return { unit, media, floor, open: !!media || floor.status === 'loading' || floor.status === 'failed' };
}
