import { describe, it, expect } from 'vitest';
import { clampPan, clampZoom, fitSize, zoomAround, MAX_ZOOM } from './useEditorViewport';

describe('editor viewport math', () => {
  it('fits the image aspect inside the frame', () => {
    expect(fitSize({ w: 1000, h: 500 }, 1)).toEqual({ w: 500, h: 500 });
    expect(fitSize({ w: 800, h: 800 }, 2)).toEqual({ w: 800, h: 400 });
  });

  it('clamps zoom', () => {
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
  });

  it('zooms around the anchor so the point under the cursor stays put', () => {
    const v = { zoom: 1, tx: 0, ty: 0 };
    const anchor = { x: 200, y: 100 };
    const z = zoomAround(v, anchor, 2);
    // content point under anchor before: (200,100); after: (anchor - t)/zoom
    expect((anchor.x - z.tx) / z.zoom).toBeCloseTo(200);
    expect((anchor.y - z.ty) / z.zoom).toBeCloseTo(100);
  });

  it('centres smaller content and keeps larger content covering the frame', () => {
    const frame = { w: 1000, h: 500 };
    const base = { w: 500, h: 500 };
    expect(clampPan({ zoom: 1, tx: 123, ty: 9 }, frame, base)).toEqual({ zoom: 1, tx: 250, ty: 0 });
    const big = clampPan({ zoom: 4, tx: 50, ty: -5000 }, frame, base);
    expect(big.tx).toBe(0);
    expect(big.ty).toBe(500 - 2000);
  });
});
