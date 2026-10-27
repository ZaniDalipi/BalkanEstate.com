import { describe, it, expect } from 'vitest';
import { availablePlaceholders, durationMonths, replacePlaceholders } from './featurePlaceholders';

describe('residence placeholders', () => {
  it('fills the residence numbers from the product', () => {
    expect(replacePlaceholders('{durationMonths} months public', { durationDays: 365 })).toBe('12 months public');
    expect(replacePlaceholders('{includedBuildings} buildings included', { includedBuildings: 7 })).toBe('7 buildings included');
    expect(replacePlaceholders('{residencesPerYear} free residence per year', { residencesPerYear: 1 })).toBe('1 free residence per year');
  });

  it('counts whole months like the residence rules', () => {
    expect(durationMonths(365)).toBe(12);
    expect(durationMonths(182)).toBe(6);
    expect(durationMonths(0)).toBeUndefined();
  });

  it('offers them in the admin placeholder list', () => {
    const keys = availablePlaceholders.map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(['{durationMonths}', '{includedBuildings}', '{residencesPerYear}']));
  });
});
