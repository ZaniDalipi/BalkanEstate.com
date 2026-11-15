import { describe, it, expect } from 'vitest';
import { scrollEdges, wheelToHorizontal, pageStep } from './horizontalScroll';

describe('scrollEdges', () => {
  it('reports neither way when the row fits', () => {
    expect(scrollEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })).toEqual({ canScrollStart: false, canScrollEnd: false });
  });
  it('reports the end only at the start', () => {
    expect(scrollEdges({ scrollLeft: 0, scrollWidth: 900, clientWidth: 300 })).toEqual({ canScrollStart: false, canScrollEnd: true });
  });
  it('reports the start only at the end, allowing a fractional position', () => {
    expect(scrollEdges({ scrollLeft: 599.5, scrollWidth: 900, clientWidth: 300 })).toEqual({ canScrollStart: true, canScrollEnd: false });
  });
});

describe('wheelToHorizontal', () => {
  const middle = { canScrollStart: true, canScrollEnd: true };
  it('turns a vertical wheel sideways', () => {
    expect(wheelToHorizontal(0, 100, middle)).toBe(100);
    expect(wheelToHorizontal(0, -100, middle)).toBe(-100);
  });
  it('leaves trackpad swipes alone', () => {
    expect(wheelToHorizontal(80, 10, middle)).toBeNull();
  });
  it('hands the wheel back to the page at either end', () => {
    expect(wheelToHorizontal(0, 100, { canScrollStart: true, canScrollEnd: false })).toBeNull();
    expect(wheelToHorizontal(0, -100, { canScrollStart: false, canScrollEnd: true })).toBeNull();
  });
});

describe('pageStep', () => {
  it('moves three quarters of the view, at least 120px', () => {
    expect(pageStep(800)).toBe(600);
    expect(pageStep(100)).toBe(120);
  });
});
