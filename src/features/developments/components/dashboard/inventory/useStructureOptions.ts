import { useTranslation } from 'react-i18next';
import { useUnitFacets } from '../../../hooks/useUnitFacets';
import { AVAILABILITY_ORDER } from '../../../utils/availability';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import type { SelectOption } from '../../shared/FormSelect';

/**
 * Dropdown options built from the residence's real data: buildings with their
 * floor and unit counts ("Plaza Tower · 22 floors · 84 units"), floors of one
 * building in level order with unit counts, and statuses with live counts.
 */
export const useStructureOptions = (developmentId: string, buildings: DevelopmentBuilding[], floors: DevelopmentFloor[]) => {
  const { t } = useTranslation('developments');
  const { data: facets } = useUnitFacets(developmentId);
  const units = (n: number) => t('choices.units', { count: n, defaultValue: '{{count}} units' });
  const floorsOf = (buildingId: string) => floors.filter((f) => f.buildingId === buildingId).sort((a, b) => a.level - b.level);

  const buildingOptions: SelectOption[] = buildings.map((b) => {
    const parts = [b.name, t('editor.structure.floors', { count: floorsOf(b.id).length, defaultValue: '{{count}} floors' })];
    if (facets) parts.push(units(facets.byBuilding[b.id] ?? 0));
    return { value: b.id, label: parts.join(' · ') };
  });

  /** Floors of one building (or all, grouped by building name when no building is chosen). */
  const floorOptions = (buildingId: string): SelectOption[] => {
    const list = buildingId ? floorsOf(buildingId) : [...floors].sort((a, b) => a.buildingId.localeCompare(b.buildingId) || a.level - b.level);
    const nameOf = new Map(buildings.map((b) => [b.id, b.name]));
    return list.map((f) => {
      const parts = [buildingId ? f.label : `${nameOf.get(f.buildingId) ?? ''} — ${f.label}`];
      if (facets) parts.push(units(facets.byFloor[f.id] ?? 0));
      return { value: f.id, label: parts.join(' · ') };
    });
  };

  const withCount = (label: string, n: number | undefined) => (facets ? `${label} (${n ?? 0})` : label);
  const availabilityOptions: SelectOption[] = AVAILABILITY_ORDER.map((s) => ({ value: s, label: withCount(t(`availability.${s}`), facets?.byAvailability[s]) }));
  const visibilityOptions: SelectOption[] = (['public', 'hidden'] as const).map((v) => ({ value: v, label: withCount(t(`inventory.visibility.${v}`, v === 'public' ? 'Public' : 'Hidden'), facets?.byVisibility[v]) }));

  return { buildingOptions, floorOptions, availabilityOptions, visibilityOptions, total: facets?.total };
};
