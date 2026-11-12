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

// Reduced motion: camera moves and height changes happen at once, so they can be checked without waiting.
vi.mock('framer-motion', () => ({ useReducedMotion: () => true }));
// jsdom has no canvas: hand the view ready-made pictures.
vi.mock('../../utils/slopeImageUrl', () => ({ createSlopeImageUrl: async () => 'blob:slope' }));
vi.mock('../../utils/houseShadow', async (original) => ({
  ...(await original<typeof import('../../utils/houseShadow')>()),
  createHouseShadowUrl: async () => 'blob:shadow',
}));

type Listener = (e?: unknown) => void;

/** A stand-in MapLibre map that records what the view asks of it. */
const fake = vi.hoisted(() => {
  const state = { maps: [] as unknown[], failToCreate: false, ground: 2880 as number, demLoaded: false };
  class FakeMap {
    listeners: Record<string, Listener[]> = {};
    layers: string[] = [];
    terrain: { source: string; exaggeration: number } | null = { source: 'dem', exaggeration: 0 };
    paint: Record<string, unknown> = {};
    bearing = 0;
    pitch = 0;
    zoom = 17;
    centerElevation = 0;
    easeTo = vi.fn((o: { bearing?: number; pitch?: number; zoom?: number }) => this.move(o));
    jumpTo = vi.fn((o: { bearing?: number; pitch?: number }) => this.move(o));
    fitBounds = vi.fn();
    constructor(options: { style: { terrain?: { source: string; exaggeration: number } } }) {
      if (state.failToCreate) throw new Error('Failed to initialize WebGL');
      this.terrain = options.style.terrain ? { ...options.style.terrain } : null;
      state.maps.push(this);
    }
    move(o: { bearing?: number; pitch?: number; zoom?: number }) {
      this.bearing = o.bearing ?? this.bearing;
      this.pitch = o.pitch ?? this.pitch;
      this.zoom = o.zoom ?? this.zoom;
      this.fire('moveend');
    }
    on(event: string, fn: Listener) { (this.listeners[event] ??= []).push(fn); return this; }
    once(event: string, fn: Listener) { return this.on(event, fn); }
    off(event: string, fn: Listener) { this.listeners[event] = (this.listeners[event] ?? []).filter((l) => l !== fn); return this; }
    fire(event: string, data?: unknown) { [...(this.listeners[event] ?? [])].forEach((fn) => fn(data)); }
    addSource() {}
    addLayer(layer: { id: string }) { this.layers.push(layer.id); }
    getLayer(id: string) { return this.layers.includes(id) ? { id } : undefined; }
    setPaintProperty(layer: string, name: string, value: unknown) { this.paint[`${layer}.${name}`] = value; }
    setLayoutProperty(layer: string, name: string, value: unknown) { this.paint[`${layer}.${name}`] = value; }
    setTerrain(t: { source: string; exaggeration: number } | null) { this.terrain = t; }
    getTerrain() { return this.terrain; }
    queryTerrainElevation() { return state.ground; }
    isSourceLoaded() { return state.demLoaded; }
    getCenter() { return { lng: 20, lat: 42 }; }
    getCenterElevation() { return this.centerElevation; }
    setCenterElevation(e: number) { this.centerElevation = e; }
    getBearing() { return this.bearing; }
    getPitch() { return this.pitch; }
    getZoom() { return this.zoom; }
    getContainer() { return document.createElement('div'); }
    triggerRepaint() {}
    setBearing(b: number) { this.bearing = b; }
    remove() {}
  }
  return { state, FakeMap };
});
type FakeMap = InstanceType<typeof fake.FakeMap>;
const maps = fake.state.maps as FakeMap[];

