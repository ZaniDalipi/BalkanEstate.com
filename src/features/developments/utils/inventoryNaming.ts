/**
 * Smart defaults for adding floors and units, so owners rarely type labels:
 * the next free level, a floor name from its level, and the next unit numbers
 * on a floor ("401, 402…" or continuing whatever pattern is already there).
 * Pure functions; translation happens in the caller through `FloorNames`.
 */

/** How floor names read in the current language. */
export interface FloorNames {
  ground: string;
  /** e.g. "Floor {{level}}" already formatted by the caller. */
  floor: (level: number) => string;
  basement: (n: number) => string;
}

/** The level after the highest one the building has; 1 when it has none. */
export const nextFreeLevel = (levels: number[]): number => (levels.length ? Math.max(...levels) + 1 : 1);

/** "Ground floor" for 0, "Basement 1" for -1, "Floor 4" for 4. */
export const floorLabelFor = (level: number, names: FloorNames): string =>
  level === 0 ? names.ground : level < 0 ? names.basement(-level) : names.floor(level);

/** The floor kind the server stores for a level. */
export const floorKindFor = (level: number): 'ground' | 'basement' | 'standard' =>
  level === 0 ? 'ground' : level < 0 ? 'basement' : 'standard';

/** Levels from `from` to `to` (either order), skipping ones the building already has. Capped at 100. */
export const levelsToAdd = (from: number, to: number | null, existing: number[]): number[] => {
  const end = to ?? from;
  const [lo, hi] = from <= end ? [from, end] : [end, from];
  const taken = new Set(existing);
  const out: number[] = [];
  for (let l = lo; l <= hi && out.length < 100; l += 1) if (!taken.has(l)) out.push(l);
  return out;
};

const TRAILING_NUMBER = /^(.*?)(\d+)$/;

/**
 * The next `count` unit numbers on a floor. Continues the floor's own pattern
 * when it has one ("A-401", "A-402" → "A-403"); otherwise starts at
 * `<prefix><level>01` ("401", or "A401" with prefix "A"). Never repeats a
 * number already on the floor.
 */
export const nextUnitNumbers = (existing: string[], level: number, count = 1, prefix = ''): string[] => {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  let stem: string;
  let next: number;
  let width: number;
  const numbered = existing.map((n) => TRAILING_NUMBER.exec(n)).filter((m): m is RegExpExecArray => !!m);
  if (numbered.length) {
    const last = numbered.reduce((a, b) => (Number(b[2]) > Number(a[2]) ? b : a));
    [stem, next, width] = [last[1], Number(last[2]) + 1, last[2].length];
  } else {
    const base = `${Math.abs(level)}01`;
    [stem, next, width] = [`${prefix}${level < 0 ? 'B' : ''}`, Number(base), base.length];
  }
  const out: string[] = [];
  while (out.length < Math.max(1, Math.min(count, 50))) {
    const candidate = `${stem}${String(next).padStart(width, '0')}`;
    if (!taken.has(candidate.toLowerCase())) out.push(candidate);
    next += 1;
  }
  return out;
};
