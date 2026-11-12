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
    constructor(options: { style: { terrain: { source: string; exaggeration: number } } }) {
      if (state.failToCreate) throw new Error('Failed to initialize WebGL');
      this.terrain = { ...options.style.terrain };
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
    setTerrain(t: { source: string; exaggeration: number }) { this.terrain = t; }
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

const open = () => {
  const onClose = vi.fn();
  render(<Terrain3DDialog analysis={analysis} polygon={polygon} onClose={onClose} />);
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
  it('says plainly when the browser cannot draw 3D, with a way back', () => {
    fake.state.failToCreate = true;
    const onClose = open();
    expect(screen.getByRole('alert').textContent).toContain("can't show 3D");
    fireEvent.click(screen.getByRole('button', { name: 'Back to the slope map' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens on the slope colours over the stretched relief, standing on the ground and looking uphill', async () => {
    open();
    expect(screen.getByRole('status').textContent).toContain('Loading 3D terrain');
    expect(maps[0].terrain).toEqual({ source: 'dem', exaggeration: 3 });
    await styleLoads();

    expect(screen.queryByRole('status')).toBeNull();
    expect(maps[0].layers).toEqual(expect.arrayContaining(['terrain-area-line', 'terrain-house', 'terrain-slope', 'terrain-house-shadow']));
    expect(maps[0].centerElevation).toBe(2880);
    expect(maps[0].jumpTo).toHaveBeenCalledWith({ pitch: 58, bearing: 90 });
    expect(pressed('Slope')).toBe('true');
    expect(pressed('3×')).toBe('true');
    expect(screen.getByText(/stretched ×3/)).toBeTruthy();
    expect(screen.getByText(/The house marks the best place to build/)).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe(screen.getByRole('heading', { name: 'Terrain in 3D' }).id);
  });

  it('switches to the bare satellite photo and back, and to true height', async () => {
    open();
    await styleLoads();

    fireEvent.click(screen.getByRole('button', { name: 'Satellite' }));
    expect(maps[0].paint['terrain-slope.raster-opacity']).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Slope' }));
    expect(maps[0].paint['terrain-slope.raster-opacity']).toBeGreaterThan(0.9);

    fake.state.ground = 960;
    fireEvent.click(screen.getByRole('button', { name: '1×' }));
    expect(maps[0].terrain).toEqual({ source: 'dem', exaggeration: 1 });
    expect(maps[0].centerElevation).toBe(960); // the camera follows the ground down
    expect(screen.getByText(/true to scale/)).toBeTruthy();
  });

  it('moves the camera from its buttons, and closes on Esc', async () => {
    const onClose = open();
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

  it('on a slow connection opens without the heights, then settles when they arrive', async () => {
    vi.useFakeTimers();
    fake.state.ground = 0; // heights not in yet
    open();
    await styleLoads();
    expect(screen.getByRole('status')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(maps[0].centerElevation).toBe(0);
    maps[0].jumpTo.mockClear();

    fake.state.ground = 512;
    act(() => maps[0].fire('sourcedata', { sourceId: 'dem', tile: {} }));
    expect(maps[0].centerElevation).toBe(512);
    expect(maps[0].jumpTo).toHaveBeenCalledWith({ pitch: 58, bearing: 90 });
  });

  it('accepts ground that really is at sea level once every height tile is in', async () => {
    fake.state.ground = 0;
    open();
    await styleLoads();
    expect(screen.getByRole('status')).toBeTruthy();

    fake.state.demLoaded = true;
    act(() => maps[0].fire('sourcedata', { sourceId: 'dem', tile: {} }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
