/**
 * Browser Zoom Compensation Tests
 *
 * Guards the two things the search page regressed on: the zoom level must be
 * read as an exact browser step (so scrollbar noise never registers as zoom),
 * and the compensation must only ever trim text — never scale the layout, which
 * is what used to leave a dead white band under the page at 125%+.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTextScale,
  detectZoomRatio,
  snapZoomRatio,
  MIN_TEXT_SCALE,
  ZOOM_THRESHOLD,
} from '../app/hooks/useZoomCompensation';

describe('snapZoomRatio', () => {
  it('snaps scrollbar/border noise at 100% back to exactly 1', () => {
    // 1920px window, 1905px viewport once the scrollbar is taken out
    expect(snapZoomRatio(1920 / 1905)).toBe(1);
    expect(snapZoomRatio(1.01)).toBe(1);
    expect(snapZoomRatio(1.04)).toBe(1);
  });

  it('snaps measured ratios to the browser zoom step they came from', () => {
    expect(snapZoomRatio(1.108)).toBe(1.1);
    expect(snapZoomRatio(1.262)).toBe(1.25);
    expect(snapZoomRatio(1.52)).toBe(1.5);
    expect(snapZoomRatio(2.03)).toBe(2);
  });

  it('leaves a ratio that matches no zoom step alone', () => {
    expect(snapZoomRatio(1.35)).toBe(1.35);
  });

  it('is defensive about nonsense input', () => {
    expect(snapZoomRatio(NaN)).toBe(1);
    expect(snapZoomRatio(0)).toBe(1);
    expect(snapZoomRatio(-2)).toBe(1);
  });
});

describe('computeTextScale', () => {
  it('does not touch text at 100% zoom', () => {
    expect(computeTextScale(1)).toBe(1);
  });

  it('does not touch text when the page is zoomed out', () => {
    expect(computeTextScale(0.9)).toBe(1);
    expect(computeTextScale(0.5)).toBe(1);
  });

  it('ignores anything at or below the detection threshold', () => {
    expect(computeTextScale(ZOOM_THRESHOLD)).toBe(1);
  });

  it('trims text a little as the user zooms in', () => {
    expect(computeTextScale(1.1)).toBe(0.95);
    expect(computeTextScale(1.25)).toBe(0.88);
  });

  it('never shrinks below the readable floor', () => {
    for (const ratio of [1.5, 1.75, 2, 3, 5]) {
      expect(computeTextScale(ratio)).toBe(MIN_TEXT_SCALE);
    }
  });

  it('scales monotonically — more zoom is never larger text', () => {
    const ratios = [1, 1.1, 1.25, 1.5, 1.75, 2];
    const scales = ratios.map(computeTextScale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeLessThanOrEqual(scales[i - 1]);
    }
  });

  it('still leaves zoomed-in text physically larger than at 100%', () => {
    // The point of the compensation is density, not undoing the user's zoom.
    for (const ratio of [1.1, 1.25, 1.5, 2]) {
      expect(computeTextScale(ratio) * ratio).toBeGreaterThan(1);
    }
  });
});

describe('detectZoomRatio', () => {
  const win = (outerWidth: number, innerWidth: number) =>
    ({ outerWidth, innerWidth }) as Window;

  it('reads a zoomed-in window as its zoom step', () => {
    expect(detectZoomRatio(win(1920, 1536))).toBe(1.25);
    expect(detectZoomRatio(win(1440, 960))).toBe(1.5);
  });

  it('reads an unzoomed window with a scrollbar as 100%', () => {
    expect(detectZoomRatio(win(1440, 1425))).toBe(1);
  });

  it('falls back to 100% when the window cannot be measured', () => {
    expect(detectZoomRatio(win(0, 0))).toBe(1);
    expect(detectZoomRatio(win(80, 80))).toBe(1);
  });
});
