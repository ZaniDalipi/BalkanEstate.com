import { describe, it, expect } from 'vitest';
import { menuPositionAbove } from './useAnchoredMenuPosition';

const rect = (left: number, top: number) => ({ left, top } as DOMRect);

describe('menuPositionAbove', () => {
  it('opens just above the anchor, on its left edge', () => {
    expect(menuPositionAbove(rect(12, 700), 224, 1440, 900)).toEqual({ left: 12, bottom: 208 });
  });

  it('keeps the menu on screen when the anchor sits near the right edge', () => {
    expect(menuPositionAbove(rect(1400, 700), 224, 1440, 900).left).toBe(1440 - 224 - 8);
  });

  it('never starts past the left edge', () => {
    expect(menuPositionAbove(rect(-20, 700), 224, 1440, 900).left).toBe(8);
  });
});
