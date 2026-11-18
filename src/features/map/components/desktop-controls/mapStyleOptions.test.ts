import { describe, it, expect } from 'vitest';
import { isDesktopMapStyle, planStyleChange } from './mapStyleOptions';

describe('mapStyleOptions', () => {
  it('accepts only the bar styles', () => {
    expect(isDesktopMapStyle('street')).toBe(true);
    expect(isDesktopMapStyle('hybrid')).toBe(false);
    expect(isDesktopMapStyle(3)).toBe(false);
  });

  it('clears a drawn area only when switching to Clean', () => {
    expect(planStyleChange('clean', true)).toEqual({ style: 'clean', clearDrawnArea: true });
    expect(planStyleChange('clean', false)).toEqual({ style: 'clean', clearDrawnArea: false });
    expect(planStyleChange('color', true)).toEqual({ style: 'color', clearDrawnArea: false });
  });

  it('ignores unknown styles', () => {
    expect(planStyleChange('neon', true)).toBeNull();
  });
});
