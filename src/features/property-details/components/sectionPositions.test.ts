import { describe, it, expect } from 'vitest';
import { orderByPosition, pickActiveSection } from './sectionPositions';

describe('pickActiveSection', () => {
  it('is the page top before any section reaches the line', () => {
    expect(pickActiveSection([{ key: 'details', top: 300, pinned: false }], 140)).toBe('top');
  });

  it('is the section that most recently reached the line, nested ones included', () => {
    const positions = [
      { key: 'neighborhood', top: -900, pinned: false },
      { key: 'air-quality', top: -500, pinned: false },
      { key: 'noise', top: -80, pinned: false },
      { key: 'traffic', top: 400, pinned: false },
    ];
    expect(pickActiveSection(positions, 140)).toBe('noise');
  });

  it('ignores the sticky sidebar, which is always on screen', () => {
    const positions = [
      { key: 'noise', top: -200, pinned: false },
      { key: 'availability', top: 80, pinned: true },
      { key: 'calculators', top: 120, pinned: true },
    ];
    expect(pickActiveSection(positions, 140)).toBe('noise');
  });

  it('does not depend on the order it is given', () => {
    const positions = [
      { key: 'similar', top: 900, pinned: false },
      { key: 'map', top: -1500, pinned: false },
      { key: 'price-history', top: 20, pinned: false },
    ];
    expect(pickActiveSection(positions, 140)).toBe('price-history');
  });
});

describe('pickActiveSection at the edges', () => {
  it('prefers the section nested at the start of another', () => {
    const positions = [
      { key: 'area-prices', top: 100, pinned: false },
      { key: 'zone-dynamics', top: 100, pinned: false },
    ];
    expect(pickActiveSection(positions, 140)).toBe('zone-dynamics');
  });

  it('at the bottom of the page, is the last section in view even if it cannot reach the line', () => {
    const positions = [
      { key: 'area-prices', top: -300, pinned: false },
      { key: 'similar', top: 450, pinned: false },
      { key: 'calculators', top: 120, pinned: true },
    ];
    expect(pickActiveSection(positions, 140)).toBe('area-prices');
    expect(pickActiveSection(positions, 140, 'top', { viewportHeight: 800 })).toBe('similar');
  });
});

describe('orderByPosition', () => {
  it('sorts top to bottom and keeps the given order on a tie', () => {
    expect(orderByPosition([
      { key: 'neighborhood', naturalTop: 1800 },
      { key: 'map', naturalTop: 1200 },
      { key: 'details', naturalTop: 600 },
      { key: 'air-quality', naturalTop: 1800 },
    ])).toEqual(['details', 'map', 'neighborhood', 'air-quality']);
  });
});
