import { describe, it, expect } from 'vitest';
import { floorKindFor, floorLabelFor, levelsToAdd, nextFreeLevel, nextUnitNumbers } from './inventoryNaming';

const names = { ground: 'Ground floor', floor: (l: number) => `Floor ${l}`, basement: (n: number) => `Basement ${n}` };

describe('inventory naming', () => {
  it('suggests the next free level', () => {
    expect(nextFreeLevel([])).toBe(1);
    expect(nextFreeLevel([1, 2, 3])).toBe(4);
    expect(nextFreeLevel([-1, 0])).toBe(1);
  });

  it('names floors from their level', () => {
    expect(floorLabelFor(4, names)).toBe('Floor 4');
    expect(floorLabelFor(0, names)).toBe('Ground floor');
    expect(floorLabelFor(-2, names)).toBe('Basement 2');
    expect([floorKindFor(0), floorKindFor(-1), floorKindFor(3)]).toEqual(['ground', 'basement', 'standard']);
  });

  it('adds a range of levels, skipping existing ones', () => {
    expect(levelsToAdd(4, null, [])).toEqual([4]);
    expect(levelsToAdd(1, 5, [2, 3])).toEqual([1, 4, 5]);
    expect(levelsToAdd(5, 3, [])).toEqual([3, 4, 5]);
    expect(levelsToAdd(1, 500, [])).toHaveLength(100);
  });

  it('numbers units per floor and continues an existing pattern', () => {
    expect(nextUnitNumbers([], 4, 3)).toEqual(['401', '402', '403']);
    expect(nextUnitNumbers([], 4, 1, 'A')).toEqual(['A401']);
    expect(nextUnitNumbers([], -1, 1)).toEqual(['B101']);
    expect(nextUnitNumbers(['A-401', 'A-402'], 4, 2)).toEqual(['A-403', 'A-404']);
    expect(nextUnitNumbers(['T1009'], 10, 2)).toEqual(['T1010', 'T1011']);
    expect(nextUnitNumbers(['401', '403'], 4)).toEqual(['404']);
  });
});
