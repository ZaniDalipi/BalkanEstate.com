import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorNames } from '../../../utils/inventoryNaming';

/** Floor names ("Floor 4", "Ground floor", "Basement 1") in the current language. */
export const useFloorNames = (): FloorNames => {
  const { t } = useTranslation('developments');
  return useMemo(
    () => ({
      ground: t('floor.ground', 'Ground floor'),
      floor: (level: number) => t('floor.named', { level, defaultValue: 'Floor {{level}}' }),
      basement: (n: number) => t('floor.basement', { n, defaultValue: 'Basement {{n}}' }),
    }),
    [t]
  );
};
