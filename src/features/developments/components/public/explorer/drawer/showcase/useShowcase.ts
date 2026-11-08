import { usePublicUnit } from '../../../../../hooks/useDevelopment';
import type { PublicUnit } from '../../../../../types';
import { unitPhotos } from '../unitGallery';
import { showcaseMedia } from './showcaseMedia';

/**
 * The open apartment (full details once loaded, the list row until then) and,
 * on desktop, what its showcase shows. Shares the details sheet's query.
 */
export function useShowcase(slug: string, unitId: string | null, preview: PublicUnit | undefined, desktop: boolean) {
  const { unit: full, listings } = usePublicUnit(slug, unitId ?? undefined);
  const unit = full ?? preview;
  const primary = unit ? listings.find((l) => l.id === unit.primaryListingId) : undefined;
  const media = desktop && unit ? showcaseMedia(unit, unitPhotos(unit, primary)) : null;
  return { unit, media };
}
