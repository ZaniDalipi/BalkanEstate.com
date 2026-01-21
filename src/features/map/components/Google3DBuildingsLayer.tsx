/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Uses Overpass API to fetch OSM building data
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
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Cache for building data
const buildingCache = new Map<string, GeoJSON.Feature[]>();

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
 * Get building colors and lighting based on time of day
 * Uses classic OSMBuildings terracotta/coral style
 */
const getBuildingStyle = (hour: number): {
  wallColor: [number, number, number, number];
  roofColor: [number, number, number, number];
  sunDirection: [number, number, number];
  sunIntensity: number;
  ambientIntensity: number;
} => {
  const period = getTimePeriod(hour);

  // Calculate sun position based on hour
  const sunAngle = ((hour - 6) / 12) * Math.PI; // 6am = east, 12pm = south, 6pm = west
  const sunAltitude = Math.sin(((hour - 6) / 12) * Math.PI) * 0.7;
  const sunDirection: [number, number, number] = [
    -Math.cos(sunAngle) * 0.5,
    -Math.sin(sunAngle) * 0.5,
    -Math.max(0.3, sunAltitude),
  ];

  switch (period) {
    case 'night':
      return {
        wallColor: [50, 45, 60, 230],
        roofColor: [70, 65, 80, 220],
        sunDirection: [0, 0, -1],
        sunIntensity: 0.1,
        ambientIntensity: 0.3,
      };
    case 'dawn':
      return {
        wallColor: [200, 140, 120, 230],
        roofColor: [180, 170, 165, 220],
        sunDirection,
        sunIntensity: 0.5,
        ambientIntensity: 0.4,
      };
    case 'morning':
      return {
        wallColor: [210, 145, 115, 230],
        roofColor: [190, 185, 180, 220],
        sunDirection,
        sunIntensity: 0.7,
        ambientIntensity: 0.45,
      };
    case 'noon':
      return {
        wallColor: [215, 150, 120, 230],
        roofColor: [200, 195, 190, 220],
        sunDirection,
        sunIntensity: 0.85,
        ambientIntensity: 0.5,
      };
    case 'afternoon':
      return {
        wallColor: [212, 148, 118, 230],
        roofColor: [195, 190, 185, 220],
        sunDirection,
        sunIntensity: 0.75,
        ambientIntensity: 0.45,
      };
    case 'sunset':
      return {
        wallColor: [205, 130, 95, 230],
        roofColor: [200, 175, 155, 220],
        sunDirection,
        sunIntensity: 0.5,
        ambientIntensity: 0.4,
      };
    case 'dusk':
      return {
        wallColor: [130, 100, 115, 230],
        roofColor: [120, 115, 130, 220],
        sunDirection,
        sunIntensity: 0.2,
        ambientIntensity: 0.35,
      };
    default:
      return {
        wallColor: [215, 150, 120, 230],
        roofColor: [200, 195, 190, 220],
        sunDirection,
        sunIntensity: 0.8,
        ambientIntensity: 0.5,
      };
  }
};

/**
 * Generate Overpass query for buildings in bounds
 */
const generateOverpassQuery = (south: number, west: number, north: number, east: number): string => {
  return `
[out:json][timeout:30];
(
  way["building"](${south},${west},${north},${east});
  relation["building"](${south},${west},${north},${east});
);
out body;
>;
out skel qt;
`.trim();
};

/**
 * Parse Overpass response to GeoJSON features
 */
