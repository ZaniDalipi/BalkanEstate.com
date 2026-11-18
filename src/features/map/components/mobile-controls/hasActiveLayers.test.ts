import { describe, it, expect } from 'vitest';
import { hasActiveLayers, type ActiveLayerFlags } from './hasActiveLayers';

const off: ActiveLayerFlags = {
  selectedClimateRisk: 'none', showOnlyPromoted: false, show3DBuildings: false,
  showLandmarks: false, showMeasurement: false, showTerrain: false, showCadastre: false,
};

describe('hasActiveLayers', () => {
  it('is false for the plain map', () => expect(hasActiveLayers(off)).toBe(false));
  it('is true for any overlay or layer', () => {
    expect(hasActiveLayers({ ...off, selectedClimateRisk: 'heat' })).toBe(true);
    expect(hasActiveLayers({ ...off, showCadastre: true })).toBe(true);
  });
});
