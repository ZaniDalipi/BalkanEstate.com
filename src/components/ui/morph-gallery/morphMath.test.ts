import { describe, it, expect } from 'vitest';
import {
  wrapIndex,
  easeInOutQuint,
  coverScale,
  containScale,
  stepsBetween,
  driftDirection,
  textureWindow,
} from './morphMath';

describe('wrapIndex', () => {
  it('wraps both ways when looping', () => {
    expect(wrapIndex(5, 5, true)).toBe(0);
    expect(wrapIndex(-1, 5, true)).toBe(4);
  });
  it('clamps when not looping', () => {
    expect(wrapIndex(9, 5, false)).toBe(4);
    expect(wrapIndex(-3, 5, false)).toBe(0);
  });
  it('answers 0 for an empty gallery', () => {
    expect(wrapIndex(3, 0, true)).toBe(0);
  });
});

describe('easeInOutQuint', () => {
  it('starts at 0, ends at 1, crosses the middle at 0.5', () => {
    expect(easeInOutQuint(0)).toBe(0);
    expect(easeInOutQuint(1)).toBe(1);
    expect(easeInOutQuint(0.5)).toBeCloseTo(0.5);
  });
  it('clamps out-of-range input', () => {
    expect(easeInOutQuint(-1)).toBe(0);
    expect(easeInOutQuint(2)).toBe(1);
  });
});

describe('cover and contain scales', () => {
  it('cover crops: both factors at most 1', () => {
    expect(coverScale(16 / 9, 3 / 4)).toEqual([1, (3 / 4) / (16 / 9)]);
    expect(coverScale(3 / 4, 16 / 9)).toEqual([(3 / 4) / (16 / 9), 1]);
  });
  it('contain letterboxes: both factors at least 1', () => {
    // A portrait photo in a wide frame: the bars are left and right.
    expect(containScale(16 / 9, 3 / 4)).toEqual([(16 / 9) / (3 / 4), 1]);
    // A wide photo in a tall frame: the bars are top and bottom.
    expect(containScale(3 / 4, 16 / 9)).toEqual([1, (16 / 9) / (3 / 4)]);
  });
});

describe('stepsBetween and driftDirection', () => {
  it('takes the short way round when looping', () => {
    expect(stepsBetween(9, 0, 10, true)).toBe(1);
    expect(stepsBetween(0, 9, 10, true)).toBe(-1);
    expect(driftDirection(9, 0, 10, true)).toBe(1);
  });
  it('goes the long way when not looping', () => {
    expect(stepsBetween(9, 0, 10, false)).toBe(-9);
    expect(driftDirection(9, 0, 10, false)).toBe(-1);
  });
});

describe('textureWindow', () => {
  it('holds the active photo first, then neighbours nearest first', () => {
    expect(textureWindow(4, 10, true, 2)).toEqual([4, 5, 3, 6, 2]);
  });
  it('wraps round the ends when looping', () => {
    expect(textureWindow(0, 10, true, 1)).toEqual([0, 1, 9]);
  });
  it('stops at the ends when not looping', () => {
    expect(textureWindow(0, 10, false, 2)).toEqual([0, 1, 2]);
  });
  it('never repeats a photo in a short gallery', () => {
    expect(textureWindow(0, 3, true, 2)).toEqual([0, 1, 2]);
  });
  it('bounds GPU memory regardless of gallery size', () => {
    expect(textureWindow(20, 40, true, 2)).toHaveLength(5);
  });
});
