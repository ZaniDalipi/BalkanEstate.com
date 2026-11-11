import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      return text.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(options?.[name] ?? ''));
    },
  }),
}));

/** A stand-in MapLibre map that records what the view asks of it. */
const fake = vi.hoisted(() => {
  const state = { maps: [] as unknown[], failToCreate: false };
  class FakeMap {
    handlers: Record<string, Array<() => void>> = {};
    layers = new Set<string>();
    terrain: unknown = 'unset';
    bearing = 0;
    pitch = 0;
    easeTo = vi.fn((o: { bearing?: number; pitch?: number }) => { this.bearing = o.bearing ?? this.bearing; this.pitch = o.pitch ?? this.pitch; });
    jumpTo = vi.fn();
    fitBounds = vi.fn();
    setPaintProperty = vi.fn();
    setLayoutProperty = vi.fn();
    constructor() {
      if (state.failToCreate) throw new Error('Failed to initialize WebGL');
      state.maps.push(this);
    }
    addControl() { return this; }
    on(event: string, fn: () => void) { (this.handlers[event] ??= []).push(fn); return this; }
    off() { return this; }
    addSource() {}
    addLayer(layer: { id: string }) { this.layers.add(layer.id); }
    getLayer(id: string) { return this.layers.has(id) ? { id } : undefined; }
    setTerrain(t: unknown) { this.terrain = t; }
    getTerrain() { return this.terrain === 'unset' ? null : this.terrain; }
    getBearing() { return this.bearing; }
    getZoom() { return 17; }
    getCenter() { return { lng: 20, lat: 42 }; }
    centerElevation = 0;
    setCenterElevation(e: number) { this.centerElevation = e; }
    queryTerrainElevation() { return this.terrain && this.terrain !== 'unset' ? 512 : null; }
    once(event: string, fn: () => void) { return this.on(event, fn); }
    getPitch() { return this.pitch; }
    setBearing(b: number) { this.bearing = b; }
    remove() {}
    fire(event: string) { (this.handlers[event] ?? []).forEach((fn) => fn()); }
  }
  return { state, FakeMap };
});
type FakeMap = InstanceType<typeof fake.FakeMap>;
const maps = fake.state.maps as FakeMap[];
vi.mock('maplibre-gl', () => ({
  Map: fake.FakeMap,
  NavigationControl: class {},
  Marker: class { setLngLat() { return this; } addTo() { return this; } setOffset() { return this; } remove() {} },
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

import Terrain3DDialog from './Terrain3DDialog';
import { analyzeTerrain } from '../../utils/analyzeTerrain';
import { makeGrid, wholeGrid } from '../../utils/testGrid';

// Gentle land: 2 m of relief over ~100 m, so the view opens stretched ×3.
const grid = makeGrid(10, 10, (_r, c) => 400 + c * 0.2);
const polygon = wholeGrid(grid);
const result = analyzeTerrain(grid, polygon);
if (result.ok === false) throw new Error(result.error);
const analysis = result.value;

beforeEach(() => { maps.length = 0; fake.state.failToCreate = false; });
afterEach(() => cleanup());

const open = () => {
  const onClose = vi.fn();
  render(<Terrain3DDialog analysis={analysis} polygon={polygon} onClose={onClose} />);
  return onClose;
};

describe('Terrain3DDialog', () => {
  it('says plainly when the browser cannot draw 3D, with a way back', () => {
    fake.state.failToCreate = true;
    const onClose = open();
    expect(screen.getByRole('alert').textContent).toContain("can't show 3D");
    fireEvent.click(screen.getByRole('button', { name: 'Back to the slope map' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens on the grid as raised blocks, stretched for gentle land, and switches to the real surface', () => {
    open();
    expect(screen.getByRole('status')).toBeTruthy();
    act(() => maps[0].fire('load'));

    expect(maps[0].terrain).toBeNull(); // blocks stand on flat ground
    expect(maps[0].layers.has('terrain-blocks')).toBe(true);
    expect(screen.getByRole('button', { name: 'Grid blocks' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '×3' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/stretched ×3/)).toBeTruthy();

    // The house stands on its block…
    expect(maps[0].layers.has('terrain-house')).toBe(true);
    const houseBase = () => maps[0].setPaintProperty.mock.calls.filter(([layer, prop]) => layer === 'terrain-house' && prop === 'fill-extrusion-base').at(-1)?.[2];
    expect((houseBase() as unknown[])[2]).toBeGreaterThan(0);
    expect(screen.getByText(/The house marks the best place to build/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Real surface' }));
    expect(maps[0].terrain).toEqual({ source: 'dem', exaggeration: 3 });
    // The camera's centre goes onto the ground, not left at sea level inside the hill.
    expect(maps[0].centerElevation).toBe(512);
    // …and on the ground when the relief carries it.
    expect((houseBase() as unknown[])[2]).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: '×1' }));
    expect(maps[0].terrain).toEqual({ source: 'dem', exaggeration: 1 });
    expect(screen.getByText(/true to scale/)).toBeTruthy();
  });

  it('turns and tilts the camera from its buttons, and closes on Esc', () => {
    const onClose = open();
    act(() => maps[0].fire('load'));
    const map = maps[0];

    fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: map.bearing }));
    const afterTurn = map.bearing;
    fireEvent.click(screen.getByRole('button', { name: 'Turn left' }));
    expect(map.bearing).toBe(afterTurn - 45);

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
