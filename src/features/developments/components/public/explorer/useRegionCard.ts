import { useTranslation } from 'react-i18next';
import type { DevelopmentBuilding, Hotspot, PublicUnit } from '../../../types';
import { formatPrice } from '../../../utils/format';
import type { Fact } from './RegionCardFacts';

/** Per-building figures for the building card (computed once per explorer). */
export interface BuildingFacts {
  units: number;
  available: number;
  floors: number;
  priceFrom?: number;
  currency?: string;
}

export interface RegionCardContent {
  unit?: PublicUnit;
  title?: string;
  facts?: Fact[];
  actionLabel?: string;
}

/** What the hover card shows for each kind of region. */
export function useRegionCard(
  unitsById: Map<string, PublicUnit>,
  buildingsById: Map<string, DevelopmentBuilding> | undefined,
  buildingFacts: Map<string, BuildingFacts> | undefined
) {
  const { t } = useTranslation('developments');

  return (h: Hotspot): RegionCardContent => {
    if (h.linkType === 'unit') {
      const unit = unitsById.get(h.linkId);
      return { unit, title: unit ? undefined : h.label, actionLabel: t('explorer.card.viewApartment', 'View apartment') };
    }
    if (h.linkType === 'building') {
      const b = buildingsById?.get(h.linkId);
      const f = buildingFacts?.get(h.linkId);
      const facts: Fact[] = [];
      if (f) {
        facts.push({
          label: t('explorer.card.available', 'Available'),
          value: t('explorer.availableOfTotal', { available: f.available, total: f.units, defaultValue: '{{available}} of {{total}} available' }),
        });
        if (f.floors > 0) facts.push({ label: t('explorer.card.floors', 'Floors'), value: String(f.floors) });
        if (f.priceFrom) facts.push({ label: t('explorer.card.priceFrom', 'Prices from'), value: formatPrice(f.priceFrom, f.currency) });
      }
      return {
        title: b?.name || h.label || t('scene.linkTypes.building', 'Building'),
        facts,
        actionLabel: t('explorer.card.exploreBuilding', 'Explore building'),
      };
    }
    if (h.linkType === 'floor') {
      return { title: h.label || t('scene.linkTypes.floor', 'Floor'), actionLabel: t('explorer.card.exploreFloor', 'Explore floor') };
    }
    if (h.linkType === 'listing') {
      return { title: h.label || t('unit.viewListing', 'View listing'), actionLabel: t('unit.viewListing', 'View listing') };
    }
    return { title: h.label };
  };
}

/** Units, availability, floors and lowest public price per building. */
export const computeBuildingFacts = (units: PublicUnit[]): Map<string, BuildingFacts> => {
  const m = new Map<string, BuildingFacts & { floorIds: Set<string> }>();
  for (const u of units) {
    const f = m.get(u.buildingId) ?? { units: 0, available: 0, floors: 0, floorIds: new Set<string>() };
    f.units += 1;
    if (u.availability === 'available') f.available += 1;
    f.floorIds.add(u.floorId);
    if (!u.priceOnRequest && typeof u.price === 'number' && u.price > 0 && (f.priceFrom === undefined || u.price < f.priceFrom)) {
      f.priceFrom = u.price;
      f.currency = u.currency;
    }
    m.set(u.buildingId, f);
  }
  return new Map([...m].map(([id, { floorIds, ...f }]) => [id, { ...f, floors: floorIds.size }]));
};
