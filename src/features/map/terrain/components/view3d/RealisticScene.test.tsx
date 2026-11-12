import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

import RealisticScene from './RealisticScene';
import { analyzeTerrain } from '../../utils/analyzeTerrain';
import { makeGrid, wholeGrid } from '../../utils/testGrid';

// Land rising to the east with flat ground on the west: several slope zones and a best spot.
const grid = makeGrid(12, 12, (_r, c) => (c < 6 ? 400 : 400 + (c - 5) * 3));
const polygon = wholeGrid(grid);
const result = analyzeTerrain(grid, polygon);
if (result.ok === false) throw new Error(result.error);
const analysis = result.value;

type Options = Record<string, unknown>;
/** Stand-ins for Google's 3D elements: plain elements carrying the options they were made with. */
const element = (kind: string) => function Fake(this: unknown, options: Options = {}) {
  const el = document.createElement('div');
  el.dataset.kind = kind;
  Object.assign(el, options);
  return el;
} as unknown as new (o?: Options) => HTMLElement;

let map: HTMLElement & Record<string, unknown>;
function MapFake(this: unknown, options: Options = {}) {
  const el = document.createElement('div') as unknown as HTMLElement & Record<string, unknown>;
  el.dataset.kind = 'map';
  Object.assign(el, options);
  el.flyCameraTo = vi.fn(({ endCamera }: { endCamera: Options }) => Object.assign(el, endCamera));
  el.flyCameraAround = vi.fn();
  el.stopCameraAnimation = vi.fn();
  map = el;
  return el;
}

const importLibrary = vi.fn(async () => ({
  Map3DElement: MapFake,
  Polygon3DElement: element('polygon'),
  Polyline3DElement: element('polyline'),
  Marker3DElement: element('marker'),
}));

beforeEach(() => {
  (window as unknown as { google: unknown }).google = { maps: { importLibrary } };
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { google?: unknown }).google;
});

const show = async (scene: 'slope' | 'photo', props: Partial<React.ComponentProps<typeof RealisticScene>> = {}) => {
  const onScene = vi.fn();
  const onUnavailable = vi.fn();
  const view = render(
    <RealisticScene analysis={analysis} polygon={polygon} scene={scene} onScene={onScene} onUnavailable={onUnavailable} reduceMotion={false} {...props} />,
  );
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return { onScene, onUnavailable, rerender: view.rerender };
};
const kinds = (kind: string) => Array.from(map.children).filter((c) => (c as HTMLElement).dataset.kind === kind) as Array<HTMLElement & Record<string, unknown>>;

describe('RealisticScene', () => {
  it("opens Google's photorealistic 3D over the area, tilted and looking uphill", async () => {
    await show('slope');
    expect(importLibrary).toHaveBeenCalledWith('maps3d');
    expect(map.mode).toBe('SATELLITE');
    expect(map.tilt).toBeGreaterThan(50);
    expect(map.heading).toBe(90);
    expect((map.center as { altitude: number }).altitude).toBeGreaterThan(400);
  });

  it('lays the slope zones and the outline on the ground, and stands the house with its label at the best spot', async () => {
    await show('slope');
    const polygons = kinds('polygon');
    const zones = polygons.filter((p) => p.altitudeMode === 'CLAMP_TO_GROUND');
    const house = polygons.filter((p) => p.altitudeMode === 'RELATIVE_TO_GROUND');
    expect(zones.length).toBeGreaterThanOrEqual(2);
    expect(String(zones[0].fillColor)).toMatch(/^rgba\(/);
    expect(house).toHaveLength(5); // walls, two gables, two roof slopes
    expect(house.filter((p) => p.extruded)).toHaveLength(1);
    expect(kinds('polyline')).toHaveLength(1);
    expect(kinds('marker')[0].label).toBe('Best spot');
  });

  it('takes the zones away for the plain satellite view', async () => {
    const { rerender, onScene, onUnavailable } = await show('slope');
    const before = kinds('polygon').length;
    rerender(<RealisticScene analysis={analysis} polygon={polygon} scene="photo" onScene={onScene} onUnavailable={onUnavailable} reduceMotion={false} />);
    expect(kinds('polygon').length).toBe(5); // only the house is left
    expect(before).toBeGreaterThan(5);
  });

  it('moves the camera from its buttons, and offers the blocks', async () => {
    const { onScene } = await show('slope');
    fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
    expect(map.heading).toBe(135);
    const range = map.range as number;
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(map.range).toBeLessThan(range);
    fireEvent.click(screen.getByRole('button', { name: 'Look straight down' }));
    expect(map.tilt).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Fly around' }));
    expect(map.flyCameraAround).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Grid blocks' }));
    expect(onScene).toHaveBeenCalledWith('blocks');
  });

  it('says when the realistic view cannot be shown, so the blocks can take over', async () => {
    importLibrary.mockRejectedValueOnce(new Error('Map Tiles API not enabled'));
    const { onUnavailable } = await show('slope');
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });
});
