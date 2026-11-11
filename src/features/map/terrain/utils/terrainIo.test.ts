import { describe, expect, it } from 'vitest';
import { drawSlopeImage, planSlopeImage, type SlopeCanvas } from './drawSlopeImage';
import { parseElevationGridResponse } from './parseElevationGrid';
import { SLOPE_CLASSES } from './slopeClasses';
import { computeSlopeField } from './slopeField';
import { shouldRetryTerrain, terrainFailure, terrainPhase } from './terrainPhase';
import { makeGrid, wholeGrid } from './testGrid';

describe('parseElevationGridResponse', () => {
  const good = { grid: { south: 42, west: 20, north: 42.01, east: 20.01, rows: 2, cols: 2, cellSizeM: 8, elevations: [1, 2, null, 4] }, source: { name: 'x', resolutionM: 30 } };

  it('accepts a well-formed grid', () => {
    expect(parseElevationGridResponse(good)).toEqual(good);
  });

  it.each([
    ['no grid', {}],
    ['heights that do not fill the grid', { grid: { ...good.grid, elevations: [1, 2, 3] } }],
    ['a non-numeric height', { grid: { ...good.grid, elevations: [1, 2, 'x', 4] } }],
    ['an inside-out box', { grid: { ...good.grid, south: 43 } }],
    ['a fractional row count', { grid: { ...good.grid, rows: 1.5 } }],
  ])('rejects %s', (_label, body) => {
    expect(parseElevationGridResponse(body)).toBeNull();
  });
});

describe('terrainPhase', () => {
  it('walks drawing → loading → result / failed', () => {
    expect(terrainPhase({ submitted: false, error: null, result: null })).toEqual({ kind: 'drawing' });
    expect(terrainPhase({ submitted: true, error: null, result: null })).toEqual({ kind: 'loading' });
    expect(terrainPhase({ submitted: true, error: null, result: { ok: false, error: 'noData' } })).toEqual({ kind: 'failed', reason: 'noData' });
    expect(terrainPhase({ submitted: true, error: { statusCode: 429 }, result: null })).toEqual({ kind: 'failed', reason: 'busy' });
  });

  it('retries only an outage, once', () => {
    expect(terrainFailure({ statusCode: 400 })).toBe('rejected');
    expect(terrainFailure(new Error('network'))).toBe('unavailable');
    expect(shouldRetryTerrain(0, { statusCode: 503 })).toBe(true);
    expect(shouldRetryTerrain(1, { statusCode: 503 })).toBe(false);
    expect(shouldRetryTerrain(0, { statusCode: 429 })).toBe(false);
  });
});

describe('drawSlopeImage', () => {
  it('sizes the picture to the grid within the pixel budget', () => {
    expect(planSlopeImage(100, 50)).toEqual({ width: 50 * 20, height: 100 * 20, pxPerCell: 20 });
    expect(planSlopeImage(4000, 10).pxPerCell).toBe(1);
  });

  it('paints each cell in its band colour, cut to the drawn shape', () => {
    const grid = makeGrid(4, 4, (_r, c) => (c < 2 ? 100 : 100 + (c - 1) * 4));
    const fills: string[] = [];
    let clipped = false;
    const ctx = {
      fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {},
      clip() { clipped = true; },
      fillRect() { fills.push(String(this.fillStyle)); },
    } as unknown as SlopeCanvas;
    drawSlopeImage(ctx, grid, computeSlopeField(grid), wholeGrid(grid), planSlopeImage(4, 4));
    expect(clipped).toBe(true);
    expect(fills).toHaveLength(16);
    expect(fills).toContain(SLOPE_CLASSES[0].color);
    expect(fills).toContain(SLOPE_CLASSES[4].color);
  });
});
