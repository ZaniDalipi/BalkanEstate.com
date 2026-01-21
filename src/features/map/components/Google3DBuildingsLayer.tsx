/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions using Overpass API with tile-based caching
 * Style inspired by OneGeo
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer } from '@deck.gl/layers';
import { AmbientLight, DirectionalLight, LightingEffect } from '@deck.gl/core';

interface Google3DBuildingsLayerProps {
  map: google.maps.Map | null;
  enabled: boolean;
  dateTime?: Date;
}

// Overpass API endpoints (multiple for fallback)
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

// Cache for building data
const buildingCache = new Map<string, GeoJSON.Feature[]>();

/**
 * Convert lat/lng to tile coordinates
 */
const latLngToTile = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
};

/**
 * Get tile bounds
 */
const tileToBounds = (x: number, y: number, zoom: number): { north: number; south: number; west: number; east: number } => {
  const n = Math.pow(2, zoom);
  const west = x / n * 360 - 180;
  const east = (x + 1) / n * 360 - 180;
  const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return { north, south, west, east };
};

/**
 * Fetch buildings from Overpass API for a tile
 */
const fetchTileFromOverpass = async (x: number, y: number, zoom: number = 15): Promise<GeoJSON.Feature[]> => {
  const cacheKey = `${zoom}/${x}/${y}`;

  if (buildingCache.has(cacheKey)) {
    return buildingCache.get(cacheKey)!;
  }

  const bounds = tileToBounds(x, y, zoom);
  const query = `
[out:json][timeout:15];
(
  way["building"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out body;
>;
out skel qt;
`.trim();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      const features = parseOverpassResponse(data);

      // Cache with size limit
      if (buildingCache.size > 100) {
        const firstKey = buildingCache.keys().next().value;
        if (firstKey) buildingCache.delete(firstKey);
      }
      buildingCache.set(cacheKey, features);

      return features;
    } catch {
      continue;
    }
  }

  return [];
};

/**
 * Parse Overpass response to GeoJSON features
 */
const parseOverpassResponse = (data: any): GeoJSON.Feature[] => {
  const features: GeoJSON.Feature[] = [];
  const nodes = new Map<number, [number, number]>();

  for (const element of data.elements || []) {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lon, element.lat]);
    }
  }

  for (const element of data.elements || []) {
    if (element.type === 'way' && element.nodes && element.nodes.length >= 4) {
      const coordinates: [number, number][] = [];

      for (const nodeId of element.nodes) {
        const coord = nodes.get(nodeId);
        if (coord) coordinates.push(coord);
      }

      if (coordinates.length >= 4) {
        const tags = element.tags || {};
        let height = 12;

        if (tags.height) {
          height = parseFloat(tags.height) || 12;
        } else if (tags['building:levels']) {
          height = (parseInt(tags['building:levels']) || 4) * 3;
        } else {
          const type = tags.building;
          if (type === 'house' || type === 'detached' || type === 'residential') height = 9;
          else if (type === 'apartments' || type === 'dormitory') height = 18;
          else if (type === 'commercial' || type === 'office') height = 15;
          else if (type === 'industrial' || type === 'warehouse') height = 10;
          else if (type === 'church' || type === 'cathedral') height = 25;
          else if (type === 'garage' || type === 'shed') height = 4;
        }

        features.push({
          type: 'Feature',
          properties: { height, type: tags.building || 'yes' },
          geometry: { type: 'Polygon', coordinates: [coordinates] },
        });
      }
    }
  }

  return features;
};

/**
 * Fetch all tiles for the visible area
 */
