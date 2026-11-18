import { describe, it, expect } from 'vitest';
import { climateRiskLabelKey, isClimateRisk } from './climateRisk';

describe('climateRisk', () => {
  it('accepts only known overlays', () => {
    expect(isClimateRisk('flood')).toBe(true);
    expect(isClimateRisk('tsunami')).toBe(false);
    expect(isClimateRisk(undefined)).toBe(false);
  });
  it('maps risks to their short label keys', () => {
    expect(climateRiskLabelKey('none')).toBe('off');
    expect(climateRiskLabelKey('air')).toBe('air');
    expect(climateRiskLabelKey('heat')).toBe('heat');
  });
});
