import React from 'react';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ElevationGridResponse, GridBounds } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      return text.replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(options?.[name] ?? ''));
    },
    i18n: { language: 'en' },
  }),
}));

const fetchElevationGrid = vi.fn<(b: GridBounds) => Promise<ElevationGridResponse>>();
vi.mock('../api/terrainApi', () => ({ fetchElevationGrid: (b: GridBounds) => fetchElevationGrid(b) }));

import TerrainPanel from './TerrainPanel';
import { useTerrainTool } from '../hooks/useTerrainTool';

/** West half flat, east half climbing 3 m per ~7 m cell: easy ground on one side, very steep on the other. */
const gridFor = (b: GridBounds): ElevationGridResponse => {
  const rows = 20;
  const cols = 20;
  const elevations: number[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) elevations.push(c < 10 ? 400 : 400 + (c - 9) * 3);
  return { grid: { ...b, rows, cols, cellSizeM: 7, elevations }, source: { name: 'test', resolutionM: 30 } };
};

const httpError = (statusCode: number) => Object.assign(new Error('failed'), { statusCode });

function fakeMap() {
  let onClick: ((e: unknown) => void) | null = null;
  const raw = {
    addListener: vi.fn((event: string, fn: (e: unknown) => void) => {
      if (event === 'click') onClick = fn;
      return {};
    }),
    get: vi.fn(() => undefined),
    setOptions: vi.fn(),
    panTo: vi.fn(),
    setZoom: vi.fn(),
    getZoom: vi.fn(() => 15),
  };
  const tap = (lat: number, lng: number) =>
    act(() => onClick?.({ latLng: { lat: () => lat, lng: () => lng } }));
  return { map: raw as unknown as google.maps.Map, raw, tap };
}

const Harness: React.FC<{ map: google.maps.Map; onClose: () => void }> = ({ map, onClose }) => {
  const tool = useTerrainTool(map, true);
  return <TerrainPanel tool={tool} onClose={onClose} />;
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  const fake = fakeMap();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <Harness map={fake.map} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...fake, onClose };
}

/** A ~100 × 100 m plot. */
const drawPlot = (tap: (lat: number, lng: number) => void) => {
  tap(42.0, 20.0);
  tap(42.0, 20.0012);
  tap(42.0009, 20.0012);
  tap(42.0009, 20.0);
};

beforeEach(() => {
  (globalThis as unknown as { google: unknown }).google = { maps: { event: { removeListener: vi.fn() } } };
  fetchElevationGrid.mockReset();
});
afterEach(() => cleanup());

describe('TerrainPanel', () => {
  it('draws an area, then shows its slope and the best place to build', async () => {
    fetchElevationGrid.mockImplementation(async (b) => gridFor(b));
    const { tap, raw } = setup();
    const analyze = screen.getByRole('button', { name: 'Show slope' });
    expect(analyze).toHaveProperty('disabled', true);

    drawPlot(tap);
    expect(screen.getByText('Corners: 4')).toBeTruthy();
    expect(analyze).toHaveProperty('disabled', false);

    fireEvent.click(analyze);
    expect(await screen.findByText('Best place to build')).toBeTruthy();
    expect(screen.getByText('Average slope')).toBeTruthy();
    expect(screen.getByText('Very steep')).toBeTruthy();
    expect(screen.getByText(/About .* of flat to gentle ground/)).toBeTruthy();
    expect(fetchElevationGrid).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Show on map' }));
    expect(raw.panTo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Draw another area' }));
    expect(screen.getByRole('button', { name: 'Show slope' })).toHaveProperty('disabled', true);
  });

  it('explains crossing edges and keeps the button off', () => {
    const { tap } = setup();
    tap(42.0, 20.0);
    tap(42.0009, 20.0012);
    tap(42.0, 20.0012);
    tap(42.0009, 20.0);
    expect(screen.getByRole('alert').textContent).toContain('The edges cross');
    expect(screen.getByRole('button', { name: 'Show slope' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('offers a retry when the elevation service fails, and recovers', async () => {
    fetchElevationGrid
      .mockRejectedValueOnce(httpError(503))
      .mockRejectedValueOnce(httpError(503))
      .mockImplementation(async (b) => gridFor(b));
    const { tap } = setup();
    drawPlot(tap);
    fireEvent.click(screen.getByRole('button', { name: 'Show slope' }));

    expect((await screen.findByRole('alert')).textContent).toContain('could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Best place to build')).toBeTruthy();
  });

  it('does not offer a retry for an area the server refuses, only a way back', async () => {
    fetchElevationGrid.mockRejectedValue(httpError(400));
    const { tap } = setup();
    drawPlot(tap);
    fireEvent.click(screen.getByRole('button', { name: 'Show slope' }));

    expect((await screen.findByRole('alert')).textContent).toContain('cannot be analysed');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(fetchElevationGrid).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit area' }));
    expect(screen.getByText('Corners: 4')).toBeTruthy();
  });

  it('closes on Esc and folds down to its title', () => {
    const { onClose } = setup();
    const fold = screen.getByRole('button', { name: 'Collapse panel' });
    fireEvent.click(fold);
    expect(screen.getByRole('button', { name: 'Expand panel' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('terrain translations', () => {
  const LOCALES = ['en', 'sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'];
  const dir = path.resolve(__dirname, '../../../../i18n/locales');
  const flatten = (node: unknown, prefix = ''): Record<string, string> =>
    Object.entries(node as Record<string, unknown>).reduce<Record<string, string>>((acc, [k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
    }, {});
  const terrainOf = (lang: string) =>
    flatten(JSON.parse(fs.readFileSync(path.join(dir, lang, 'search.json'), 'utf8')).terrain);
  const english = terrainOf('en');
  const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');

  it.each(LOCALES)('%s has every terrain text, with the same placeholders', (lang) => {
    const texts = terrainOf(lang);
    expect(Object.keys(texts).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(english)) {
      expect(texts[key].trim().length, key).toBeGreaterThan(0);
      expect(placeholders(texts[key]), key).toBe(placeholders(value));
    }
  });
});
