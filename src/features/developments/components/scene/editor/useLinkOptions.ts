/**
 * Everything a region can link to in this development, as searchable options,
 * plus lookups the canvas needs (a unit's effective availability, a region's
 * display name).
 *
 * Units: the first page (FIRST_PAGE, scoped to the view's building/floor) is
 * loaded up front; anything beyond it is found through the Target search
 * (UnitTargetPicker queries the server). Units seen in search results are
 * remembered for the session so their label and availability keep resolving
 * on the canvas and in the region list.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDevelopmentStructure, useDevelopmentUnits } from '../../../hooks/useDevelopment';
import type { DashboardUnit, Hotspot, Scene, UnitAvailability, UnitListQuery } from '../../../types';
import { AVAILABILITY_META } from '../../../utils/availability';
import type { LinkOptions } from './RegionInspector';
import type { SelectOption } from './SearchableSelect';

export const FIRST_PAGE = 200;

/** The units relevant to a scene: its building's or floor's, else all of the development's. */
export const unitScopeFor = (scene: Pick<Scene, 'targetType' | 'targetId'>): UnitListQuery => {
  if (scene.targetType === 'building') return { buildingId: scene.targetId, sort: 'unitNumber' };
  if (scene.targetType === 'floor') return { floorId: scene.targetId, sort: 'unitNumber' };
  return { sort: 'unitNumber' };
};

type UnitOption = SelectOption & { state?: UnitAvailability };

/** What the unit picker needs to search beyond the first page. */
export interface UnitPickerSource {
  scope: UnitListQuery;
  /** Units in scope on the server (the first page may hold fewer). */
  total: number;
  toOption: (u: DashboardUnit) => SelectOption;
  /** Keep search results' labels/availability for regions linked to them. */
  remember: (units: DashboardUnit[]) => void;
}

export function useLinkOptions(developmentId: string, scene: Scene) {
  const { t } = useTranslation('developments');
  const { buildings, floors, entrances } = useDevelopmentStructure(developmentId);
  const scope = useMemo(() => unitScopeFor(scene), [scene.targetType, scene.targetId]);
  const { units, total } = useDevelopmentUnits(developmentId, { ...scope, limit: FIRST_PAGE });
  const [seen, setSeen] = useState<ReadonlyMap<string, UnitOption>>(() => new Map());

  const buildingName = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);
  const toOption = useCallback(
    (u: DashboardUnit): UnitOption => {
      const state = u.effectiveAvailability ?? u.availability;
      return {
        id: u.id,
        label: u.unitNumber,
        hint: [u.buildingName ?? buildingName.get(u.buildingId), u.floorLabel].filter(Boolean).join(' · '),
        dotClass: state ? AVAILABILITY_META[state]?.dotClass : undefined,
        state,
      };
    },
    [buildingName]
  );

  const remember = useCallback(
    (list: DashboardUnit[]) =>
      setSeen((prev) => {
        if (list.every((u) => prev.has(u.id))) return prev;
        const next = new Map(prev);
        for (const u of list) next.set(u.id, toOption(u));
        return next;
      }),
    [toOption]
  );

  const unitOptions = useMemo(() => (units as DashboardUnit[]).map(toOption), [units, toOption]);

  // Units already linked by this view's regions but outside the first page:
  // fetch them by id so their names and availability colours resolve.
  const missingLinked = useMemo(() => {
    const loaded = new Set(unitOptions.map((o) => o.id));
    const linked = [...(scene.draft?.hotspots ?? []), ...(scene.published?.hotspots ?? [])]
      .filter((h) => h.linkType === 'unit' && h.linkId && !loaded.has(h.linkId))
      .map((h) => h.linkId);
    return [...new Set(linked)].sort().slice(0, FIRST_PAGE);
  }, [scene.draft?.hotspots, scene.published?.hotspots, unitOptions]);
  const { units: linkedUnits } = useDevelopmentUnits(missingLinked.length > 0 ? developmentId : undefined, {
    ids: missingLinked,
    limit: FIRST_PAGE,
  });
  useEffect(() => {
    if (linkedUnits.length > 0) remember(linkedUnits as DashboardUnit[]);
  }, [linkedUnits, remember]);

  const options = useMemo<LinkOptions>(
    () => ({
      building: buildings.map((b) => ({ id: b.id, label: b.name, hint: b.code })),
      floor: [...floors]
        .sort((a, b) => (buildingName.get(a.buildingId) ?? '').localeCompare(buildingName.get(b.buildingId) ?? '') || a.level - b.level)
        .map((f) => ({ id: f.id, label: f.label, hint: buildingName.get(f.buildingId) })),
      entrance: entrances.map((e) => ({ id: e.id, label: e.name, hint: buildingName.get(e.buildingId) })),
      unit: unitOptions,
    }),
    [buildings, floors, entrances, unitOptions, buildingName]
  );

  const lookup = useMemo(() => {
    const m = new Map<string, UnitOption>(seen);
    for (const list of Object.values(options)) for (const o of list) m.set(o.id, o);
    return m;
  }, [options, seen]);

  const availabilityOf = useCallback((unitId: string) => lookup.get(unitId)?.state, [lookup]);
  /** Label, else the target's name, else (unit outside the loaded pages) "Unit" + short id. */
  const labelOf = useCallback(
    (h: Hotspot) => {
      const own = h.label?.trim();
      if (own) return own;
      if (!h.linkId) return '';
      const known = lookup.get(h.linkId)?.label;
      if (known) return known;
      return h.linkType === 'unit' ? t('editor.link.unitFallback', 'Unit {{id}}', { id: h.linkId.slice(-6) }) : '';
    },
    [lookup, t]
  );

  const unitPicker = useMemo<UnitPickerSource>(
    () => ({ scope, total: Math.max(total, unitOptions.length), toOption, remember }),
    [scope, total, unitOptions.length, toOption, remember]
  );

  return { options, availabilityOf, labelOf, unitPicker };
}
