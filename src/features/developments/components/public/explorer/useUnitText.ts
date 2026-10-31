import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DevelopmentBuilding, DevelopmentEntrance, Hotspot, PublicUnit } from '../../../types';
import { formatArea, formatPrice } from '../../../utils/format';
import { unitArea } from '../../../utils/unitFilters';
import { isExtraUnit } from '../../../utils/unitCompanions';
import { useAvailabilityLabel } from '../../shared/Badges';

/**
 * Shared wording for a unit across the explorer (polygon aria-label, tooltip,
 * drawer heading) so screen readers and sighted users get the same facts.
 */
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function useUnitText() {
  const { t } = useTranslation('developments');
  const availability = useAvailabilityLabel();

  // "Apt 12", but "Parking P1" / "Storage S1" for the extras sold with apartments.
  const title = useCallback(
    (u: Pick<PublicUnit, 'unitNumber'> & { unitType?: string }) =>
      isExtraUnit(u.unitType)
        ? `${t(`explorer.unitType.${u.unitType}`, capitalize(String(u.unitType)))} ${u.unitNumber}`
        : `${t('explorer.apt', 'Apt')} ${u.unitNumber}`,
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

  /** Accessible name for any region on the picture. */
  const hotspotLabel = useCallback(
    (h: Hotspot, unitsById: Map<string, PublicUnit>, buildingsById?: Map<string, DevelopmentBuilding>, entrancesById?: Map<string, DevelopmentEntrance>): string | undefined => {
      if (h.linkType === 'unit') {
        const u = unitsById.get(h.linkId);
        return u ? ariaLabel(u) : h.label;
      }
      if (h.linkType === 'building') return buildingLabel(h, buildingsById?.get(h.linkId));
      if (h.linkType === 'floor') return h.label || t('scene.linkTypes.floor', 'Floor');
      if (h.linkType === 'listing') return h.label || t('unit.viewListing', 'View listing');
      if (h.linkType === 'entrance') {
        // "Entrance A · 6 homes available"
        const e = entrancesById?.get(h.linkId);
        const name = e?.name || h.label || t('scene.linkTypes.entrance', 'Entrance');
        return e?.stats ? `${name} · ${t('entrance.homesAvailable', { count: e.stats.available, defaultValue: '{{count}} homes available' })}` : name;
      }
      return h.label;
    },
    [ariaLabel, buildingLabel, t]
  );

  return { title, bedrooms, price, area, ariaLabel, buildingLabel, hotspotLabel, availability };
}
