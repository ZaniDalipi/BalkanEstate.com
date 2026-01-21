/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Uses OSMBuildings tile server for fast, consistent building data
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer } from '@deck.gl/layers';

interface Google3DBuildingsLayerProps {
  map: google.maps.Map | null;
  enabled: boolean;
  dateTime?: Date;
}

// OSMBuildings tile server - same source as Leaflet version
// Using multiple subdomains for load balancing
const OSMB_SUBDOMAINS = ['a', 'b', 'c', 'd'];
const OSMB_TILE_URL_TEMPLATE = 'https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile';

// Fallback to anonymous endpoint if API key doesn't work
const OSMB_FALLBACK_URL = 'https://{s}.data.osmbuildings.org/0.2/anonymous/tile';

// Cache for tile data - persistent across component remounts
const tileCache = new Map<string, GeoJSON.Feature[]>();

// Time periods for coloring
type TimePeriod = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk';

const getTimePeriod = (hour: number): TimePeriod => {
  if (hour >= 0 && hour < 5) return 'night';
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'sunset';
  if (hour >= 20 && hour < 22) return 'dusk';
  return 'night';
};

/**
 * Get building colors based on time of day
 * Uses classic OSMBuildings terracotta/coral style for walls
 */
const getBuildingColors = (hour: number): {
  wallColor: [number, number, number, number];
  roofColor: [number, number, number, number];
} => {
  const period = getTimePeriod(hour);

  // Classic OSMBuildings terracotta/coral color scheme
  switch (period) {
    case 'night':
      return {
        wallColor: [60, 50, 70, 230],
        roofColor: [80, 75, 90, 220],
      };
    case 'dawn':
      return {
        wallColor: [200, 130, 110, 230],
        roofColor: [180, 170, 165, 220],
      };
    case 'morning':
      return {
        wallColor: [215, 135, 105, 230],
        roofColor: [190, 185, 180, 220],
      };
    case 'noon':
      return {
        wallColor: [220, 140, 110, 230],
        roofColor: [200, 195, 190, 220],
      };
    case 'afternoon':
      return {
        wallColor: [218, 138, 108, 230],
        roofColor: [195, 190, 185, 220],
      };
    case 'sunset':
      return {
        wallColor: [210, 125, 90, 230],
        roofColor: [200, 180, 160, 220],
      };
    case 'dusk':
      return {
        wallColor: [140, 100, 110, 230],
        roofColor: [130, 125, 135, 220],
      };
    default:
      return {
        wallColor: [220, 140, 110, 230],
        roofColor: [200, 195, 190, 220],
      };
  }
};

/**
 * Convert lat/lng to tile coordinates
 */
const latLngToTile = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  return { x, y };
};

/**
 * Parse OSMBuildings tile data to GeoJSON features
 */
const parseOSMBuildingsData = (data: unknown): GeoJSON.Feature[] => {
  const features: GeoJSON.Feature[] = [];

  if (Array.isArray(data)) {
    for (const building of data) {
      if (!Array.isArray(building) || building.length < 2) continue;

      const footprint = building[0];
      const height = building[1] || 12;
      const minHeight = building[2] || 0;

      if (!Array.isArray(footprint) || footprint.length < 6) continue;

      const coordinates: [number, number][] = [];
      for (let i = 0; i < footprint.length; i += 2) {
        coordinates.push([footprint[i], footprint[i + 1]]);
      }

      if (coordinates.length >= 3) {
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coordinates.push([...first]);
        }

        features.push({
          type: 'Feature',
          properties: { height, minHeight },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        });
      }
    }
  }

  return features;
};

/**
 * Fetch building tile from OSMBuildings server with fallback
 */
const fetchTile = async (z: number, x: number, y: number): Promise<GeoJSON.Feature[]> => {
  const cacheKey = `${z}/${x}/${y}`;

  if (tileCache.has(cacheKey)) {
    return tileCache.get(cacheKey)!;
  }

  const subdomain = OSMB_SUBDOMAINS[(x + y) % OSMB_SUBDOMAINS.length];

  const urls = [
    OSMB_TILE_URL_TEMPLATE.replace('{s}', subdomain) + `/${z}/${x}/${y}.json`,
    OSMB_FALLBACK_URL.replace('{s}', subdomain) + `/${z}/${x}/${y}.json`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const features = parseOSMBuildingsData(data);

      if (tileCache.size > 150) {
        const firstKey = tileCache.keys().next().value;
        if (firstKey) tileCache.delete(firstKey);
      }

      tileCache.set(cacheKey, features);
      return features;
    } catch {
      continue;
    }
  }

  tileCache.set(cacheKey, []);
  return [];
};

