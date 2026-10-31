import { useMemo } from 'react';
import type { DevelopmentBuilding, DevelopmentEntrance, PublicUnit, SceneTargetType } from '../../../types';
import { countByAvailability } from '../../../utils/availability';
import { filterUnits, hasActiveCriteria, type UnitCriteria } from '../../../utils/unitFilters';
import { computeBuildingFacts } from './useRegionCard';

interface Args {
  units: PublicUnit[];
  buildings: DevelopmentBuilding[];
  entrances?: DevelopmentEntrance[];
  criteria: UnitCriteria;
  /** What is on screen, for the legend counts. */
  type: SceneTargetType;
  buildingId?: string;
  floorId?: string;
}

/** Lookups, filter matches and legend counts the explorer derives from the residence's data. */
const NONE: DevelopmentEntrance[] = [];

export function useExplorerData({ units, buildings, entrances = NONE, criteria, type, buildingId, floorId }: Args) {
  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const buildingsById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);
  const entrancesById = useMemo(() => new Map(entrances.map((e) => [e.id, e])), [entrances]);
  const buildingFacts = useMemo(() => computeBuildingFacts(units), [units]);
  const matched = useMemo(() => filterUnits(units, criteria), [units, criteria]);
  const matchedIds = useMemo(
    () => (hasActiveCriteria(criteria) ? new Set(matched.map((u) => u.id)) : undefined),
    [matched, criteria]
  );
  // Legend counts cover what is on screen (this building / floor) and ignore the
  // availability filter itself, so a toggled state never disappears from it.
  const legend = useMemo(() => {
    const scoped = units.filter((u) =>
      type === 'floor' ? u.floorId === floorId : type === 'building' ? u.buildingId === buildingId : true
    );
    return countByAvailability(filterUnits(scoped, { ...criteria, availability: [] }));
  }, [units, criteria, type, buildingId, floorId]);

  return { unitsById, buildingsById, entrancesById, buildingFacts, matched, matchedIds, legend };
}
