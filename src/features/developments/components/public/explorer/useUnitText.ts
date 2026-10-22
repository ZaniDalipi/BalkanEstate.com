import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DevelopmentBuilding, Hotspot, PublicUnit } from '../../../types';
import { formatArea, formatPrice } from '../../../utils/format';
import { unitArea } from '../../../utils/unitFilters';
import { useAvailabilityLabel } from '../../shared/Badges';

/**
 * Shared wording for a unit across the explorer (polygon aria-label, tooltip,
 * drawer heading) so screen readers and sighted users get the same facts.
 */
export function useUnitText() {
  const { t } = useTranslation('developments');
  const availability = useAvailabilityLabel();

  const title = useCallback(
    (u: Pick<PublicUnit, 'unitNumber'>) => `${t('explorer.apt', 'Apt')} ${u.unitNumber}`,
    [t]
  );
  const bedrooms = useCallback(
    (beds: number) =>
      beds === 0
        ? t('explorer.studio', 'Studio')
        : t('explorer.bedrooms', { count: beds, defaultValue: beds === 1 ? '{{count}} bedroom' : '{{count}} bedrooms' }),
    [t]
  );
  const price = useCallback(
    (u: PublicUnit) =>
      !u.priceOnRequest && typeof u.price === 'number' && u.price > 0
        ? formatPrice(u.price, u.currency)
        : t('unit.priceOnRequest', 'Price on request'),
    [t]
  );
  const area = useCallback((u: PublicUnit) => {
    const a = unitArea(u);
    return a ? formatArea(a) : '';
  }, []);

  /** "Apt A12 · 2 bedrooms · Available" */
  const ariaLabel = useCallback(
    (u: PublicUnit) =>
      [title(u), typeof u.beds === 'number' ? bedrooms(u.beds) : null, availability(u.availability)]
        .filter(Boolean)
        .join(' · '),
    [title, bedrooms, availability]
  );

  /** "Building B2 · 14 available" */
  const buildingLabel = useCallback(
    (h: Hotspot, b?: DevelopmentBuilding) => {
      const name = b?.name || h.label || t('scene.linkTypes.building', 'Building');
      if (!b?.stats) return name;
      return `${name} · ${t('explorer.availableCount', { count: b.stats.available, defaultValue: '{{count}} available' })}`;
    },
    [t]
  );

  return { title, bedrooms, price, area, ariaLabel, buildingLabel, availability };
}
