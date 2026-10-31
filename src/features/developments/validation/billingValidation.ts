/**
 * Client checks for a Residence Pass order (the server repeats them):
 * the unlock code and the number of extra buildings.
 */
export const MAX_EXTRA_BUILDINGS = 50;

export type CodeProblem = 'empty' | 'format';
export type QuantityProblem = 'range';

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;

export function codeProblem(raw: string): CodeProblem | null {
  const code = raw.trim();
  if (!code) return 'empty';
  return CODE_PATTERN.test(code) ? null : 'format';
}

export function quantityProblem(n: number): QuantityProblem | null {
  return Number.isInteger(n) && n >= 1 && n <= MAX_EXTRA_BUILDINGS ? null : 'range';
}