/**
 * Get tile keys for bounds
 */
const getTileKeys = (bounds: google.maps.LatLngBounds, zoom: number): string[] => {
  const tileZoom = Math.min(Math.max(15, Math.floor(zoom)), 17);
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const minTile = latLngToTile(ne.lat(), sw.lng(), tileZoom);
  const maxTile = latLngToTile(sw.lat(), ne.lng(), tileZoom);

  const keys: string[] = [];
  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      keys.push(`${tileZoom}/${x}/${y}`);
    }
  }
  return keys;
};

/**
 * Get all tiles needed for current viewport
 */
const getTilesForBounds = async (
  bounds: google.maps.LatLngBounds,
  zoom: number
): Promise<GeoJSON.Feature[]> => {
  const tileZoom = Math.min(Math.max(15, Math.floor(zoom)), 17);
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const minTile = latLngToTile(ne.lat(), sw.lng(), tileZoom);
  const maxTile = latLngToTile(sw.lat(), ne.lng(), tileZoom);

  const tilePromises: Promise<GeoJSON.Feature[]>[] = [];

  for (let x = minTile.x; x <= maxTile.x; x++) {
    for (let y = minTile.y; y <= maxTile.y; y++) {
      tilePromises.push(fetchTile(tileZoom, x, y));
    }
  }

  const tileResults = await Promise.all(tilePromises);
  return tileResults.flat();
};

const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
}) => {
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const [buildings, setBuildings] = useState<GeoJSON.Feature[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const lastTileKeysRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current hour for coloring
  const currentHour = useMemo(() => {
    return dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  }, [dateTime]);

  const colors = useMemo(() => getBuildingColors(currentHour), [currentHour]);

  // Load buildings when viewport changes - with debouncing to prevent flicker
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    if (!bounds || !zoom || zoom < 15) {
      if (buildings.length > 0) {
        setBuildings([]);
        lastTileKeysRef.current = new Set();
      }
      return;
    }

    // Get current tile keys
    const currentTileKeys = getTileKeys(bounds, zoom);
    const currentKeySet = new Set(currentTileKeys);

    // Check if we actually need to load new tiles
    const hasNewTiles = currentTileKeys.some(key => !lastTileKeysRef.current.has(key));
    if (!hasNewTiles && buildings.length > 0) {
      return; // No new tiles needed
    }

    // Prevent concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const features = await getTilesForBounds(bounds, zoom);

      // Only update if we got features or if we had none before
      if (features.length > 0 || buildings.length === 0) {
        setBuildings(features);
        lastTileKeysRef.current = currentKeySet;
        setIsFirstLoad(false);
      }
    } catch (error) {
      console.warn('Failed to load buildings:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [map, enabled, buildings.length]);

  // Debounced load function to prevent rapid reloads during camera movement
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadBuildings();
    }, 150); // 150ms debounce
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
      overlayRef.current = new GoogleMapsOverlay({});
      overlayRef.current.setMap(map);
    }

    const buildingLayer = buildings.length
      ? new GeoJsonLayer({
          id: '3d-buildings',
          data: { type: 'FeatureCollection', features: buildings },
          filled: true,
          extruded: true,
          wireframe: false,
          opacity: 0.95,
          getElevation: (f: GeoJSON.Feature) => (f.properties?.height as number) || 12,
          getFillColor: colors.wallColor,
          getLineColor: [100, 90, 85, 150],
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.4,
            diffuse: 0.7,
            shininess: 10,
            specularColor: [60, 50, 45],
          },
          pickable: false,
          _shadows: true,
          transitions: {
            getElevation: 300,
            getFillColor: 300,
          },
          updateTriggers: {
            getFillColor: [currentHour],
          },
        })
      : null;

    overlayRef.current.setProps({
      layers: buildingLayer ? [buildingLayer] : [],
    });
  }, [map, enabled, buildings, colors, currentHour]);

  // Setup map listeners with debouncing
  useEffect(() => {
    if (!map || !enabled) return;

    // Initial load
    loadBuildings();

    // Listen for map idle with debounce
    const idleListener = map.addListener('idle', debouncedLoad);

    return () => {
      google.maps.event.removeListener(idleListener);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [map, enabled, loadBuildings, debouncedLoad]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Only show loading on first load
  if (enabled && isFirstLoad && buildings.length === 0) {
    return (
      <div className="absolute top-24 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-700">Loading 3D buildings...</span>
      </div>
    );
  }

  return null;
};

export default Google3DBuildingsLayer;
