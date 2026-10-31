import { describe, it, expect } from 'vitest';
import { buildingLimitProblem, rangeProblem } from './residenceAdminValidation';

describe('residence admin validation', () => {
  it('building limit: a whole number from 1 to 200, not below the buildings it has', () => {
    expect(buildingLimitProblem('', 2)).toBe('required');
    expect(buildingLimitProblem('2.5', 2)).toBe('whole');
    expect(buildingLimitProblem('abc', 2)).toBe('whole');
    expect(buildingLimitProblem('0', 0)).toBe('range');
    expect(buildingLimitProblem('201', 2)).toBe('range');
    expect(buildingLimitProblem('3', 4)).toBe('belowUsed');
    expect(buildingLimitProblem(' 8 ', 4)).toBeNull();
  });

  it('months and extra residences: a whole number in range', () => {
    expect(rangeProblem('', 120)).toBe('required');
    expect(rangeProblem('1.5', 120)).toBe('whole');
    expect(rangeProblem('0', 20)).toBe('range');
    expect(rangeProblem('21', 20)).toBe('range');
    expect(rangeProblem('12', 120)).toBeNull();
  });
});
