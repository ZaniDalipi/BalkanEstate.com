import { describe, expect, it } from 'vitest';
import { arrivalSection, isResidenceSection, sectionState } from './residenceSections';

describe('arrivalSection', () => {
  it('reads the section the residence page was asked to open at', () => {
    expect(arrivalSection(sectionState('units'))).toBe('units');
    expect(arrivalSection({ section: 'location', other: 1 })).toBe('location');
  });

  it('ignores anything that is not one of its sections', () => {
    for (const state of [null, undefined, 'units', { section: 'builder' }, { section: '<img onerror=x>' }, { section: ['units'] }, {}]) {
      expect(arrivalSection(state)).toBeNull();
    }
  });

  it('knows which nav sections live on the residence page', () => {
    expect(isResidenceSection('overview')).toBe(true);
    expect(isResidenceSection('builder')).toBe(false);
  });
});
