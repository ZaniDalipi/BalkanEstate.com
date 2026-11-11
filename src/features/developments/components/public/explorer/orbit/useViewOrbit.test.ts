import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { PublicSceneView } from '../../../../types';
import { useViewOrbit } from './useViewOrbit';

const view = (viewKey: string): PublicSceneView => ({
  viewKey, viewName: viewKey, viewDirection: 'front', sortOrder: 0, imageUrl: `https://media.test/${viewKey}.jpg`, imageWidth: 1600, imageHeight: 900, hotspots: [],
});
const views = ['front', 'right', 'back', 'left'].map(view);

const setup = () => {
  const onViewIndex = vi.fn();
  const hook = renderHook(({ index, target }) => useViewOrbit(views, index, target, onViewIndex), { initialProps: { index: 0, target: 'b1' } });
  return { ...hook, onViewIndex };
};
/** Let the picture "preload" (it resolves at once where images can't be decoded ahead, as in tests). */
const settle = () => act(async () => { await Promise.resolve(); });

describe('useViewOrbit', () => {
  it('swings the way the buyer pressed, once the next picture is ready', async () => {
    const { result, rerender, onViewIndex } = setup();
    expect(result.current.move).toEqual({ kind: 'fade' });
    act(() => result.current.switchTo(1, 1));
    await settle();
    expect(onViewIndex).toHaveBeenCalledWith(1);
    rerender({ index: 1, target: 'b1' });
    expect(result.current.move).toEqual({ kind: 'orbit', dir: 1 });

    // With two views, "previous" and "next" lead to the same picture: the arrow decides the way round.
    act(() => result.current.switchTo(2, -1));
    await settle();
    rerender({ index: 2, target: 'b1' });
    expect(result.current.move).toEqual({ kind: 'orbit', dir: -1 });
  });

  it('goes the short way round when the view changes some other way (a link, Back)', () => {
    const { result, rerender } = setup();
    rerender({ index: 3, target: 'b1' });
    expect(result.current.move).toEqual({ kind: 'orbit', dir: -1 });
    rerender({ index: 0, target: 'b1' });
    expect(result.current.move).toEqual({ kind: 'orbit', dir: 1 });
  });

  it('a dot jumps the short way round too', async () => {
    const { result, rerender } = setup();
    act(() => result.current.switchTo(3));
    await settle();
    rerender({ index: 3, target: 'b1' });
    expect(result.current.move).toEqual({ kind: 'orbit', dir: -1 });
  });

  it('does not orbit into another building: it fades', () => {
    const { result, rerender } = setup();
    rerender({ index: 1, target: 'b2' });
    expect(result.current.move).toEqual({ kind: 'fade' });
  });

  it('only the last of quick presses switches', async () => {
    const { result, onViewIndex } = setup();
    act(() => {
      result.current.switchTo(1, 1);
      result.current.switchTo(3, -1);
    });
    await settle();
    expect(onViewIndex).toHaveBeenCalledTimes(1);
    expect(onViewIndex).toHaveBeenCalledWith(3);
  });

  it('rides the elevator between floors, and zooms between the building and a floor', () => {
    const onViewIndex = vi.fn();
    const { result, rerender } = renderHook(({ target, level }) => useViewOrbit(views, 0, target, onViewIndex, level), {
      initialProps: { target: 'residence/b:1', level: undefined as number | undefined },
    });
    rerender({ target: 'residence/b:1/f:g', level: 0 });
    expect(result.current.move).toEqual({ kind: 'zoom', dir: 1 });
    rerender({ target: 'residence/b:1/f:3', level: 3 });
    expect(result.current.move).toEqual({ kind: 'lift', dir: 1 });
    rerender({ target: 'residence/b:1/f:1', level: 1 });
    expect(result.current.move).toEqual({ kind: 'lift', dir: -1 });
    rerender({ target: 'residence/b:1', level: undefined });
    expect(result.current.move).toEqual({ kind: 'zoom', dir: -1 });
  });
});