const parseOverpassResponse = (data: any): GeoJSON.Feature[] => {
  const features: GeoJSON.Feature[] = [];
  const nodes = new Map<number, [number, number]>();

  // First pass: collect all nodes
  for (const element of data.elements || []) {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lon, element.lat]);
    }
  }

  // Second pass: build polygons from ways
  for (const element of data.elements || []) {
    if (element.type === 'way' && element.nodes && element.nodes.length >= 4) {
      const coordinates: [number, number][] = [];

      for (const nodeId of element.nodes) {
        const coord = nodes.get(nodeId);
        if (coord) {
          coordinates.push(coord);
        }
      }

      if (coordinates.length >= 4) {
        // Determine height from tags
        let height = 12; // Default height
        const tags = element.tags || {};

        if (tags.height) {
          const h = parseFloat(tags.height);
          if (!isNaN(h)) height = h;
        } else if (tags['building:levels']) {
          const levels = parseInt(tags['building:levels']);
          if (!isNaN(levels)) height = levels * 3.5;
        } else {
          // Estimate based on building type
          const buildingType = tags.building;
          if (buildingType === 'house' || buildingType === 'detached' || buildingType === 'residential') {
            height = 9;
          } else if (buildingType === 'apartments' || buildingType === 'dormitory') {
            height = 18;
          } else if (buildingType === 'commercial' || buildingType === 'office' || buildingType === 'retail') {
            height = 15;
          } else if (buildingType === 'industrial' || buildingType === 'warehouse') {
            height = 10;
          } else if (buildingType === 'church' || buildingType === 'cathedral' || buildingType === 'mosque') {
            height = 25;
          } else if (buildingType === 'garage' || buildingType === 'shed') {
            height = 4;
          }
        }

        features.push({
          type: 'Feature',
          properties: { height, type: tags.building || 'yes' },
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
 * Fetch buildings from Overpass API with fallback endpoints and timeout
 */
const fetchBuildings = async (
  south: number,
  west: number,
  north: number,
  east: number
): Promise<GeoJSON.Feature[]> => {
  // Limit query area to prevent timeout (max ~0.02 square degrees)
  const maxSpan = 0.015;
  const latSpan = Math.min(north - south, maxSpan);
  const lngSpan = Math.min(east - west, maxSpan);
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;

  const clampedSouth = centerLat - latSpan / 2;
  const clampedNorth = centerLat + latSpan / 2;
  const clampedWest = centerLng - lngSpan / 2;
  const clampedEast = centerLng + lngSpan / 2;

  const cacheKey = `${clampedSouth.toFixed(4)},${clampedWest.toFixed(4)},${clampedNorth.toFixed(4)},${clampedEast.toFixed(4)}`;

  if (buildingCache.has(cacheKey)) {
    return buildingCache.get(cacheKey)!;
  }

  const query = generateOverpassQuery(clampedSouth, clampedWest, clampedNorth, clampedEast);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      // Add timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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

      // Cache the result (limit cache size)
      if (buildingCache.size > 50) {
        const firstKey = buildingCache.keys().next().value;
        if (firstKey) buildingCache.delete(firstKey);
      }
      buildingCache.set(cacheKey, features);

      return features;
    } catch {
      continue;
    }
  }

  // All endpoints failed - don't cache empty result to allow retry
  return [];
};

const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
}) => {
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const [buildings, setBuildings] = useState<GeoJSON.Feature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchBoundsRef = useRef<{ south: number; west: number; north: number; east: number } | null>(null);
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current hour for styling
  const currentHour = useMemo(() => {
    return dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  }, [dateTime]);

  const style = useMemo(() => getBuildingStyle(currentHour), [currentHour]);

  // Create lighting effect with sun shadows
  const lightingEffect = useMemo(() => {
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: style.ambientIntensity,
    });

    const directionalLight = new DirectionalLight({
      color: [255, 250, 240],
      intensity: style.sunIntensity,
      direction: style.sunDirection,
      _shadow: true,
    });

    return new LightingEffect({ ambientLight, directionalLight });
  }, [style]);

  // Check if current viewport is within the previously fetched bounds (with small margin)
  const isWithinFetchedBounds = useCallback((bounds: google.maps.LatLngBounds): boolean => {
    if (!lastFetchBoundsRef.current) return false;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const margin = 0.05; // 5% margin before refetching (small to trigger prefetch early)

    const latRange = lastFetchBoundsRef.current.north - lastFetchBoundsRef.current.south;
    const lngRange = lastFetchBoundsRef.current.east - lastFetchBoundsRef.current.west;

    return (
      sw.lat() > lastFetchBoundsRef.current.south + latRange * margin &&
      sw.lng() > lastFetchBoundsRef.current.west + lngRange * margin &&
      ne.lat() < lastFetchBoundsRef.current.north - latRange * margin &&
      ne.lng() < lastFetchBoundsRef.current.east - lngRange * margin
    );
  }, []);

  // Load buildings when viewport changes significantly
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    if (!bounds || !zoom || zoom < 15) {
      // Don't clear existing buildings immediately - keep them for smooth transition
      return;
    }

    // Skip if still within the previously fetched area
    if (buildings.length > 0 && isWithinFetchedBounds(bounds)) {
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    // Only show loading indicator if we have no buildings yet
    if (buildings.length === 0) {
      setIsLoading(true);
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Expand bounds by 20% in each direction (reduced from 50% to prevent timeout)
    const latPadding = (ne.lat() - sw.lat()) * 0.2;
    const lngPadding = (ne.lng() - sw.lng()) * 0.2;

    const fetchBounds = {
      south: sw.lat() - latPadding,
      west: sw.lng() - lngPadding,
      north: ne.lat() + latPadding,
      east: ne.lng() + lngPadding,
    };

    try {
      const features = await fetchBuildings(
        fetchBounds.south,
        fetchBounds.west,
        fetchBounds.north,
        fetchBounds.east
      );

      // Only update if we got results
      if (features.length > 0) {
        // Merge with existing buildings to prevent flicker
        setBuildings(prev => {
          if (prev.length === 0) return features;
          // Keep existing buildings and add new ones
          const existingIds = new Set(prev.map(f => JSON.stringify(f.geometry.coordinates[0]?.slice(0, 2))));
          const newFeatures = features.filter(f => !existingIds.has(JSON.stringify(f.geometry.coordinates[0]?.slice(0, 2))));
          return [...prev, ...newFeatures].slice(-2000); // Limit total buildings
        });
        lastFetchBoundsRef.current = fetchBounds;
      }
    } catch (error) {
      console.warn('Failed to load buildings:', error);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [map, enabled, buildings.length, isWithinFetchedBounds]);

  // Debounced load with longer delay to prevent rapid reloads
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(loadBuildings, 500);
  }, [loadBuildings]);

  // Create/update deck.gl overlay with lighting
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
          opacity: 0.92,
          getElevation: (f: GeoJSON.Feature) => (f.properties?.height as number) || 12,
          getFillColor: style.wallColor,
          getLineColor: [90, 80, 75, 120],
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.3,
            diffuse: 0.8,
            shininess: 20,
            specularColor: [50, 45, 40],
          },
          pickable: false,
          // Smooth transitions to prevent flickering
          transitions: {
            getElevation: { duration: 800, easing: (t: number) => t * (2 - t) },
            getFillColor: { duration: 600 },
          },
          updateTriggers: {
            getFillColor: [currentHour],
          },
          // Keep buildings stable during data updates
          dataComparator: (newData: any, oldData: any) => {
            if (!oldData || !newData) return false;
            return newData.features?.length === oldData.features?.length;
          },
        })
      : null;

    overlayRef.current.setProps({
      layers: buildingLayer ? [buildingLayer] : [],
      effects: [lightingEffect],
    });
  }, [map, enabled, buildings, style, lightingEffect, currentHour]);

  // Setup map listeners
  useEffect(() => {
    if (!map || !enabled) return;

    loadBuildings();

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

  if (enabled && isLoading) {
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
