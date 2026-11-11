import { describe, expect, it } from 'vitest';
import { sceneMove, type SceneSpot } from './sceneMove';

const at = (targetKey: string, over: Partial<SceneSpot> = {}): SceneSpot => ({ targetKey, index: 0, count: 3, ...over });

describe('sceneMove', () => {
  it('orbits between camera views of the same building, the way the buyer pressed or the short way round', () => {
    expect(sceneMove(at('residence/b:1'), at('residence/b:1', { index: 1 }))).toEqual({ kind: 'orbit', dir: 1 });
    expect(sceneMove(at('residence/b:1'), at('residence/b:1', { index: 2 }))).toEqual({ kind: 'orbit', dir: -1 });
    expect(sceneMove(at('residence/b:1', { count: 2 }), at('residence/b:1', { index: 1, count: 2 }), -1)).toEqual({ kind: 'orbit', dir: -1 });
  });

  it('rides the elevator between floors of one building', () => {
    expect(sceneMove(at('b:1/f:g', { level: 0 }), at('b:1/f:3', { level: 3 }))).toEqual({ kind: 'lift', dir: 1 });
    expect(sceneMove(at('b:1/f:3', { level: 3 }), at('b:1/f:1', { level: 1 }))).toEqual({ kind: 'lift', dir: -1 });
  });

  it('zooms from the building into a floor and back out', () => {
    expect(sceneMove(at('residence/b:1'), at('residence/b:1/f:2', { level: 2 }))).toEqual({ kind: 'zoom', dir: 1 });
    expect(sceneMove(at('residence/b:1/f:2', { level: 2 }), at('residence/b:1'))).toEqual({ kind: 'zoom', dir: -1 });
  });

  it('fades to another building, to the residence, or when floor levels are unknown', () => {
    expect(sceneMove(at('residence/b:1'), at('residence/b:2'))).toEqual({ kind: 'fade' });
    expect(sceneMove(at('residence/b:1'), at('residence'))).toEqual({ kind: 'fade' });
    expect(sceneMove(at('b:1/f:a'), at('b:1/f:b'))).toEqual({ kind: 'fade' });
    expect(sceneMove(at('b:1/f:a', { level: 2 }), at('b:2/f:b', { level: 3 }))).toEqual({ kind: 'fade' });
  });
});
