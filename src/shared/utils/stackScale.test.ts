import { describe, expect, it } from 'vitest';
import { stackOffsetPx, stackScaleTarget } from './stackScale';

describe('stack scale', () => {
  it('shrinks earlier cards more and leaves the last one at full size', () => {
    expect(stackScaleTarget(0, 4)).toBeCloseTo(0.88);
    expect(stackScaleTarget(2, 4)).toBeCloseTo(0.96);
    expect(stackScaleTarget(3, 4)).toBe(1);
    expect(stackScaleTarget(0, 1)).toBe(1);
    expect(stackOffsetPx(3)).toBe(72);
  });
});
