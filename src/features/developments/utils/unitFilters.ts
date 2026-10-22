import type { PublicUnit, UnitAvailability } from '../types';

/**
 * Buyer-facing filter criteria shared by the interactive explorer and the unit
 * grid — the East Gate B2 filter bar (bedrooms, apartment type, area, floors)
 * plus baths, price, availability, orientation and apartment flags. Kept as a
 * plain value object so filtering stays a pure, testable function and can be
 * round-tripped through the URL (see hooks/useExplorerUrlState).
 *
 * Every list field is optional so older call sites (`{ beds, types, features }`)
 * keep type-checking; an absent list means "no constraint".
 */
export interface UnitCriteria {
  /** Selected bedroom counts; the max option is treated as "N+". */
  beds: number[];
  /** Selected unit types (DevelopmentUnit.unitType values). */
  types: string[];
  /** Selected raw feature flags (UNIT_FEATURES); matched with AND. */
  features: string[];
  /** Selected bathroom counts; the max option is treated as "N+". */
  baths?: number[];
  /** Selected EFFECTIVE availability states; matched with OR. */
  availability?: UnitAvailability[];
  /** Selected orientations (free text on the unit, compared case-insensitively). */
  orientations?: string[];
  /** Derived apartment flags (terrace, balcony, …); matched with AND. */
  flags?: UnitFlag[];
  minArea?: number;
  maxArea?: number;
  minLevel?: number;
  maxLevel?: number;
  minPrice?: number;
  maxPrice?: number;
}

/** Apartment characteristics a buyer can toggle, derived from several unit fields. */
export const UNIT_FLAGS = ['terrace', 'balcony', 'duplex', 'penthouse', 'furnished'] as const;
export type UnitFlag = (typeof UNIT_FLAGS)[number];

export const EMPTY_CRITERIA: UnitCriteria = { beds: [], types: [], features: [] };

/**
 * The floor area shown AND filtered on: total, then net, then gross. Every
 * surface (card, tooltip, drawer, filter) must use this so a "60–80 m²" filter
 * never hides a card that displays 75 m².
 */
export const unitArea = (u: Pick<PublicUnit, 'totalArea' | 'netArea' | 'grossArea'>): number | undefined =>
  u.totalArea ?? u.netArea ?? u.grossArea ?? undefined;

/** Whether a unit has a derived flag. */
export const unitHasFlag = (u: PublicUnit, flag: UnitFlag): boolean => {
  const f = u.features ?? [];
  switch (flag) {
    case 'terrace':
      return (u.terraces ?? 0) > 0 || (u.terraceArea ?? 0) > 0 || f.includes('big_terrace');
    case 'balcony':
      return (u.balconies ?? 0) > 0;
    default:
      return f.includes(flag);
  }
};

export interface FilterBounds {
  /** Distinct bedroom counts present, ascending (e.g. [0,1,2,3]). */
  bedOptions: number[];
  bathOptions: number[];
  /** Distinct unit types present. */
  types: string[];
  /** Distinct feature flags present across the units. */
  features: string[];
  /** Derived flags at least one unit has. */
  flags: UnitFlag[];
  /** Distinct orientations present (as written on the units). */
  orientations: string[];
  availability: UnitAvailability[];
  areaMin: number | null;
  areaMax: number | null;
  levelMin: number | null;
  levelMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
}

const sortedNums = (s: Set<number>) => Array.from(s).sort((a, b) => a - b);
const minMax = (xs: number[], round = false): [number | null, number | null] =>
  xs.length
    ? [round ? Math.floor(Math.min(...xs)) : Math.min(...xs), round ? Math.ceil(Math.max(...xs)) : Math.max(...xs)]
    : [null, null];

