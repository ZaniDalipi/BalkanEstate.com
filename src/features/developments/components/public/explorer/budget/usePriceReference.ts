import { useMemo } from 'react';
import type { PublicUnit } from '../../../../types';
import { useLocationPrice } from '../../../../hooks/useLocationPrice';
import { featuredPick, pickReference } from '../../../../utils/budgetMatch';

/**
 * What "a bargain" is measured against: the city's average price per m² when
 * the app has market data for it, else this residence's own average. Also
 * picks the home the teaser talks about.
 */
export function usePriceReference(units: PublicUnit[], city?: string, country?: string) {
  const location = useLocationPrice(city, country);
  const reference = useMemo(
    () => (location.isLoading ? null : pickReference(units, { pricePerSqm: location.pricePerSqm, place: city })),
    [units, location.isLoading, location.pricePerSqm, city]
  );
  const featured = useMemo(() => (location.isLoading ? null : featuredPick(units, reference)), [units, reference, location.isLoading]);
  return { reference, featured };
}
