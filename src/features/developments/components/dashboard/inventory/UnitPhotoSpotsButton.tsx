import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoSpotsCallout } from '@/src/components/property/PhotoSpotsCallout';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import type { DashboardUnit, UnitImage } from '../../../types';
import { gallerySpotChanges, placedCount } from './unitPhotoSpots';

const FloorPlanPhotoPlacer = lazy(() => import('@/src/features/seller/components/FloorPlanPhotoPlacer'));

interface UnitPhotoSpotsButtonProps {
  developmentId: string;
  unitId: string;
  gallery: UnitImage[];
  /** The plan the placer is open on; null = closed. */
  planUrl: string | null;
  onStart: () => void;
  onClose: () => void;
  disabled?: boolean;
  /** Getting ready (uploading the plan). */
  preparing?: boolean;
  /** The unit as the server returned it after placing. */
  onUnit: (unit: DashboardUnit) => void;
  onError: (message: string | null) => void;
}

/**
 * "Show buyers where each photo was taken": the listing form's callout and
 * placer, for a unit's gallery. Saves the spots immediately.
 */
export const UnitPhotoSpotsButton: React.FC<UnitPhotoSpotsButtonProps> = ({ developmentId, unitId, gallery, planUrl, onStart, onClose, disabled, preparing, onUnit, onError }) => {
  const { t } = useTranslation('developments');
  const notify = useNotification();
  const apiText = useApiErrorText();
  const { placeGalleryPhotos, isPlacingGalleryPhotos } = useUnitAdmin(developmentId);

  const onSave = async (spots: ({ x: number; y: number; angle: number } | undefined)[]) => {
    const changes = gallerySpotChanges(gallery, spots);
    if (changes.length === 0) return;
    onError(null);
    try {
      const { unit } = await placeGalleryPhotos({ unitId, spots: changes });
      onUnit(unit);
      void notify.success(
        t('inventory.gallery.spotsSavedTitle', 'Photos placed'),
        t('inventory.gallery.spotsSaved', 'Buyers now see where each photo was taken on the floor plan.')
      );
    } catch (err) {
      onError(apiText.text(err));
    }
  };

  return (
    <>
      <PhotoSpotsCallout placed={placedCount(gallery)} total={gallery.length} onStart={onStart} disabled={disabled} busy={isPlacingGalleryPhotos || preparing} />
      {planUrl && gallery.length > 0 && (
        <Suspense fallback={null}>
          <FloorPlanPhotoPlacer
            floors={[{ url: planUrl, label: t('inventory.floorplan.title', 'Floorplan') }]}
            photos={gallery.map((g) => ({ url: g.url, floorplanSpot: g.floorplanSpot }))}
            onSave={(spots) => void onSave(spots)}
            onClose={onClose}
          />
        </Suspense>
      )}
    </>
  );
};
