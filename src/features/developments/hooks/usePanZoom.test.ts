import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { clampTransform, fitBox, usePanZoom, zoomAt } from './usePanZoom';

const mouse = (x: number, y: number, extra = {}) =>
  ({ pointerId: 1, clientX: x, clientY: y, pointerType: 'mouse', button: 0, currentTarget: null, ...extra }) as never;

const setup = () => {
  const hook = renderHook(() => usePanZoom());
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
  hook.result.current.containerRef.current = el;
  return hook;
};

describe('usePanZoom', () => {
  it('a press without movement is a tap, not a drag', () => {
    const { result } = setup();
    act(() => {
      result.current.handlers.onPointerDown(mouse(100, 100));
      result.current.handlers.onPointerMove(mouse(102, 101));
      result.current.handlers.onPointerUp(mouse(102, 101));
    });
    expect(result.current.consumeDrag()).toBe(false);
  });

  it('movement past the threshold is a drag, reported once', () => {
    const { result } = setup();
    act(() => result.current.zoomIn());
    act(() => {
      result.current.handlers.onPointerDown(mouse(100, 100));
      result.current.handlers.onPointerMove(mouse(140, 100));
      result.current.handlers.onPointerUp(mouse(140, 100));
    });
    expect(result.current.consumeDrag()).toBe(true);
    expect(result.current.consumeDrag()).toBe(false);
  });

  it('pans only within the zoomed bounds and resets', () => {
    const { result } = setup();
    act(() => {
      result.current.handlers.onPointerDown(mouse(100, 100));
      result.current.handlers.onPointerMove(mouse(300, 150));
      result.current.handlers.onPointerUp(mouse(300, 150));
    });
    // At 1× there is nowhere to pan.
    expect(result.current.transform).toEqual({ scale: 1, x: 0, y: 0 });
    act(() => result.current.zoomIn());
    expect(result.current.isZoomed).toBe(true);
    act(() => result.current.reset());
    expect(result.current.transform.scale).toBe(1);
  });

  it('a touch double-tap zooms and is not treated as a tap', () => {
    const { result } = setup();
    const touch = (x: number) => mouse(x, 50, { pointerType: 'touch' });
    act(() => {
      result.current.handlers.onPointerDown(touch(200));
      result.current.handlers.onPointerUp(touch(200));
      result.current.handlers.onPointerDown(touch(201));
      result.current.handlers.onPointerUp(touch(201));
    });
    expect(result.current.transform.scale).toBe(2);
    expect(result.current.consumeDrag()).toBe(true);
  });
});

describe('pan/zoom math', () => {
  it('zoomAt keeps the point under the cursor fixed', () => {
    const t = zoomAt({ scale: 1, x: 0, y: 0 }, 2, 100, 50);
    expect(t).toEqual({ scale: 2, x: -100, y: -50 });
  });
  it('clampTransform keeps the content covering the frame', () => {
    expect(clampTransform({ scale: 2, x: 50, y: -999 }, { width: 400, height: 200 })).toEqual({ scale: 2, x: 0, y: -200 });
    expect(clampTransform({ scale: 9, x: 0, y: 0 }, { width: 400, height: 200 }).scale).toBe(4);
  });
});

describe('fitBox', () => {
  it('centres the region and zooms until it fills about half the frame', () => {
    const t = fitBox({ minX: 0.4, minY: 0.4, maxX: 0.6, maxY: 0.6 }, { width: 1000, height: 500 });
    expect(t.scale).toBeCloseTo(2.5);
    // The region's centre (500, 250) lands in the middle of the frame.
    expect(500 * t.scale + t.x).toBeCloseTo(500);
    expect(250 * t.scale + t.y).toBeCloseTo(250);
  });

  it('never zooms less than 1.5× nor past the maximum', () => {
    expect(fitBox({ minX: 0, minY: 0, maxX: 1, maxY: 1 }, { width: 100, height: 100 }).scale).toBe(1.5);
    expect(fitBox({ minX: 0.5, minY: 0.5, maxX: 0.501, maxY: 0.501 }, { width: 100, height: 100 }, 4).scale).toBe(4);
  });
});
