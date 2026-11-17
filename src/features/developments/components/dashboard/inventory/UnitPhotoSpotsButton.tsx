import React, { Suspense, lazy, useState } from 'react';
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
  floorplanUrl: string;
  gallery: UnitImage[];
  disabled?: boolean;
  /** The unit as the server returned it after placing. */
  onUnit: (unit: DashboardUnit) => void;
  onError: (message: string | null) => void;
}

/**
 * "Show buyers where each photo was taken": the listing form's callout and placer, so
 * buyers see where each unit photo was taken. Saves immediately.
 */
export const UnitPhotoSpotsButton: React.FC<UnitPhotoSpotsButtonProps> = ({ developmentId, unitId, floorplanUrl, gallery, disabled, onUnit, onError }) => {
  const { t } = useTranslation('developments');
  const notify = useNotification();
  const apiText = useApiErrorText();
  const { placeGalleryPhotos, isPlacingGalleryPhotos } = useUnitAdmin(developmentId);
  const [open, setOpen] = useState(false);
  const placed = placedCount(gallery);

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
      <PhotoSpotsCallout placed={placed} total={gallery.length} onStart={() => setOpen(true)} disabled={disabled} busy={isPlacingGalleryPhotos} />
      {open && (
        <Suspense fallback={null}>
          <FloorPlanPhotoPlacer
            floors={[{ url: floorplanUrl, label: t('inventory.floorplan.title', 'Floorplan') }]}
            photos={gallery.map((g) => ({ url: g.url, floorplanSpot: g.floorplanSpot }))}
            onSave={(spots) => void onSave(spots)}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};
