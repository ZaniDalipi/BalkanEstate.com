import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CountryGuide } from '../types/guide.types';

/** The guide's country name in the reader's language, English as fallback. */
export function useCountryName(): (guide: CountryGuide) => string {
  const { t } = useTranslation('common');
  return useCallback(
    (guide: CountryGuide) => t(`common:countries.${guide.countryKey}`, { defaultValue: guide.country }),
    [t],
  );
}
