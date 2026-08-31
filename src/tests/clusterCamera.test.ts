/**
 * Cluster camera tests
 *
 * Tapping a cluster promises "every listing behind this bubble is about to be
 * on screen", and that promise is kept (or broken) entirely by the maths here:
 * the bounds the cluster occupies, the camera that frames them, and the arc the
 * camera takes to get there. All of it is pure, so all of it is covered without
 * a map instance.
 */

import { describe, it, expect } from 'vitest';
import {
  boundsOfPositions,
  cameraForBounds,
  createFlightPath,
  projectToWorld,
  unprojectFromWorld,
  spiderLayout,
  WORLD_SIZE,
} from '../features/map/utils/clusterCamera';

const VIEWPORT = { width: 900, height: 700 };

describe('projectToWorld / unprojectFromWorld', () => {
  it('round-trips coordinates across the Balkans', () => {
    for (const position of [
      { lat: 42.66, lng: 21.17 }, // Pristina
      { lat: 41.33, lng: 19.82 }, // Tirana
      { lat: 44.79, lng: 20.45 }, // Belgrade
      { lat: 37.98, lng: 23.73 }, // Athens
    ]) {
      const round = unprojectFromWorld(projectToWorld(position));
      expect(round.lat).toBeCloseTo(position.lat, 9);
      expect(round.lng).toBeCloseTo(position.lng, 9);
    }
  });

  it('puts the null island at the centre of the 256px world', () => {
    const origin = projectToWorld({ lat: 0, lng: 0 });
    expect(origin.x).toBeCloseTo(WORLD_SIZE / 2, 9);
    expect(origin.y).toBeCloseTo(WORLD_SIZE / 2, 9);
  });

  it('clamps beyond the Mercator limit instead of returning infinity', () => {
    expect(Number.isFinite(projectToWorld({ lat: 90, lng: 0 }).y)).toBe(true);
    expect(Number.isFinite(projectToWorld({ lat: -90, lng: 0 }).y)).toBe(true);
  });
});

describe('boundsOfPositions', () => {
  it('wraps every position it is given', () => {
    expect(
      boundsOfPositions([
        { lat: 42, lng: 20 },
        { lat: 41, lng: 22 },
        { lat: 43, lng: 21 },
      ])
    ).toEqual({ north: 43, south: 41, east: 22, west: 20 });
  });

  it('skips markers with no usable position rather than dragging bounds to (0,0)', () => {
    const bounds = boundsOfPositions([
      { lat: 42, lng: 20 },
      null,
      undefined,
      { lat: Number.NaN, lng: 21 },
      { lat: 42.5, lng: 20.5 },
    ]);
    expect(bounds).toEqual({ north: 42.5, south: 42, east: 20.5, west: 20 });
  });

  it('returns null when nothing usable was passed', () => {
    expect(boundsOfPositions([])).toBeNull();
    expect(boundsOfPositions([null, { lat: Number.NaN, lng: Number.NaN }])).toBeNull();
  });
});

describe('cameraForBounds', () => {
  const bounds = { north: 42.7, south: 42.5, east: 21.3, west: 21.0 };

  it('centres the camera on the cluster', () => {
    const camera = cameraForBounds({ bounds, viewport: VIEWPORT });
    expect(camera.center.lat).toBeGreaterThan(bounds.south);
    expect(camera.center.lat).toBeLessThan(bounds.north);
    expect(camera.center.lng).toBeCloseTo((bounds.east + bounds.west) / 2, 6);
  });

  it('picks a zoom that leaves the whole cluster inside the padding', () => {
    const padding = 72;
    const { zoom } = cameraForBounds({ bounds, viewport: VIEWPORT, padding });

    const scale = Math.pow(2, zoom);
    const northEast = projectToWorld({ lat: bounds.north, lng: bounds.east });
    const southWest = projectToWorld({ lat: bounds.south, lng: bounds.west });
    const widthPx = Math.abs(northEast.x - southWest.x) * scale;
    const heightPx = Math.abs(southWest.y - northEast.y) * scale;

    expect(widthPx).toBeLessThanOrEqual(VIEWPORT.width - padding * 2 + 0.001);
    expect(heightPx).toBeLessThanOrEqual(VIEWPORT.height - padding * 2 + 0.001);
  });

  it('reports an unreachable zoom for pins on the same coordinate', () => {
    const point = { north: 42.6, south: 42.6, east: 21.1, west: 21.1 };
    const camera = cameraForBounds({ bounds: point, viewport: VIEWPORT, maxZoom: 21 });

    // Infinity is the signal the caller spiderfies on — no zoom separates these.
    expect(camera.requiredZoom).toBe(Infinity);
    expect(camera.zoom).toBe(21);
    expect(camera.center.lat).toBeCloseTo(42.6, 6);
  });

  it('never asks for more zoom than the map allows', () => {
    const almostIdentical = { north: 42.60001, south: 42.6, east: 21.10001, west: 21.1 };
    const camera = cameraForBounds({ bounds: almostIdentical, viewport: VIEWPORT, maxZoom: 18 });
    expect(camera.requiredZoom).toBeGreaterThan(18);
    expect(camera.zoom).toBe(18);
  });

  it('survives a viewport smaller than its own padding', () => {
    const camera = cameraForBounds({
      bounds,
      viewport: { width: 100, height: 90 },
      padding: 72,
    });
    expect(Number.isFinite(camera.zoom)).toBe(true);
  });
});

