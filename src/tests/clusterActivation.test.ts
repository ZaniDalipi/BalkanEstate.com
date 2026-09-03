/**
 * Cluster activation — what a visitor is left looking at after tapping a bubble.
 *
 * `clusterCamera.test.ts` covers the geometry; this suite drives the Google Maps
 * half against a stub map, because the two failures worth guarding are both
 * about marker *state* rather than maths:
 *
 *   1. Two listings at one address are separated by flying in, not by fanning
 *      them onto leader lines. Legs are a last resort, and they are temporary —
 *      anything they hold goes away again the moment the visitor zooms.
 *   2. When legs genuinely are the only option, folding them back leaves every
 *      pin on the map. Detaching them here used to strand them: the clusterer's
 *      re-render is a no-op whenever its (markers, zoom) key is unchanged, so
 *      nothing put them back and both listings vanished on a zoom-out.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClusterActivation } from '../features/map/utils/clusterZoom';

type Listener = { event: string; handler: (...args: unknown[]) => void };

interface StubMarker {
  position: { lat: number; lng: number };
  content: HTMLElement;
  map: unknown;
}

const polylines: Array<{ path: unknown; map: unknown; setMap: (map: unknown) => void }> = [];

/** Every listener the code under test registered, so tests can fire map events. */
let listeners: Listener[] = [];

function createStubMap(zoom: number, viewport = { width: 390, height: 844 }) {
  const div = document.createElement('div');
  div.getBoundingClientRect = () =>
    ({ width: viewport.width, height: viewport.height }) as DOMRect;

  const state = { zoom, center: { lat: 40.15, lng: 19.64 } };

  return {
    getZoom: () => state.zoom,
    getCenter: () => ({ lat: () => state.center.lat, lng: () => state.center.lng }),
    setZoom: (next: number) => {
      state.zoom = next;
    },
    setCenter: (next: { lat: number; lng: number }) => {
      state.center = next;
    },
    getDiv: () => div,
    addListener: (event: string, handler: (...args: unknown[]) => void) => {
      const listener = { event, handler };
      listeners.push(listener);
      return {
        remove: () => {
          listeners = listeners.filter((entry) => entry !== listener);
        },
      };
    },
  } as unknown as google.maps.Map;
}

const fire = (event: string) => {
  for (const listener of [...listeners]) {
    if (listener.event === event) listener.handler();
  }
};

const makeMarker = (lat: number, lng: number, map: unknown): StubMarker => ({
  position: { lat, lng },
  content: document.createElement('div'),
  map,
});

beforeEach(() => {
  listeners = [];
  polylines.length = 0;

  // Reduced motion collapses the flight into a direct jump, so `onArrive` runs
  // synchronously and the test never has to drive animation frames.
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

  (globalThis as Record<string, unknown>).google = {
    maps: {
      event: {
        addListenerOnce: (
          _map: unknown,
          event: string,
          handler: (...args: unknown[]) => void,
        ) => {
          const listener = { event, handler };
          listeners.push(listener);
          return {
            remove: () => {
              listeners = listeners.filter((entry) => entry !== listener);
            },
          };
        },
      },
      Polyline: class {
        path: unknown;
        map: unknown;
        constructor(options: { path: unknown; map: unknown }) {
          this.path = options.path;
          this.map = options.map;
          polylines.push(this as never);
        }
        setMap(map: unknown) {
          this.map = map;
        }
      },
    },
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).google;
  vi.useRealTimers();
});

/** Taps the bubble and lets the map settle, which is when pins are revealed. */
function activate(map: google.maps.Map, markers: StubMarker[]) {
  const activation = createClusterActivation({
    getClusterer: () => ({ render: () => {} }),
    maxZoom: 21,
  });

  activation.onClusterClick(
    {} as google.maps.MapMouseEvent,
    { markers: markers as never, marker: undefined },
    map,
  );
  fire('idle');

  return activation;
}

describe('createClusterActivation', () => {
  it('separates two listings at one address by zooming, not by leader lines', () => {
    // Exactly what the map's co-located fan produces for a duplicate pair:
    // 0.00015 deg of latitude either side of the shared anchor.
    const map = createStubMap(12);
    const markers = [
      makeMarker(40.15015, 19.64, map),
      makeMarker(40.14985, 19.64, map),
    ];

    activate(map, markers);

    expect(polylines).toHaveLength(0);
    expect(markers.every((marker) => marker.map === map)).toBe(true);
    expect(markers[0].position).toEqual({ lat: 40.15015, lng: 19.64 });
    expect(markers[1].position).toEqual({ lat: 40.14985, lng: 19.64 });
  });

  it('still fans out pins that share one exact coordinate', () => {
    const map = createStubMap(12);
    const markers = [makeMarker(40.15, 19.64, map), makeMarker(40.15, 19.64, map)];

    activate(map, markers);

    expect(polylines).toHaveLength(2);
    // Both pins were moved off the anchor they were stacked on.
    expect(markers[0].position).not.toEqual(markers[1].position);
  });

  it('leaves both pins on the map when the legs fold back on a zoom', () => {
    const map = createStubMap(12);
    const markers = [makeMarker(40.15, 19.64, map), makeMarker(40.15, 19.64, map)];
    let rendered = 0;

    const activation = createClusterActivation({
      getClusterer: () => ({ render: () => { rendered += 1; } }),
      maxZoom: 21,
    });
    activation.onClusterClick(
      {} as google.maps.MapMouseEvent,
      { markers: markers as never, marker: undefined },
      map,
    );
    fire('idle');
    expect(polylines).toHaveLength(2);

    // The visitor zooms. This is the moment the two listings used to disappear.
    fire('zoom_changed');

    expect(markers.every((marker) => marker.map === map)).toBe(true);
    expect(markers[0].position).toEqual({ lat: 40.15, lng: 19.64 });
    expect(markers[1].position).toEqual({ lat: 40.15, lng: 19.64 });
    // The legs themselves are gone, and the clusterer owns visibility again.
    expect(polylines.every((leg) => leg.map === null)).toBe(true);
    expect(rendered).toBe(1);
  });

  it('leaves both pins on the map when the legs fold back on a drag or a tap', () => {
    for (const event of ['dragstart', 'click']) {
      listeners = [];
      polylines.length = 0;

      const map = createStubMap(12);
      const markers = [makeMarker(40.15, 19.64, map), makeMarker(40.15, 19.64, map)];
      activate(map, markers);
      expect(polylines).toHaveLength(2);

      fire(event);

      expect(markers.every((marker) => marker.map === map)).toBe(true);
      expect(markers[0].position).toEqual({ lat: 40.15, lng: 19.64 });
    }
  });
});
