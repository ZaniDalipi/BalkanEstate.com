import { describe, expect, it } from 'vitest';
import { drawSlopeImage, planSlopeImage, type SlopeCanvas } from './drawSlopeImage';
import { parseElevationGridResponse } from './parseElevationGrid';
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
    expect(planSlopeImage(100, 50)).toEqual({ width: 50 * 10, height: 100 * 10, pxPerCell: 10 });
    expect(planSlopeImage(10, 8).pxPerCell).toBe(96);
    expect(planSlopeImage(4000, 10).pxPerCell).toBe(1);
  });

  it('paints the picture, then keeps only what lies inside the drawn shape', () => {
    const grid = makeGrid(4, 4, (_r, c) => 100 + c * 2);
    const calls: string[] = [];
    let painted: Uint8ClampedArray | null = null;
    const ctx = {
      globalCompositeOperation: 'source-over',
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData(image: { data: Uint8ClampedArray }) { painted = image.data; calls.push('put'); },
      beginPath() {}, closePath() {},
      moveTo() { calls.push('move'); },
      lineTo() { calls.push('line'); },
      fill() { calls.push(`fill:${this.globalCompositeOperation}`); },
    } as unknown as SlopeCanvas;
    drawSlopeImage(ctx, grid, computeSlopeField(grid), wholeGrid(grid), { width: 8, height: 8, pxPerCell: 2 }, null);
    expect(calls).toEqual(['put', 'move', 'line', 'line', 'line', 'fill:destination-in']);
    expect(painted![3]).toBeGreaterThan(0);
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });
});