describe('createFlightPath', () => {
  const from = { center: { lat: 44.79, lng: 20.45 }, zoom: 7 };
  const to = { center: { lat: 41.33, lng: 19.82 }, zoom: 13 };

  it('starts where the camera is and lands exactly on the target', () => {
    const path = createFlightPath({ from, to, viewportWidth: VIEWPORT.width });

    const start = path.at(0);
    expect(start.center.lat).toBeCloseTo(from.center.lat, 6);
    expect(start.center.lng).toBeCloseTo(from.center.lng, 6);
    expect(start.zoom).toBeCloseTo(from.zoom, 6);

    // Exact, not close: a float drift at t=1 leaves the cluster off-centre.
    expect(path.at(1)).toEqual(to);
    expect(path.at(1.4)).toEqual(to);
  });

  it('arcs the camera back out mid-flight instead of panning at target zoom', () => {
    const level = { center: from.center, zoom: 7 };
    const acrossTheBalkans = { center: { lat: 37.98, lng: 23.73 }, zoom: 7 };
    const path = createFlightPath({ from: level, to: acrossTheBalkans, viewportWidth: VIEWPORT.width });

    expect(path.at(0.5).zoom).toBeLessThan(level.zoom);
  });

  it('moves the camera monotonically toward the target', () => {
    const path = createFlightPath({ from, to, viewportWidth: VIEWPORT.width });
    let previous = Infinity;

    for (let t = 0; t <= 1; t += 0.05) {
      const { center, zoom } = path.at(t);
      expect(Number.isFinite(center.lat)).toBe(true);
      expect(Number.isFinite(center.lng)).toBe(true);
      expect(Number.isFinite(zoom)).toBe(true);

      const remaining = Math.hypot(center.lat - to.center.lat, center.lng - to.center.lng);
      expect(remaining).toBeLessThanOrEqual(previous + 1e-6);
      previous = remaining;
    }
  });

  it('keeps the duration inside its bounds however far the jump is', () => {
    const near = createFlightPath({
      from,
      to: { center: { lat: 44.7901, lng: 20.4501 }, zoom: 7.2 },
      viewportWidth: VIEWPORT.width,
    });
    const far = createFlightPath({
      from: { center: { lat: 49, lng: 13 }, zoom: 17 },
      to: { center: { lat: 34, lng: 31 }, zoom: 6 },
      viewportWidth: VIEWPORT.width,
    });

    expect(near.durationMs).toBeGreaterThanOrEqual(420);
    expect(far.durationMs).toBeLessThanOrEqual(1600);
  });

  it('handles a pure zoom with no pan as a straight exponential', () => {
    const path = createFlightPath({
      from: { center: { lat: 42.66, lng: 21.17 }, zoom: 8 },
      to: { center: { lat: 42.66, lng: 21.17 }, zoom: 15 },
      viewportWidth: VIEWPORT.width,
    });

    expect(path.at(0.5).center).toEqual({ lat: 42.66, lng: 21.17 });
    expect(path.at(0.25).zoom).toBeGreaterThan(8);
    expect(path.at(0.25).zoom).toBeLessThan(path.at(0.75).zoom);
    expect(path.at(1).zoom).toBe(15);
  });

  it('does not produce NaN when the two views are identical', () => {
    const path = createFlightPath({ from, to: from, viewportWidth: VIEWPORT.width });
    const mid = path.at(0.5);
    expect(Number.isFinite(mid.zoom)).toBe(true);
    expect(Number.isFinite(mid.center.lat)).toBe(true);
  });
});

describe('spiderLayout', () => {
  it('returns nothing for an empty cluster', () => {
    expect(spiderLayout(0)).toEqual([]);
  });

  it('lifts a lone pin clear of its anchor', () => {
    expect(spiderLayout(1)).toEqual([{ x: 0, y: -44 }]);
  });

  it('spreads small groups evenly around a circle', () => {
    const positions = spiderLayout(6);
    expect(positions).toHaveLength(6);

    const radii = positions.map((p) => Math.hypot(p.x, p.y));
    for (const radius of radii) {
      expect(radius).toBeCloseTo(radii[0], 6);
    }
  });

  it('keeps every leg distinct once the group spirals', () => {
    const positions = spiderLayout(24);
    expect(positions).toHaveLength(24);

    const seen = new Set(positions.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`));
    expect(seen.size).toBe(24);
    positions.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});
