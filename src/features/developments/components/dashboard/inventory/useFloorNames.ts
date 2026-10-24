import { useTranslation } from 'react-i18next';
import type { FloorNames } from '../../../utils/inventoryNaming';

/** Floor names ("Floor 4", "Ground floor", "Basement 1") in the current language. */
export const useFloorNames = (): FloorNames => {
  const { t } = useTranslation('developments');
  return {
    ground: t('floor.ground', 'Ground floor'),
    floor: (level) => t('floor.named', { level, defaultValue: 'Floor {{level}}' }),
    basement: (n) => t('floor.basement', { n, defaultValue: 'Basement {{n}}' }),
  };
};
