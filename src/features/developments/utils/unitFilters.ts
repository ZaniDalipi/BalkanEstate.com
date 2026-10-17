import type { PublicUnit } from '../types';

/**
 * Buyer-facing filter criteria for the interactive explorer — the East Gate B2
 * filter bar: bedrooms, apartment type, area (m²) and floor level. Kept as a
 * plain value object so filtering stays a pure, testable function, decoupled
 * from React.
 */
export interface UnitCriteria {
  /** Selected bedroom counts; the max option is treated as "N+". */
  beds: number[];
  /** Selected unit types (DevelopmentUnit.unitType values). */
  types: string[];
  minArea?: number;
  maxArea?: number;
  minLevel?: number;
  maxLevel?: number;
}

export const EMPTY_CRITERIA: UnitCriteria = { beds: [], types: [] };

/** The usable floor area for filtering: total, then net, then gross. */
export const unitArea = (u: PublicUnit): number | undefined =>
  u.totalArea ?? u.netArea ?? u.grossArea ?? undefined;

export interface FilterBounds {
  /** Distinct bedroom counts present, ascending (e.g. [0,1,2,3]). */
  bedOptions: number[];
  /** Distinct unit types present. */
  types: string[];
  areaMin: number | null;
  areaMax: number | null;
  levelMin: number | null;
  levelMax: number | null;
}

/** Derive the selectable options and slider bounds from the loaded units. */
export const deriveFilterBounds = (units: PublicUnit[]): FilterBounds => {
  const beds = new Set<number>();
  const types = new Set<string>();
  const areas: number[] = [];
  const levels: number[] = [];

  for (const u of units) {
    if (typeof u.beds === 'number') beds.add(u.beds);
    if (u.unitType) types.add(u.unitType);
    const a = unitArea(u);
    if (typeof a === 'number' && a > 0) areas.push(a);
    if (typeof u.floorLevel === 'number') levels.push(u.floorLevel);
  }

  return {
    bedOptions: Array.from(beds).sort((a, b) => a - b),
    types: Array.from(types).sort(),
    areaMin: areas.length ? Math.floor(Math.min(...areas)) : null,
    areaMax: areas.length ? Math.ceil(Math.max(...areas)) : null,
    levelMin: levels.length ? Math.min(...levels) : null,
    levelMax: levels.length ? Math.max(...levels) : null,
  };
};

/** Whether `criteria` constrains anything at all (for "any match" short-circuits). */
export const hasActiveCriteria = (c: UnitCriteria): boolean =>
  c.beds.length > 0 ||
  c.types.length > 0 ||
  c.minArea != null ||
  c.maxArea != null ||
  c.minLevel != null ||
  c.maxLevel != null;

/**
 * Whether a unit satisfies the criteria. A constraint a unit can't answer
 * (e.g. an area bound on a unit with no area) excludes it, so the explorer
 * never implies a match it can't stand behind. `bedsMax` is the "N+" threshold
 * — a unit with that many beds or more matches that option.
 */
export const unitMatchesCriteria = (
  u: PublicUnit,
  c: UnitCriteria,
  bedsMax?: number
): boolean => {
  if (c.beds.length > 0) {
    const b = u.beds;
    if (typeof b !== 'number') return false;
    const matchesBed = c.beds.some((sel) =>
      bedsMax != null && sel === bedsMax ? b >= sel : b === sel
    );
    if (!matchesBed) return false;
  }

  if (c.types.length > 0 && !c.types.includes(u.unitType)) return false;

  if (c.minArea != null || c.maxArea != null) {
    const a = unitArea(u);
    if (typeof a !== 'number') return false;
    if (c.minArea != null && a < c.minArea) return false;
    if (c.maxArea != null && a > c.maxArea) return false;
  }

  if (c.minLevel != null || c.maxLevel != null) {
    const lvl = u.floorLevel;
    if (typeof lvl !== 'number') return false;
    if (c.minLevel != null && lvl < c.minLevel) return false;
    if (c.maxLevel != null && lvl > c.maxLevel) return false;
  }

  return true;
};
