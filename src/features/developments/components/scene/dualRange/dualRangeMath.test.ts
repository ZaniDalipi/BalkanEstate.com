import { describe, it, expect } from 'vitest';
import { moveThumb, pickThumb, snapValue, valueForKey, valueFromPosition } from './dualRangeMath';

describe('dualRangeMath', () => {
  it('snaps to the step grid and clamps', () => {
    expect(snapValue(42.4, 38, 128, 1)).toBe(42);
    expect(snapValue(41, 38, 128, 5)).toBe(43);
    expect(snapValue(0.30000000000000004, 0, 1, 0.1)).toBe(0.3);
    expect(snapValue(500, 38, 128, 1)).toBe(128);
    expect(snapValue(-5, 38, 128, 1)).toBe(38);
  });

  it('maps a pointer position onto the range', () => {
    expect(valueFromPosition(100, 100, 200, 1, 7, 1)).toBe(1);
    expect(valueFromPosition(200, 100, 200, 1, 7, 1)).toBe(4);
    expect(valueFromPosition(999, 100, 200, 1, 7, 1)).toBe(7);
    expect(valueFromPosition(50, 0, 0, 1, 7, 1)).toBe(1);
  });

  it('picks the nearer thumb', () => {
    expect(pickThumb(2, 1, 7, 1, 7)).toBe('low');
    expect(pickThumb(6, 1, 7, 1, 7)).toBe('high');
  });

  it('frees stacked thumbs in the direction they can move', () => {
    expect(pickThumb(7, 7, 7, 1, 7)).toBe('low');
    expect(pickThumb(1, 1, 1, 1, 7)).toBe('high');
    expect(pickThumb(3, 4, 4, 1, 7)).toBe('low');
    expect(pickThumb(5, 4, 4, 1, 7)).toBe('high');
  });

  it('never lets the thumbs cross', () => {
    expect(moveThumb('low', 9, 2, 5)).toEqual([5, 5]);
    expect(moveThumb('high', 1, 2, 5)).toEqual([2, 2]);
  });

  it('handles slider keys', () => {
    expect(valueForKey('ArrowRight', 3, 1, 7, 1)).toBe(4);
    expect(valueForKey('ArrowDown', 1, 1, 7, 1)).toBe(1);
    expect(valueForKey('Home', 5, 1, 7, 1)).toBe(1);
    expect(valueForKey('End', 5, 1, 7, 1)).toBe(7);
    expect(valueForKey('PageUp', 0, 0, 100, 1)).toBe(10);
    expect(valueForKey('a', 5, 1, 7, 1)).toBeNull();
  });
});
