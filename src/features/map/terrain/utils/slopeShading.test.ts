import { describe, expect, it } from 'vitest';
import { shadeColor, shadeFactor } from './hillshade';
import { SLOPE_BANDS, bandLabel, slopeBandIndex } from './slopeBands';
import { classifySlope } from './slopeClasses';
import { computeSlopeField } from './slopeField';
import { MAX_LABELS, slopeLabels } from './slopeLabels';
import { makeGrid } from './testGrid';

describe('slope bands', () => {
  it('each shade belongs to the class its whole range falls in', () => {
    for (const band of SLOPE_BANDS) {
      expect(classifySlope(band.min)).toBe(band.classId);
      if (Number.isFinite(band.max)) expect(classifySlope(band.max - 0.01)).toBe(band.classId);
    }
  });

  it('runs edge to edge with no gaps', () => {
    SLOPE_BANDS.slice(1).forEach((band, i) => expect(band.min).toBe(SLOPE_BANDS[i].max));
    expect(SLOPE_BANDS[0].min).toBe(0);
  });

  it.each([[0, 0], [2.99, 0], [3, 1], [5, 2], [14.9, 4], [39, 8], [90, 9]])('%s %% is shade %s', (pct, index) => {
    expect(slopeBandIndex(pct)).toBe(index);
  });

  it('labels a shade by its range', () => {
    expect(bandLabel(SLOPE_BANDS[1])).toBe('3–5%');
    expect(bandLabel(SLOPE_BANDS[9])).toBe('40%+');
  });
});

describe('hillshade', () => {
  it('leaves flat ground as it is', () => {
    expect(shadeFactor(0, 0)).toBeCloseTo(1, 5);
  });

  it('lights slopes facing the north-west and darkens those facing the south-east', () => {
    // Rising to the south-east = facing north-west.
    expect(shadeFactor(0.1, -0.1)).toBeGreaterThan(1.03);
    expect(shadeFactor(-0.1, 0.1)).toBeLessThan(0.95);
  });

  it('stays within bounds on a cliff', () => {
    expect(shadeFactor(5, -5)).toBeLessThanOrEqual(1.12);
    expect(shadeFactor(-5, 5)).toBeGreaterThanOrEqual(0.7);
  });

  it('darkens towards black and lightens towards white', () => {
    expect(shadeColor('#808080', 1)).toBe('rgb(128, 128, 128)');
    expect(shadeColor('#808080', 0.5)).toBe('rgb(64, 64, 64)');
    expect(shadeColor('#808080', 1.5)).toBe('rgb(192, 192, 192)');
  });
});

describe('slopeLabels', () => {
  it('names each big shade at the heart of its patch', () => {
    // West half flat (0 %), east half 4 % (0.4 m per 10 m cell).
    const grid = makeGrid(12, 12, (_r, c) => (c < 6 ? 300 : 300 + (c - 5) * 0.4));
    const labels = slopeLabels(grid, new Uint8Array(144).fill(1), computeSlopeField(grid));
    const texts = labels.map((l) => l.text);
    expect(texts).toContain('0–3%');
    expect(texts).toContain('3–5%');
    const flat = labels.find((l) => l.text === '0–3%')!;
    expect(flat.lng).toBeLessThan((grid.west + grid.east) / 2);
    expect(flat.color).toBe(SLOPE_BANDS[0].color);
  });

  it('keeps to a few labels, biggest patches first', () => {
    // Ten strips, one per shade.
    const grid = makeGrid(30, 30, (_r, c) => 500 + c * c * 0.35);
    const labels = slopeLabels(grid, new Uint8Array(900).fill(1), computeSlopeField(grid));
    expect(labels.length).toBeLessThanOrEqual(MAX_LABELS);
  });

  it('labels nothing outside the area', () => {
    const grid = makeGrid(6, 6, () => 300);
    expect(slopeLabels(grid, new Uint8Array(36), computeSlopeField(grid))).toEqual([]);
  });
});
