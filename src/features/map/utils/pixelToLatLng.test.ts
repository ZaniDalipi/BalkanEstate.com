import { describe, it, expect } from 'vitest';
import { pixelToLatLng } from './pixelToLatLng';
import { projectToWorld as latLngToWorld } from './clusterCamera';

describe('pixelToLatLng', () => {
  const view = { center: { lat: 41, lng: 21 }, zoom: 6, width: 1100, height: 1080 };

  it('returns the centre under the middle pixel', () => {
    const p = pixelToLatLng(view, 550, 540);
    expect(p.lat).toBeCloseTo(41, 6);
    expect(p.lng).toBeCloseTo(21, 6);
  });

  it('follows Mercator, not a straight line between the edges, when zoomed out', () => {
    const top = pixelToLatLng(view, 550, 0).lat;
    const bottom = pixelToLatLng(view, 550, 1080).lat;
    const quarter = pixelToLatLng(view, 550, 270).lat;
    const linear = top + (bottom - top) * 0.25;
    // A latitude 1/4 down the screen is not 1/4 of the way between the edge latitudes.
    expect(Math.abs(quarter - linear)).toBeGreaterThan(0.1);
    // And it maps back to exactly that pixel.
    const scale = 2 ** view.zoom;
    const y = (latLngToWorld({ lat: quarter, lng: 21 }).y - latLngToWorld(view.center).y) * scale + 540;
    expect(y).toBeCloseTo(270, 4);
  });

  it('moves longitude evenly with x and wraps past the date line', () => {
    const p = pixelToLatLng({ center: { lat: 0, lng: 179 }, zoom: 2, width: 512, height: 512 }, 512, 256);
    // 256px at zoom 2 is 90°: 179 + 90 wraps to -91.
    expect(p.lng).toBeCloseTo(-91, 6);
  });
});
