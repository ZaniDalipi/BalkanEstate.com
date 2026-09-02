/**
 * District tessellation
 *
 * The map draws these areas as if they were neighbourhoods, so the partition
 * has to hold two properties: every centre lands inside its own area, and the
 * areas do not overlap (the nearest-centre rule is what the reader assumes).
 */

import { describe, it, expect } from 'vitest';
import {
  tessellateDistricts,
  clipBoxForSites,
  ringContains,
  type TessellationSite,
} from '../features/cities/utils/districtTessellation';

const site = (name: string, lat: number, lng: number): TessellationSite<string> => ({
  center: { lat, lng },
  payload: name,
});

// Roughly Tirana's neighbourhood spread.
const TIRANA = [
  site('Blloku', 41.3200, 19.8180),
  site('Kombinat', 41.3080, 19.7770),
  site('Don Bosko', 41.3350, 19.8050),
  site('Fresku', 41.3400, 19.8500),
  site('Lake Park', 41.3130, 19.8280),
];

describe('clipBoxForSites', () => {
  it('pads the bounding box around the sites', () => {
    const box = clipBoxForSites(TIRANA.map(s => s.center))!;

    expect(box.minLat).toBeLessThan(41.3080);
    expect(box.maxLat).toBeGreaterThan(41.3400);
    expect(box.minLng).toBeLessThan(19.7770);
    expect(box.maxLng).toBeGreaterThan(19.8500);
  });

  it('gives a lone site a real span instead of a zero-size box', () => {
    const box = clipBoxForSites([{ lat: 41.32, lng: 19.82 }])!;

    expect(box.maxLat - box.minLat).toBeGreaterThan(0.01);
    expect(box.maxLng - box.minLng).toBeGreaterThan(0.01);
  });

  it('returns null when nothing is usable', () => {
    expect(clipBoxForSites([])).toBeNull();
    expect(clipBoxForSites([{ lat: Number.NaN, lng: 19 }])).toBeNull();
    expect(clipBoxForSites([{ lat: 200, lng: 19 }])).toBeNull();
  });
});

describe('tessellateDistricts', () => {
  it('produces one closed ring per neighbourhood', () => {
    const cells = tessellateDistricts(TIRANA);

    expect(cells).toHaveLength(TIRANA.length);
    for (const cell of cells) {
      expect(cell.ring.length).toBeGreaterThanOrEqual(4);
      expect(cell.ring[0]).toEqual(cell.ring[cell.ring.length - 1]);
    }
  });

  it('puts every centre inside its own area', () => {
    const cells = tessellateDistricts(TIRANA);

    for (const cell of cells) {
      const own = TIRANA.find(s => s.payload === cell.payload)!;
      expect(ringContains(cell.ring, own.center)).toBe(true);
    }
  });

  it('never puts a centre inside someone else’s area', () => {
    const cells = tessellateDistricts(TIRANA);

    for (const cell of cells) {
      const others = TIRANA.filter(s => s.payload !== cell.payload);
      for (const other of others) {
        expect(ringContains(cell.ring, other.center)).toBe(false);
      }
    }
  });

  it('assigns a midpoint to the nearer of two neighbourhoods', () => {
    const cells = tessellateDistricts([
      site('West', 41.32, 19.78),
      site('East', 41.32, 19.86),
    ]);

    const west = cells.find(c => c.payload === 'West')!;
    const east = cells.find(c => c.payload === 'East')!;

    // Just west of the bisector belongs to West, just east to East.
    expect(ringContains(west.ring, { lat: 41.32, lng: 19.815 })).toBe(true);
    expect(ringContains(east.ring, { lat: 41.32, lng: 19.815 })).toBe(false);
    expect(ringContains(east.ring, { lat: 41.32, lng: 19.825 })).toBe(true);
    expect(ringContains(west.ring, { lat: 41.32, lng: 19.825 })).toBe(false);
  });

  it('gives a single neighbourhood the whole clip box', () => {
    const cells = tessellateDistricts([site('Only', 41.32, 19.82)]);

    expect(cells).toHaveLength(1);
    expect(ringContains(cells[0].ring, { lat: 41.32, lng: 19.82 })).toBe(true);
  });

  it('drops unusable centres rather than placing them at (0,0)', () => {
    const cells = tessellateDistricts([
      site('Good', 41.32, 19.82),
      site('NoCoords', Number.NaN, 19.82),
      { center: undefined as never, payload: 'Missing' },
    ]);

    expect(cells.map(c => c.payload)).toEqual(['Good']);
  });

  it('keeps one area when two neighbourhoods share a centre', () => {
    const cells = tessellateDistricts([
      site('First', 41.32, 19.82),
      site('Duplicate', 41.32, 19.82),
      site('Other', 41.34, 19.86),
    ]);

    expect(cells.map(c => c.payload).sort()).toEqual(['First', 'Other']);
  });

  it('is deterministic', () => {
    expect(tessellateDistricts(TIRANA)).toEqual(tessellateDistricts(TIRANA));
  });

  it('returns nothing for no sites', () => {
    expect(tessellateDistricts([])).toEqual([]);
  });
});