/** Derive the selectable options and slider bounds from the loaded units. */
export const deriveFilterBounds = (units: PublicUnit[]): FilterBounds => {
  const beds = new Set<number>();
  const baths = new Set<number>();
  const types = new Set<string>();
  const features = new Set<string>();
  const orientations = new Set<string>();
  const availability = new Set<UnitAvailability>();
  const areas: number[] = [];
  const levels: number[] = [];
  const prices: number[] = [];

  for (const u of units) {
    if (typeof u.beds === 'number') beds.add(u.beds);
    if (typeof u.baths === 'number') baths.add(u.baths);
    if (u.unitType) types.add(u.unitType);
    if (u.orientation) orientations.add(u.orientation);
    availability.add(u.availability);
    (u.features ?? []).forEach((f) => features.add(f));
    const a = unitArea(u);
    if (typeof a === 'number' && a > 0) areas.push(a);
    if (typeof u.floorLevel === 'number') levels.push(u.floorLevel);
    if (!u.priceOnRequest && typeof u.price === 'number' && u.price > 0) prices.push(u.price);
  }

  const [areaMin, areaMax] = minMax(areas, true);
  const [levelMin, levelMax] = minMax(levels);
  const [priceMin, priceMax] = minMax(prices, true);
  return {
    bedOptions: sortedNums(beds),
    bathOptions: sortedNums(baths),
    types: Array.from(types).sort(),
    features: Array.from(features).sort(),
    flags: UNIT_FLAGS.filter((fl) => units.some((u) => unitHasFlag(u, fl))),
    orientations: Array.from(orientations).sort(),
    availability: Array.from(availability),
    areaMin,
    areaMax,
    levelMin,
    levelMax,
    priceMin,
    priceMax,
  };
};

const has = (xs?: readonly unknown[]) => !!xs && xs.length > 0;

/** Whether `criteria` constrains anything at all (for "any match" short-circuits). */
export const hasActiveCriteria = (c: UnitCriteria): boolean =>
  has(c.beds) ||
  has(c.types) ||
  has(c.features) ||
  has(c.baths) ||
  has(c.availability) ||
  has(c.orientations) ||
  has(c.flags) ||
  [c.minArea, c.maxArea, c.minLevel, c.maxLevel, c.minPrice, c.maxPrice].some((v) => v != null);

/** Count match where the top option means "N or more". */
const countMatches = (value: number | undefined, selected: number[], max?: number): boolean =>
  typeof value === 'number' && selected.some((sel) => (max != null && sel === max ? value >= sel : value === sel));

const inRange = (value: number | undefined | null, lo?: number, hi?: number): boolean => {
  if (lo == null && hi == null) return true;
  if (typeof value !== 'number') return false;
  return (lo == null || value >= lo) && (hi == null || value <= hi);
};

/**
 * Whether a unit satisfies the criteria. A constraint a unit can't answer
 * (an area bound on a unit with no area, a price bound on a "price on request"
 * unit) excludes it, so the explorer never implies a match it can't stand
 * behind. `bedsMax`/`bathsMax` are the "N+" thresholds.
 */
export const unitMatchesCriteria = (
  u: PublicUnit,
  c: UnitCriteria,
  bedsMax?: number,
  bathsMax?: number
): boolean => {
  if (has(c.beds) && !countMatches(u.beds, c.beds, bedsMax)) return false;
  if (has(c.baths) && !countMatches(u.baths, c.baths!, bathsMax)) return false;
  if (has(c.types) && !c.types.includes(u.unitType)) return false;
  if (has(c.availability) && !c.availability!.includes(u.availability)) return false;
  if (has(c.orientations)) {
    const o = u.orientation?.toLowerCase();
    if (!o || !c.orientations!.some((x) => x.toLowerCase() === o)) return false;
  }
  if (has(c.features)) {
    const owned = new Set(u.features ?? []);
    if (!c.features.every((f) => owned.has(f))) return false;
  }
  if (has(c.flags) && !c.flags!.every((fl) => unitHasFlag(u, fl))) return false;
  if (!inRange(unitArea(u), c.minArea, c.maxArea)) return false;
  if (!inRange(u.floorLevel, c.minLevel, c.maxLevel)) return false;
  const price = u.priceOnRequest ? undefined : u.price;
  if (!inRange(price, c.minPrice, c.maxPrice)) return false;
  return true;
};

/** The units matching `c`, with the N+ thresholds taken from the units themselves. */
export const filterUnits = (units: PublicUnit[], c: UnitCriteria, bounds = deriveFilterBounds(units)): PublicUnit[] => {
  if (!hasActiveCriteria(c)) return units;
  const bedsMax = bounds.bedOptions[bounds.bedOptions.length - 1];
  const bathsMax = bounds.bathOptions[bounds.bathOptions.length - 1];
  return units.filter((u) => unitMatchesCriteria(u, c, bedsMax, bathsMax));
};

/** Toggle a value in an optional list field, returning the next criteria. */
export const toggleIn = <K extends keyof UnitCriteria>(
  c: UnitCriteria,
  key: K,
  value: NonNullable<UnitCriteria[K]> extends Array<infer V> ? V : never
): UnitCriteria => {
  const list = ((c[key] as unknown[] | undefined) ?? []) as unknown[];
  const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  return { ...c, [key]: next };
};
