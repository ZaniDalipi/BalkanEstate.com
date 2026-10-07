import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readMapView, saveMapView, rememberOpenedProperty, clearOpenedProperty } from './mapViewMemory';

const enterEntry = (key: string) => window.history.replaceState({ key }, '', '/en/search');

describe('mapViewMemory', () => {
  beforeEach(() => {
    // The global setup stubs sessionStorage with no-ops; this module needs a real one.
    const data = new Map<string, string>();
    vi.mocked(sessionStorage.getItem).mockImplementation((k) => data.get(k) ?? null);
    vi.mocked(sessionStorage.setItem).mockImplementation((k, v) => void data.set(k, v));
    enterEntry('a');
  });

  it('has no view for an entry the map was never shown on', () => {
    expect(readMapView()).toBeNull();
  });

  it('restores the view saved for the same history entry only', () => {
    saveMapView(41.33, 19.82, 14);
    expect(readMapView()).toEqual({ lat: 41.33, lng: 19.82, zoom: 14, openedPropertyId: undefined });

    enterEntry('b');
    expect(readMapView()).toBeNull();
  });

  it('remembers the opened listing across later view saves, until cleared', () => {
    saveMapView(41.33, 19.82, 14);
    rememberOpenedProperty('p1');
    saveMapView(41.34, 19.8, 15);
    expect(readMapView()?.openedPropertyId).toBe('p1');

    clearOpenedProperty();
    expect(readMapView()?.openedPropertyId).toBeUndefined();
  });

  it('ignores an opened listing on a page without a map view', () => {
    rememberOpenedProperty('p1');
    expect(readMapView()).toBeNull();
  });
});