const fetchTilesForBounds = async (bounds: google.maps.LatLngBounds): Promise<GeoJSON.Feature[]> => {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const zoom = 15;

  const swTile = latLngToTile(sw.lat(), sw.lng(), zoom);
  const neTile = latLngToTile(ne.lat(), ne.lng(), zoom);

  const minX = Math.min(swTile.x, neTile.x);
  const maxX = Math.max(swTile.x, neTile.x);
  const minY = Math.min(swTile.y, neTile.y);
  const maxY = Math.max(swTile.y, neTile.y);

  // Limit tile count
  const tileCount = (maxX - minX + 1) * (maxY - minY + 1);
  if (tileCount > 9) return [];

  // Fetch tiles in parallel
  const tilePromises: Promise<GeoJSON.Feature[]>[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tilePromises.push(fetchTileFromOverpass(x, y, zoom));
    }
  }

  const results = await Promise.all(tilePromises);
  return results.flat();
};

const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
}) => {
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const [buildings, setBuildings] = useState<GeoJSON.Feature[]>([]);
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string | null>(null);

  // Calculate sun direction based on time
  const sunDirection = useMemo((): [number, number, number] => {
    if (!enabled) return [1, 1, -1];

    const dt = dateTime || new Date();
    const hour = dt.getHours() + dt.getMinutes() / 60;
    const clampedHour = Math.max(7, Math.min(17, hour));

    const angle = ((clampedHour - 6) / 12) * Math.PI;
    const altitude = Math.PI / 3;

    return [
      Math.sin(angle) * Math.cos(altitude),
      -Math.cos(angle) * Math.cos(altitude),
      -Math.sin(altitude),
    ];
  }, [dateTime, enabled]);

  // Create lighting effect
  const lightingEffect = useMemo(() => {
    if (!enabled) return null;

    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.65,
    });

    const directionalLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: 0.55,
      direction: sunDirection,
    });

    return new LightingEffect({ ambientLight, directionalLight });
  }, [sunDirection, enabled]);

  // Load buildings for current view
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (!bounds || !zoom || zoom < 15) {
      setBuildings([]);
      return;
    }

    // Create bounds key based on tiles to check if we need to reload
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const swTile = latLngToTile(sw.lat(), sw.lng(), 15);
    const neTile = latLngToTile(ne.lat(), ne.lng(), 15);
    const boundsKey = `${swTile.x},${swTile.y}-${neTile.x},${neTile.y}`;

    if (boundsKey === lastBoundsRef.current) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    lastBoundsRef.current = boundsKey;

    try {
      const features = await fetchTilesForBounds(bounds);
      if (features.length > 0) {
        setBuildings(features);
      }
    } catch {
      // Ignore errors
    } finally {
      loadingRef.current = false;
    }
  }, [map, enabled]);

  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadBuildings, 300);
  }, [loadBuildings]);

  // Create/update deck.gl overlay
  useEffect(() => {
    if (!map || !enabled) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({ interleaved: true });
      overlayRef.current.setMap(map);
    }

    const layers = [];

    // Building layer - OneGeo style
    if (buildings.length > 0) {
      layers.push(
        new GeoJsonLayer({
          id: '3d-buildings',
          data: { type: 'FeatureCollection', features: buildings },
          filled: true,
          extruded: true,
          wireframe: false,
          opacity: 1,
          getElevation: (f: GeoJSON.Feature) => (f.properties?.height as number) || 12,
          // OneGeo gray/charcoal color
          getFillColor: [180, 175, 168, 255],
          getLineColor: [140, 135, 130, 255],
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.5,
            diffuse: 0.5,
            shininess: 0,
            specularColor: [0, 0, 0],
          },
          pickable: false,
        })
      );
    }

    overlayRef.current.setProps({
      layers,
      effects: lightingEffect ? [lightingEffect] : [],
    });
  }, [map, enabled, buildings, lightingEffect]);

  // Map listeners
  useEffect(() => {
    if (!map || !enabled) return;

    const idleListener = map.addListener('idle', debouncedLoad);
    debouncedLoad();

    return () => {
      google.maps.event.removeListener(idleListener);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map, enabled, debouncedLoad]);

  // Cleanup on disable
  useEffect(() => {
    if (!enabled) {
      setBuildings([]);
      lastBoundsRef.current = null;
    }
  }, [enabled]);

  return null;
};

export default Google3DBuildingsLayer;
