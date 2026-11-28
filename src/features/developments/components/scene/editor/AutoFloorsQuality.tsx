import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { PlacementQuality } from '../../../utils/floorPerspective';

/** How the new floors will be positioned: measured per apartment column, partly, or estimated from one floor. */
export const AutoFloorsQuality: React.FC<{ quality: PlacementQuality }> = ({ quality }) => {
  const { t } = useTranslation('developments');
  const text =
    quality === 'measured'
      ? t('editor.autoFloors.qualityMeasured', 'Perspective measured for every apartment column from two drawn floors.')
      : quality === 'partial'
        ? t('editor.autoFloors.qualityPartial', 'Perspective measured for some columns only; the others are estimated. Draw the missing apartments on a second floor for a better result.')
        : t('editor.autoFloors.qualityEstimated', 'Only one floor is drawn, so the spacing is estimated. On a photo taken at an angle, draw one more floor first (for example Floor 2): each apartment column is then measured.');
  return (
    <p className={cn('rounded-lg p-2 text-xs leading-relaxed', quality === 'measured' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
      {text}
    </p>
  );
};