vi.mock('maplibre-gl', () => ({
  Map: fake.FakeMap,
  Marker: class { setLngLat() { return this; } addTo() { return this; } setOffset() { return this; } remove() {} },
  MercatorCoordinate: { fromLngLat: () => ({ x: 0, y: 0, z: 0, meterInMercatorCoordinateUnits: () => 1 }) },
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

import Terrain3DDialog from './Terrain3DDialog';
import { analyzeTerrain } from '../../utils/analyzeTerrain';
import { makeGrid, wholeGrid } from '../../utils/testGrid';

// Gentle land rising to the east: 2 m of relief over ~100 m, so the view opens stretched ×3, looking east.
const grid = makeGrid(10, 10, (_r, c) => 400 + c * 0.2);
const polygon = wholeGrid(grid);
const result = analyzeTerrain(grid, polygon);
if (result.ok === false) throw new Error(result.error);
const analysis = result.value;

beforeEach(() => {
  maps.length = 0;
  Object.assign(fake.state, { failToCreate: false, ground: 2880, demLoaded: false });
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Open the dialog; with no Google 3D on the page it falls back to the blocks (MapLibre). */
const open = () => {
  const onClose = vi.fn();
  render(<Terrain3DDialog analysis={analysis} polygon={polygon} onClose={onClose} />);
  return onClose;
};
const openBlocks = async () => {
  const onClose = open();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return onClose;
};
/** Let the map's style arrive, and the pictures the view makes for it. */
const styleLoads = async () => {
  await act(async () => {
    maps[0].fire('style.load');
    await Promise.resolve();
    await Promise.resolve();
  });
};
const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('Terrain3DDialog', () => {
  it('says plainly when the browser cannot draw 3D, with a way back', async () => {
    fake.state.failToCreate = true;
    const onClose = await openBlocks();
    expect(screen.getByRole('alert').textContent).toContain("can't show 3D");
    fireEvent.click(screen.getByRole('button', { name: 'Back to the slope map' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('without realistic 3D here, shows the grid of raised blocks on flat ground, stretched for gentle land, looking uphill', async () => {
    await openBlocks();
    expect(screen.getByText(/Realistic 3D isn't available here/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Loading 3D terrain');
    expect(maps[0].terrain).toBeNull(); // relief under the blocks would count the height twice
    await styleLoads();

    expect(screen.queryByRole('status')).toBeNull();
    expect(maps[0].layers).toEqual(expect.arrayContaining(['terrain-area-line', 'terrain-blocks', 'terrain-house', 'terrain-slope']));
    expect(maps[0].paint['terrain-blocks.fill-extrusion-height']).toBeUndefined(); // set when added
    expect(maps[0].jumpTo).toHaveBeenCalledWith({ pitch: 58, bearing: 90 });
    expect(screen.queryByRole('button', { name: 'Grid blocks' })).toBeNull(); // nothing else to choose
    expect(pressed('3×')).toBe('true');
    expect(screen.getByText(/stretched ×3/)).toBeTruthy();
    expect(screen.getByText(/The house marks the best place to build/)).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe(screen.getByRole('heading', { name: 'Terrain in 3D' }).id);
  });

  it('raises the blocks when the height changes', async () => {
    await openBlocks();
    await styleLoads();
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(maps[0].paint['terrain-blocks.fill-extrusion-height']).toEqual(['+', 0.6, ['*', ['get', 'rise'], 2]]);
  });

  it('moves the camera from its buttons, and closes on Esc', async () => {
    const onClose = await openBlocks();
    await styleLoads();
    const map = maps[0];

    fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
    expect(map.bearing).toBe(90 + 45);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(map.zoom).toBe(18);

    // 2D ↔ 3D: straight down, then tilted again.
    fireEvent.click(screen.getByRole('button', { name: 'Look straight down' }));
    expect(map.pitch).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tilt the view' }));
    expect(map.pitch).toBe(58);

    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(map.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ pitch: 58, bearing: 90 }));
    // No fly-around under reduced motion.
    expect(screen.queryByRole('button', { name: 'Fly around' })).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

});
