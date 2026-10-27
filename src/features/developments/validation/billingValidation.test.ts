import { describe, it, expect } from 'vitest';
import { codeProblem, quantityProblem } from './billingValidation';

describe('billingValidation', () => {
  it('needs a code of letters, digits, - or _', () => {
    expect(codeProblem('')).toBe('empty');
    expect(codeProblem('   ')).toBe('empty');
    expect(codeProblem('ab')).toBe('format');
    expect(codeProblem('RES 100')).toBe('format');
    expect(codeProblem(' res-100_x ')).toBeNull();
  });

  it('buys 1 to 50 whole buildings', () => {
    expect(quantityProblem(1)).toBeNull();
    expect(quantityProblem(50)).toBeNull();
    expect(quantityProblem(0)).toBe('range');
    expect(quantityProblem(51)).toBe('range');
    expect(quantityProblem(1.5)).toBe('range');
  });
});
