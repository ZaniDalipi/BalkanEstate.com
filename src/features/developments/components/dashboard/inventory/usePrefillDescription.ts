import { useTranslation } from 'react-i18next';
import type { UnitPrefill } from '../../../types';
import { formatArea, formatPrice } from '../../../utils/format';

/** The copied values as short readable facts ("Beds: 2", "Area: 79 m²", "Price: 182.000 €"…). */
export const usePrefillDescription = () => {
  const { t } = useTranslation('developments');
  return (f: UnitPrefill['fields']): string[] =>
    [
      f.unitType && t(`explorer.unitType.${f.unitType}`, f.unitType),
      f.beds !== undefined && `${t('unit.beds', 'Beds')}: ${f.beds}`,
      f.baths !== undefined && `${t('unit.baths', 'Baths')}: ${f.baths}`,
      f.totalArea !== undefined && `${t('unit.area', 'Area')}: ${formatArea(f.totalArea)}`,
      f.price !== undefined && `${t('unit.price', 'Price')}: ${formatPrice(f.price)}`,
      f.orientation && `${t('unit.orientation', 'Orientation')}: ${t(`explorer.orientation.${f.orientation.toLowerCase()}`, f.orientation)}`,
      f.viewType && `${t('inventory.edit.viewType', 'View')}: ${t(`unitView.${f.viewType}`, f.viewType)}`,
      f.description && t('inventory.prefill.withDescription', 'Description'),
    ].filter((x): x is string => typeof x === 'string' && x !== '');
};
