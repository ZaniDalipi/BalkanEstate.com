/**
 * Map picker → form write-back.
 *
 * The map is built once, on mount, and its click and drag handlers are bound
 * with it. That made them keep the callbacks from the very first render, so a
 * pin moved later wrote coordinates into a stale copy of the form and the
 * latitude/longitude fields drifted away from the marker the user could see.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

const mapHandlers: Record<string, (...args: any[]) => void> = {};
const markerHandlers: Record<string, (...args: any[]) => void> = {};

/** Leaflet needs a real layout box and tile requests; jsdom has neither. */
vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng, distanceTo: () => 0 });

  const marker: any = {
    addTo: () => marker,
    bindPopup: () => marker,
    openPopup: () => marker,
    setPopupContent: () => marker,
    setLatLng: () => marker,
    getLatLng: () => latLng(41.9981, 21.4254),
    on: (event: string, fn: (...args: any[]) => void) => { markerHandlers[event] = fn; return marker; },
  };

  const map: any = {
    setView: () => map,
    on: (event: string, fn: (...args: any[]) => void) => { mapHandlers[event] = fn; return map; },
    getContainer: () => document.createElement('div'),
    invalidateSize: () => undefined,
    remove: () => undefined,
    getZoom: () => 15,
    flyTo: () => map,
    panTo: () => map,
    hasLayer: () => true,
    addLayer: () => map,
    removeLayer: () => map,
  };

  const tileLayer = () => ({ addTo: () => undefined });

  const L = {
    map: () => map,
    tileLayer,
    marker: () => marker,
    latLng,
    Icon: { Default: { prototype: {}, mergeOptions: () => undefined } },
  };

  return { default: L, ...L };
});

vi.mock('@/services/osmService', () => ({
  reverseGeocode: vi.fn().mockResolvedValue({ display_name: 'Крани, Општина Ресен, Северна Македонија' }),
}));

vi.mock('../features/seller/hooks/useLocationSearch', () => ({
  MIN_QUERY_LENGTH: 3,
  useLocationSearch: () => ({
    query: '',
    setQuery: () => undefined,
    suggestions: [],
    isSearching: false,
    resolveSuggestion: async () => null,
    reset: () => undefined,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

import MapLocationPicker from '../features/seller/components/MapLocationPicker';

const renderPicker = (onLocationChange: (lat: number, lng: number) => void) =>
  render(
    <MapLocationPicker
      lat={41.9981}
      lng={21.4254}
      address="Skopje"
      country="North Macedonia"
      city="Skopje"
      onLocationChange={onLocationChange}
    />
  );

describe('MapLocationPicker write-back', () => {
  beforeEach(() => {
    for (const key of Object.keys(mapHandlers)) delete mapHandlers[key];
    for (const key of Object.keys(markerHandlers)) delete markerHandlers[key];
  });

  it('reports a map click through the callback of the current render', async () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = renderPicker(first);

    rerender(
      <MapLocationPicker
        lat={41.9981}
        lng={21.4254}
        address="Skopje"
        country="North Macedonia"
        city="Skopje"
        onLocationChange={latest}
      />
    );

    await act(async () => {
      mapHandlers.click({ latlng: { lat: 40.9123, lng: 21.0987 } });
    });

    expect(latest).toHaveBeenCalledWith(40.9123, 21.0987);
    expect(first).not.toHaveBeenCalled();
  });

  it('reports the pin while it is being dragged, not only on drop', async () => {
    const onLocationChange = vi.fn();
    renderPicker(onLocationChange);

    act(() => {
      markerHandlers.dragstart({});
      markerHandlers.drag({ target: { getLatLng: () => ({ lat: 40.5, lng: 20.5 }) } });
    });

    await waitFor(() => expect(onLocationChange).toHaveBeenCalledWith(40.5, 20.5));

    await act(async () => {
      markerHandlers.dragend({ target: { getLatLng: () => ({ lat: 40.6, lng: 20.6 }) } });
    });

    expect(onLocationChange).toHaveBeenLastCalledWith(40.6, 20.6);
  });
});
