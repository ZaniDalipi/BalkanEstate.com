import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import { cheapestVilla, villaRentSuffix } from '../utils/villaRentPeriod';

export interface VillaFromPrice {
  /** "€3,000" */
  price: string;
  /** "/ month" for a rental, empty for a villa for sale. */
  suffix: string;
}

/**
 * "from €3,000 / month": the cheapest of `villas`, quoted in the period its
 * own rent is set in. Cheapest is judged on the nightly rate, so a villa let
 * by the month is weighed fairly against nightly lets — and never passed off
 * as a nightly price itself.
 */
export function useVillaFromPrice(villas: Property[]): VillaFromPrice | null {
  const { t } = useTranslation(['villas']);
  return useMemo(() => {
    const villa = cheapestVilla(villas);
    if (!villa) return null;
    const suffix = villa.listingType === 'sale' ? null : villaRentSuffix(villa.rentPeriod);
    return {
      price: `€${villa.price.toLocaleString()}`,
      suffix: suffix ? t(suffix.key, suffix.fallback) : '',
    };
  }, [villas, t]);
}
