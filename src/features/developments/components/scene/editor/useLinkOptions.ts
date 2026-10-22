/**
 * Everything a region can link to in this development, as searchable options,
 * plus lookups the canvas needs (a unit's effective availability, a region's
 * display name).
 */
import { useCallback, useMemo } from 'react';
import { useDevelopmentStructure, useDevelopmentUnits } from '../../../hooks/useDevelopment';
import type { DashboardUnit, Hotspot, Scene, UnitAvailability, UnitListQuery } from '../../../types';
import { AVAILABILITY_META } from '../../../utils/availability';
import type { LinkOptions } from './RegionInspector';

/** Units relevant to a scene: its building's or floor's units, else the first page of all. */
const unitQueryFor = (scene: Scene): UnitListQuery => {
  if (scene.targetType === 'building') return { buildingId: scene.targetId, limit: 200, sort: 'unitNumber' };
  if (scene.targetType === 'floor') return { floorId: scene.targetId, limit: 200, sort: 'unitNumber' };
  return { limit: 200, sort: 'unitNumber' };
};

export function useLinkOptions(developmentId: string, scene: Scene) {
  const { buildings, floors, entrances } = useDevelopmentStructure(developmentId);
  const { units } = useDevelopmentUnits(developmentId, unitQueryFor(scene));

  const options = useMemo<LinkOptions>(() => {
    const buildingName = new Map(buildings.map((b) => [b.id, b.name]));
    return {
      building: buildings.map((b) => ({ id: b.id, label: b.name, hint: b.code })),
      floor: [...floors]
        .sort((a, b) => (buildingName.get(a.buildingId) ?? '').localeCompare(buildingName.get(b.buildingId) ?? '') || a.level - b.level)
        .map((f) => ({ id: f.id, label: f.label, hint: buildingName.get(f.buildingId) })),
      entrance: entrances.map((e) => ({ id: e.id, label: e.name, hint: buildingName.get(e.buildingId) })),
      unit: (units as DashboardUnit[]).map((u) => {
        const state = u.effectiveAvailability ?? u.availability;
        return {
          id: u.id,
          label: u.unitNumber,
          hint: [u.buildingName ?? buildingName.get(u.buildingId), u.floorLabel].filter(Boolean).join(' · '),
          dotClass: state ? AVAILABILITY_META[state]?.dotClass : undefined,
        };
      }),
    };
  }, [buildings, floors, entrances, units]);

  const availability = useMemo(() => {
    const m = new Map<string, UnitAvailability>();
    for (const u of units as DashboardUnit[]) m.set(u.id, u.effectiveAvailability ?? u.availability);
    return m;
  }, [units]);

  const labelLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const list of Object.values(options)) for (const o of list) m.set(o.id, o.label);
    return m;
  }, [options]);

  const availabilityOf = useCallback((unitId: string) => availability.get(unitId), [availability]);
  const labelOf = useCallback(
    (h: Hotspot) => h.label?.trim() || (h.linkId ? labelLookup.get(h.linkId) ?? '' : ''),
    [labelLookup]
  );

  return { options, availabilityOf, labelOf };
}
