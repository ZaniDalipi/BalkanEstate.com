import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { UnitPhoto } from '../unitGallery';
import { photoLabels } from './photoLabels';

const humanize = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, ' ');

/** Each showcase photo's label, in the reader's language (room names come from the listing photo categories). */
export function usePhotoLabels(photos: UnitPhoto[]): string[] {
  const { t } = useTranslation(['developments', 'property']);
  return useMemo(
    () =>
      photoLabels(
        photos,
        (tag) => t(`property:photos.categories.${tag}`, { defaultValue: humanize(tag) }),
        (n) => `${t('explorer.drawer.photo', 'Photo')} ${n}`
      ),
    [photos, t]
  );
}
