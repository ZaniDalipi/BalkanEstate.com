/**
 * Basemap tile resolution
 *
 * CARTO and Stadia serve tiles without a key, but stamped "API KEY REQUIRED"
 * across the map. That made the watermark invisible in code review and obvious
 * to every visitor, so the substitution is pinned here: no key means no keyed
 * host in any tile URL.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const KEYED_HOSTS = ['basemaps.cartocdn.com', 'tiles.stadiamaps.com'];

/** Re-import the config with a specific env, since keys are read at load. */
const loadStyles = async (env: Record<string, string | undefined>) => {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete (import.meta.env as Record<string, unknown>)[key];
    else (import.meta.env as Record<string, unknown>)[key] = value;
  }
  return import('../../config/mapStyles');
};

const ENV_KEYS = ['VITE_CARTO_API_KEY', 'VITE_STADIA_API_KEY', 'VITE_MAP_KEYLESS_PROVIDER'];

describe('Basemap tile resolution', () => {
  let saved: Record<string, unknown>;

  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) saved[key] = (import.meta.env as Record<string, unknown>)[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete (import.meta.env as Record<string, unknown>)[key];
      else (import.meta.env as Record<string, unknown>)[key] = saved[key];
    }
    vi.resetModules();
  });

  it('uses no keyed host anywhere when no key is configured', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: undefined,
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: undefined,
    });

    for (const [name, layer] of Object.entries(MAP_TILE_LAYERS)) {
      for (const host of KEYED_HOSTS) {
        expect(layer.url, `${name} must not use ${host} without a key`).not.toContain(host);
      }
    }
  });

  it('falls back to OpenStreetMap by default', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: undefined,
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: undefined,
    });

    expect(MAP_TILE_LAYERS.positron.url).toContain('tile.openstreetmap.org');
    expect(MAP_TILE_LAYERS.choropleth.url).toContain('tile.openstreetmap.org');
    expect(MAP_TILE_LAYERS.dark.url).toContain('tile.openstreetmap.org');
    expect(MAP_TILE_LAYERS.positron.attribution).toContain('OpenStreetMap');
  });

  it('honours VITE_MAP_KEYLESS_PROVIDER=osm explicitly', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: undefined,
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: 'osm',
    });

    expect(MAP_TILE_LAYERS.positron.url).toContain('tile.openstreetmap.org');
    expect(MAP_TILE_LAYERS.choropleth.url).toContain('tile.openstreetmap.org');
  });

  it('can be switched to Esri grey canvas, keeping the light/dark roles', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: undefined,
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: 'esri',
    });

    expect(MAP_TILE_LAYERS.positron.url).toContain('World_Light_Gray_Base');
    expect(MAP_TILE_LAYERS.dark.url).toContain('World_Dark_Gray_Base');
    expect(MAP_TILE_LAYERS.positron.attribution).toContain('Esri');
  });

  it('ignores an unrecognised provider rather than breaking the map', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: undefined,
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: 'nonsense',
    });

    expect(MAP_TILE_LAYERS.positron.url).toContain('tile.openstreetmap.org');
  });

  it('uses the keyed provider once a key exists', async () => {
    const { MAP_TILE_LAYERS, hasMapProviderKey } = await loadStyles({
      VITE_CARTO_API_KEY: 'carto-key-123',
      VITE_STADIA_API_KEY: 'stadia-key-456',
      VITE_MAP_KEYLESS_PROVIDER: undefined,
    });

    expect(hasMapProviderKey('carto')).toBe(true);
    expect(MAP_TILE_LAYERS.positron.url).toContain('basemaps.cartocdn.com');
    expect(MAP_TILE_LAYERS.positron.url).toContain('api_key=carto-key-123');
    expect(MAP_TILE_LAYERS.smooth.url).toContain('api_key=stadia-key-456');
  });

  it('treats a blank key as no key', async () => {
    const { MAP_TILE_LAYERS, hasMapProviderKey } = await loadStyles({
      VITE_CARTO_API_KEY: '   ',
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: undefined,
    });

    expect(hasMapProviderKey('carto')).toBe(false);
    expect(MAP_TILE_LAYERS.positron.url).not.toContain('cartocdn');
  });

  it('leaves keyless providers (Google, OSM) untouched', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: 'carto-key-123',
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: undefined,
    });

    expect(MAP_TILE_LAYERS.street.url).toContain('mt1.google.com');
    expect(MAP_TILE_LAYERS.street.url).not.toContain('api_key');
    expect(MAP_TILE_LAYERS.osm.url).toContain('tile.openstreetmap.org');
    expect(MAP_TILE_LAYERS.satellite.url).not.toContain('api_key');
  });

  it('escapes a key with URL-unsafe characters', async () => {
    const { MAP_TILE_LAYERS } = await loadStyles({
      VITE_CARTO_API_KEY: 'a b&c',
      VITE_STADIA_API_KEY: undefined,
      VITE_MAP_KEYLESS_PROVIDER: undefined,
    });

    expect(MAP_TILE_LAYERS.positron.url).toContain('api_key=a%20b%26c');
  });
});
