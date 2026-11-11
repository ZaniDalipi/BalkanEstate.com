import { afterEach, describe, expect, it } from 'vitest';
import { apartmentBox, isOnScreen, PLAN_POSES, riseFrom } from './showcaseMotion';

const target = { left: 200, top: 100, width: 600, height: 450 };

describe('riseFrom', () => {
  it('starts the plan flat and invisible right over the apartment, shrunk to its size', () => {
    const from = riseFrom({ left: 900, top: 300, width: 60, height: 30 }, target);
    // Apartment centre (930, 315) minus the plan's centre (500, 325).
    expect(from).toMatchObject({ x: 430, y: -10, rotateX: 0, rotateZ: 0, opacity: 0 });
    expect(from.scale).toBeCloseTo(0.1);
  });

  it('never starts bigger than the plan itself', () => {
    expect(riseFrom({ left: 0, top: 0, width: 2000, height: 2000 }, target).scale).toBe(1);
  });

  it('rises from just below its place when the apartment is not on screen or nothing is measured yet', () => {
    const below = { x: 0, y: 48, scale: 0.92, rotateX: 0, rotateZ: 0, opacity: 0 };
    expect(riseFrom(null, target)).toEqual(below);
    expect(riseFrom({ left: 0, top: 0, width: 50, height: 50 }, null)).toEqual(below);
    expect(riseFrom({ left: 0, top: 0, width: 50, height: 50 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual(below);
  });

  it('rests tilted like a model, or flat to read it', () => {
    expect(PLAN_POSES.tilted).toMatchObject({ x: 0, y: 0, opacity: 1 });
    expect(PLAN_POSES.tilted.rotateX).toBeGreaterThan(0);
    expect(PLAN_POSES.flat).toEqual({ x: 0, y: 0, scale: 1, rotateX: 0, rotateZ: 0, opacity: 1 });
  });
});

describe('isOnScreen', () => {
  const viewport = { width: 1000, height: 800 };
  it('is true when any of the box is inside the viewport', () => {
    expect(isOnScreen({ left: 980, top: 10, width: 50, height: 50 }, viewport)).toBe(true);
    expect(isOnScreen({ left: -40, top: -40, width: 50, height: 50 }, viewport)).toBe(true);
  });
  it('is false for boxes outside it or without size', () => {
    expect(isOnScreen({ left: 1000, top: 10, width: 50, height: 50 }, viewport)).toBe(false);
    expect(isOnScreen({ left: 10, top: -60, width: 50, height: 50 }, viewport)).toBe(false);
    expect(isOnScreen({ left: 10, top: 10, width: 0, height: 50 }, viewport)).toBe(false);
  });
});

describe('apartmentBox', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  const place = (box: { left: number; top: number; width: number; height: number }) => {
    const el = document.createElement('div');
    el.setAttribute('data-unit-id', 'u1');
    el.getBoundingClientRect = () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => ({}) });
    document.body.appendChild(el);
  };

  it('finds the apartment where the buyer can see it, skipping copies off screen', () => {
    place({ left: 0, top: -500, width: 40, height: 20 });
    place({ left: 300, top: 200, width: 40, height: 20 });
    expect(apartmentBox('u1')).toEqual({ left: 300, top: 200, width: 40, height: 20 });
  });

  it('is null when the apartment is not drawn or not on screen', () => {
    expect(apartmentBox('u1')).toBeNull();
    place({ left: 0, top: -500, width: 40, height: 20 });
    expect(apartmentBox('u1')).toBeNull();
  });
});
