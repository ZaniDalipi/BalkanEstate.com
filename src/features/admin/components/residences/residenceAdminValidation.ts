/**
 * Checks for the admin residence dialogs (the server repeats them): a
 * building limit, months of pass, and extra free residences for an agency.
 */
export const MAX_BUILDING_LIMIT = 200;
export const MAX_GRANT_MONTHS = 120;
export const MAX_EXTRA_RESIDENCES = 20;

export type NumberProblem = 'required' | 'whole' | 'range' | 'belowUsed';

const whole = (raw: string): number | null => {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function buildingLimitProblem(raw: string, used: number): NumberProblem | null {
  const n = whole(raw);
  if (n === null) return 'required';
  if (!Number.isInteger(n)) return 'whole';
  if (n < 1 || n > MAX_BUILDING_LIMIT) return 'range';
  if (n < used) return 'belowUsed';
  return null;
}

export function rangeProblem(raw: string, max: number): NumberProblem | null {
  const n = whole(raw);
  if (n === null) return 'required';
  if (!Number.isInteger(n)) return 'whole';
  return n < 1 || n > max ? 'range' : null;
}
