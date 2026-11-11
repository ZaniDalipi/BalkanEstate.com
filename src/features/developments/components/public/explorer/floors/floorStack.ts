import type { DevelopmentFloor, PublicUnit } from '../../../../types';

/** One stop of the elevator: a floor of the building, with what is on it. */
export interface FloorStop {
  id: string;
  label: string;
  level: number;
  /** Visible homes on the floor, and how many are available. */
  units: number;
  available: number;
  /** It has a picture of its own (a floor plan) to open. */
  hasPicture: boolean;
}

/**
 * The floors of a building as an elevator panel lists them: top floor first,
 * each with its homes and whether it has a picture. Empty for no building or
 * a building of a single floor (nothing to choose between).
 */
export function floorStack(floors: DevelopmentFloor[], buildingId: string | undefined, units: PublicUnit[]): FloorStop[] {
  if (!buildingId) return [];
  const own = floors.filter((f) => f.buildingId === buildingId);
  if (own.length < 2) return [];
  const counts = new Map<string, { units: number; available: number }>();
  for (const u of units) {
    if (u.buildingId !== buildingId) continue;
    const c = counts.get(u.floorId) ?? { units: 0, available: 0 };
    c.units += 1;
    if (u.availability === 'available') c.available += 1;
    counts.set(u.floorId, c);
  }
  return [...own]
    .sort((a, b) => b.level - a.level || b.order - a.order)
    .map((f) => ({ id: f.id, label: f.label, level: f.level, ...(counts.get(f.id) ?? { units: 0, available: 0 }), hasPicture: !!f.hasViews }));
}
