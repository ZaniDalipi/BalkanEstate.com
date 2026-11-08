import { describe, expect, it } from 'vitest';
import { orbitDirection } from './orbitDirection';

describe('orbitDirection', () => {
  it('goes the short way round the ring of views', () => {
    expect(orbitDirection(0, 1, 4)).toBe(1);
    expect(orbitDirection(1, 0, 4)).toBe(-1);
    // Front → left of front, right, back, left: from the front, "left" is one step back.
    expect(orbitDirection(0, 3, 4)).toBe(-1);
    expect(orbitDirection(3, 0, 4)).toBe(1);
  });

  it('breaks a tie forwards', () => {
    expect(orbitDirection(0, 2, 4)).toBe(1);
    expect(orbitDirection(0, 1, 2)).toBe(1);
    expect(orbitDirection(1, 0, 2)).toBe(1);
  });

  it('does not orbit to the same view, an unknown one, or with a single view', () => {
    expect(orbitDirection(2, 2, 4)).toBe(0);
    expect(orbitDirection(-1, 2, 4)).toBe(0);
    expect(orbitDirection(0, 0, 1)).toBe(0);
  });
});
