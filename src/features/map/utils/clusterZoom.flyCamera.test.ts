import { describe, it, expect, vi, afterEach } from 'vitest';
import { flyCamera } from './clusterZoom';

/** A stand-in Google map that records every camera move. */
function fakeMap(center: { lat: number; lng: number }, zoom: number, width = 1900) {
  let current = { center, zoom };
  const moves: Array<{ center: { lat: number; lng: number }; zoom: number }> = [];
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', { value: width });
  Object.defineProperty(div, 'clientHeight', { value: 1100 });
  const map = {
    getCenter: () => ({ lat: () => current.center.lat, lng: () => current.center.lng }),
    getZoom: () => current.zoom,
    getDiv: () => div,
    addListener: () => ({ remove: () => {} }),
    moveCamera: (camera: { center: { lat: number; lng: number }; zoom: number }) => {
      current = camera;
      moves.push(camera);
    },
  };
  return { map: map as unknown as google.maps.Map, moves, current: () => current };
}

describe('flyCamera — search fly-to', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lands exactly on the searched place on a wide, zoomed-out map', () => {
    // Run animation frames synchronously, each one well past the last.
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      now += 5000;
      cb(now);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    // Start over Slatina, zoomed out — as in the reported screenshot.
    const { map, current } = fakeMap({ lat: 45.70, lng: 17.70 }, 9);
    const onArrive = vi.fn();
    const zagreb = { lat: 45.815, lng: 15.9819 };

    flyCamera(map, { center: zagreb, zoom: 12 }, { onArrive });

    expect(current().center.lat).toBeCloseTo(zagreb.lat, 6);
    expect(current().center.lng).toBeCloseTo(zagreb.lng, 6);
    expect(current().zoom).toBe(12);
    expect(onArrive).toHaveBeenCalledTimes(1);
  });

  it('jumps straight there when the visitor prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { map, moves, current } = fakeMap({ lat: 45.70, lng: 17.70 }, 9);
    const onArrive = vi.fn();

    flyCamera(map, { center: { lat: 45.815, lng: 15.9819 }, zoom: 12 }, { onArrive });

    expect(moves).toHaveLength(1);
    expect(current()).toEqual({ center: { lat: 45.815, lng: 15.9819 }, zoom: 12 });
    expect(onArrive).toHaveBeenCalledTimes(1);
  });
});
