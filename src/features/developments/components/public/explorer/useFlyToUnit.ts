import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Hotspot, PublicSceneView, PublicUnit } from '../../../types';
import type { ExplorerNav } from '../../../hooks/useExplorerUrlState';
import type { ExplorerFocus } from './useFlyFocus';

interface Args {
  unitsById: Map<string, PublicUnit>;
  views: PublicSceneView[];
  viewIndex: number;
  isLoading: boolean;
  nav: ExplorerNav;
  buildingId?: string;
  onNavChange: (n: ExplorerNav) => void;
  onOpenUnit: (unitId: string) => void;
}

/** Residence → building → floor → apartment, plus a spare for a view switch. */
const MAX_HOPS = 5;

interface Trip {
  unitId: string;
  hops: number;
}

/**
 * Take the buyer to an apartment the way they would walk there: glide to the
 * apartment if it is drawn on this picture, else to its floor, else to its
 * building, drill in and repeat; the drawer opens on arrival. Pictures with
 * nothing to glide to are skipped through, and a residence without any marking
 * still opens the apartment, so a trip always ends somewhere useful.
 */
export function useFlyToUnit(a: Args) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const unit = trip ? a.unitsById.get(trip.unitId) : undefined;
  const { onNavChange, onOpenUnit } = a;

  const found = useMemo(() => {
    if (!unit || a.isLoading) return null;
    const wanted: Array<[Hotspot['linkType'], string | undefined]> = [
      ['unit', unit.id],
      // Already on this floor/building: its own region is not a step forward.
      ['floor', a.nav.floor === unit.floorId ? undefined : unit.floorId],
      ['building', a.buildingId === unit.buildingId ? undefined : unit.buildingId],
    ];
    // This picture first, then the residence's other camera views.
    const order = [a.viewIndex, ...a.views.map((_, i) => i).filter((i) => i !== a.viewIndex)];
    for (const [linkType, linkId] of wanted) {
      if (!linkId) continue;
      for (const index of order) {
        const hotspot = a.views[index]?.hotspots.find((h) => h.linkType === linkType && h.linkId === linkId);
        if (hotspot) return { index, hotspot };
      }
    }
    return null;
  }, [unit, a.isLoading, a.nav.floor, a.buildingId, a.views, a.viewIndex]);

  const finish = useCallback(
    (unitId?: string) => {
      setTrip(null);
      if (unitId) onOpenUnit(unitId);
    },
    [onOpenUnit]
  );
  const hop = useCallback(
    (n: ExplorerNav) => {
      setTrip((t) => t && { ...t, hops: t.hops + 1 });
      onNavChange(n);
    },
    [onNavChange]
  );

  // Steps that need no glide: switch camera view, or drill in without a marking.
  useEffect(() => {
    if (!trip || a.isLoading) return;
    if (!unit || trip.hops > MAX_HOPS) return finish(unit?.id);
    if (found) {
      if (found.index !== a.viewIndex) hop({ ...a.nav, view: a.views[found.index]?.viewKey });
      return;
    }
    if (a.buildingId !== unit.buildingId) return hop({ building: unit.buildingId });
    if (a.nav.floor !== unit.floorId) return hop({ building: unit.buildingId, floor: unit.floorId });
    finish(unit.id);
  }, [trip, unit, found, a.isLoading, a.viewIndex, a.views, a.nav, a.buildingId, hop, finish]);

  const focus: ExplorerFocus | undefined =
    trip && found && found.index === a.viewIndex ? { hotspotId: found.hotspot.id, nonce: trip.hops } : undefined;

  /** The glide reached `h`: open the apartment, or drill into its floor/building. */
  const onArrive = useCallback(
    (h: Hotspot) => {
      if (!unit) return finish();
      if (h.linkType === 'unit') return finish(h.linkId);
      if (h.linkType === 'floor') return hop({ building: unit.buildingId, floor: h.linkId });
      if (h.linkType === 'building') return hop({ building: h.linkId });
      finish(unit.id);
    },
    [unit, hop, finish]
  );

  return {
    /** Start a trip to `unitId`. */
    start: useCallback((unitId: string) => setTrip({ unitId, hops: 0 }), []),
    /** The buyer took over (clicked, used crumbs): stop steering. */
    cancel: useCallback(() => setTrip(null), []),
    active: !!trip,
    focus,
    onArrive,
  };
}
