import { describe, it, expect } from 'vitest';
import { overlayInsets, FRAME_PADDING } from './mapOverlayInsets';

const MAP = { top: 0, left: 0, right: 1100, bottom: 1000 };
const P = FRAME_PADDING;

describe('overlayInsets', () => {
  it('keeps just the padding when nothing floats over the map', () => {
    expect(overlayInsets(MAP, [])).toEqual({ top: P, right: P, bottom: P, left: P });
  });

  it('clears the bottom toolbars and the top search bar', () => {
    const toolbars = { top: 780, bottom: 950, left: 490, right: 1060 };
    const search = { top: 10, bottom: 70, left: 300, right: 800 };
    const insets = overlayInsets(MAP, [toolbars, search]);
    expect(insets.bottom).toBe(1000 - 780 + P);
    expect(insets.top).toBe(70 + P);
    expect(insets.left).toBe(P);
  });

  it('treats a column of buttons as a side, not the top or bottom', () => {
    const column = { top: 60, bottom: 300, left: 1040, right: 1100 };
    const insets = overlayInsets(MAP, [column]);
    expect(insets.right).toBe(60 + P);
    expect(insets.top).toBe(P);
  });

  it('ignores overlays outside the map and never lets one side take over', () => {
    const outside = { top: 1200, bottom: 1300, left: 0, right: 100 };
    const huge = { top: 400, bottom: 1000, left: 0, right: 1100 };
    expect(overlayInsets(MAP, [outside]).bottom).toBe(P);
    expect(overlayInsets(MAP, [huge]).bottom).toBe(350);
  });
});
