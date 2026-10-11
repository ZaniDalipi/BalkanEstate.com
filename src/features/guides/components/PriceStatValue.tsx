import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PriceStat } from '../types/guide.types';
import { formatPriceStat } from '../utils/guideSelectors';

/**
 * The headline of an official price statistic: "€2,445 /m²" for an average,
 * "+5.25% year on year" for an index. Absent → says so; never estimates.
 */
export const PriceStatValue: React.FC<{ stat?: PriceStat; className?: string }> = ({ stat, className = '' }) => {
  const { t, i18n } = useTranslation('common');
  if (!stat) {
    return (
      <span className={`text-sm text-neutral-500 ${className}`}>
        {t('common:guides.noOfficialPrice', 'No current official figure found')}
      </span>
    );
  }
  const value = formatPriceStat(stat, i18n.language || 'en');
  return (
    <span className={`font-semibold text-neutral-900 ${className}`}>
      {value}
      <span className="ml-1 text-sm font-normal text-neutral-500">
        {stat.kind === 'avg-per-sqm' ? t('common:guides.perSqm', '/m²') : t('common:guides.yearOnYear', 'year on year')}
      </span>
    </span>
  );
};
