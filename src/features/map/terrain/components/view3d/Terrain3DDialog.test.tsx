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

/** The model itself needs WebGL (none in jsdom): the dialog is tested against a stand-in for its hook. */
const model = vi.hoisted(() => ({
  status: 'ready' as 'loading' | 'ready' | 'failed',
  satelliteReady: true,
  options: null as null | { surface: string; exaggeration: number },
  camera: {
    zoomIn: vi.fn(), zoomOut: vi.fn(), turnLeft: vi.fn(), turnRight: vi.fn(),
    tilted: true, toggleTilt: vi.fn(), reset: vi.fn(), orbiting: false, toggleOrbit: vi.fn(), canOrbit: true,
  },
}));
vi.mock('../../hooks/usePlotModel', () => ({
  usePlotModel: (_host: unknown, _label: unknown, options: { surface: string; exaggeration: number }) => {
    model.options = options;
    return { status: model.status, satelliteReady: model.satelliteReady, camera: model.camera };
  },
}));

import Terrain3DDialog from './Terrain3DDialog';
import { analyzeTerrain } from '../../utils/analyzeTerrain';
import { makeGrid, wholeGrid } from '../../utils/testGrid';

// Gentle land: 2 m of relief over ~100 m, so the model opens stretched ×5.
const grid = makeGrid(10, 10, (_r, c) => 400 + c * 0.2);
const polygon = wholeGrid(grid);
const result = analyzeTerrain(grid, polygon);
if (result.ok === false) throw new Error(result.error);
const analysis = result.value;

beforeEach(() => {
  Object.assign(model, { status: 'ready', satelliteReady: true, options: null });
  Object.values(model.camera).forEach((v) => { if (typeof v === 'function') (v as ReturnType<typeof vi.fn>).mockClear(); });
});
afterEach(() => cleanup());

const open = () => {
  const onClose = vi.fn();
  render(<Terrain3DDialog analysis={analysis} polygon={polygon} onClose={onClose} />);
  return onClose;
};
const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('Terrain3DDialog', () => {
  it('opens the model with the slope colours, stretched for gentle land, and says so', () => {
    open();
    expect(model.options).toMatchObject({ surface: 'slope', exaggeration: 5 });
    expect(pressed('Slope')).toBe('true');
    expect(pressed('5×')).toBe('true');
    expect(screen.getByText(/stretched ×5/)).toBeTruthy();
    expect(screen.getByText(/The house marks the best place to build/)).toBeTruthy();
    expect(screen.getByText('Best spot')).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBe(screen.getByRole('heading', { name: 'Terrain in 3D' }).id);
  });

  it('switches to the satellite photo and to true height', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Satellite' }));
    expect(model.options?.surface).toBe('satellite');
    fireEvent.click(screen.getByRole('button', { name: '1×' }));
    expect(model.options?.exaggeration).toBe(1);
    expect(screen.getByText(/true to scale/)).toBeTruthy();
  });

  it('offers the satellite photo only once it has arrived', () => {
    model.satelliteReady = false;
    open();
    expect(screen.queryByRole('button', { name: 'Satellite' })).toBeNull();
  });

  it('moves the camera from its buttons, and closes on Esc', () => {
    const onClose = open();
    fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Look straight down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fly around' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(model.camera.turnRight).toHaveBeenCalledTimes(1);
    expect(model.camera.zoomIn).toHaveBeenCalledTimes(1);
    expect(model.camera.toggleTilt).toHaveBeenCalledTimes(1);
    expect(model.camera.toggleOrbit).toHaveBeenCalledTimes(1);
    expect(model.camera.reset).toHaveBeenCalledTimes(1);
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says plainly when the browser cannot draw 3D, with a way back', () => {
    model.status = 'failed';
    const onClose = open();
    expect(screen.getByRole('alert').textContent).toContain("can't show 3D");
    fireEvent.click(screen.getByRole('button', { name: 'Back to the slope map' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
