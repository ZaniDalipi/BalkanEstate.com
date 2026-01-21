/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Styled to match classic OSMBuildings with sun shadows
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
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

// Classic OSMBuildings color palette
const OSM_COLORS = {
  // Terracotta/beige wall colors - classic OSMBuildings style
  wallLight: [238, 211, 182, 255] as [number, number, number, number],  // Sunlit side
  wallMid: [216, 183, 150, 255] as [number, number, number, number],    // Mid tone
  wallDark: [180, 150, 120, 255] as [number, number, number, number],   // Shadow side
  // Roof colors
  roofLight: [220, 210, 200, 255] as [number, number, number, number],
  roofDark: [190, 180, 170, 255] as [number, number, number, number],
  // Shadow color (dark blue-gray on ground)
  shadow: [60, 50, 70, 120] as [number, number, number, number],
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

/**
 * Calculate shadow polygons for buildings based on sun position
 * Creates proper shadow shapes that extend from building footprint
 */
const calculateShadowPolygons = (
  buildings: GeoJSON.Feature[],
  sunAzimuth: number, // radians, 0 = north, clockwise
  sunAltitude: number // radians, 0 = horizon
): Array<{ polygon: [number, number][]; opacity: number }> => {
  if (sunAltitude <= 0.1) return []; // No shadows at night/very low sun

  const shadows: Array<{ polygon: [number, number][]; opacity: number }> = [];

  // Shadow length based on sun altitude - longer shadows when sun is lower
  const shadowLength = Math.min(3, 1 / Math.tan(Math.max(0.15, sunAltitude)));

  // Shadow opacity - darker when sun is higher, fades at sunrise/sunset
  const shadowOpacity = Math.min(0.6, Math.max(0.2, sunAltitude * 0.8));

  // Base shadow offset scale (in degrees) - increased for visibility
  const baseOffset = 0.00008;

  // Sun direction vector
  const dx = Math.sin(sunAzimuth) * shadowLength * baseOffset;
  const dy = -Math.cos(sunAzimuth) * shadowLength * baseOffset;

  for (const building of buildings) {
    const height = (building.properties?.height as number) || 12;
    const coords = building.geometry.coordinates[0] as [number, number][];
    if (!coords || coords.length < 4) continue;

    // Scale shadow by building height (taller = longer shadow)
    const heightFactor = Math.sqrt(height) / 3;
    const shadowDx = dx * heightFactor;
    const shadowDy = dy * heightFactor;

    // Create a proper shadow polygon that connects building base to shadow projection
    // This creates a more realistic shadow shape
    const shadowPolygon: [number, number][] = [];

    // Add the original building footprint points
    for (const [lng, lat] of coords) {
      shadowPolygon.push([lng, lat]);
    }

    // Add the offset shadow points in reverse order to create closed shape
    for (let i = coords.length - 1; i >= 0; i--) {
      const [lng, lat] = coords[i];
      shadowPolygon.push([lng + shadowDx, lat + shadowDy]);
    }

    shadows.push({
      polygon: shadowPolygon,
      opacity: shadowOpacity,
    });
  }

  return shadows;
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

  // Get current time for sun position - only calculate when enabled
  const currentHour = useMemo(() => {
    if (!enabled) return 12; // Default, won't be used
    const dt = dateTime || new Date();
    return dt.getHours() + dt.getMinutes() / 60;
  }, [dateTime, enabled]);

  // Calculate sun position - only when enabled
  const sunPosition = useMemo(() => {
    if (!enabled) return { azimuth: 0, altitude: 0 };
    const hour = currentHour;
    const azimuth = ((hour - 6) / 12) * Math.PI;
    const altitude = Math.sin(((hour - 6) / 12) * Math.PI) * (Math.PI / 3);
    return { azimuth, altitude };
  }, [currentHour, enabled]);

  // Create lighting effect - only when enabled
  const lightingEffect = useMemo(() => {
    if (!enabled) return null;
    const { azimuth, altitude } = sunPosition;
    const isDay = altitude > 0.05;

    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: isDay ? 0.4 : 0.2,
    });

    const sunDirection: [number, number, number] = [
      Math.sin(azimuth) * Math.cos(altitude),
      -Math.cos(azimuth) * Math.cos(altitude),
      -Math.sin(altitude),
    ];

    const directionalLight = new DirectionalLight({
      color: isDay ? [255, 250, 240] : [100, 100, 120],
      intensity: isDay ? 1.5 : 0.2,
      direction: sunDirection,
      _shadow: true,
    });

    return new LightingEffect({ ambientLight, directionalLight });
  }, [sunPosition, enabled]);

  // Calculate shadow polygons - only when enabled and have buildings
  const shadowPolygons = useMemo(() => {
    if (!enabled || buildings.length === 0 || sunPosition.altitude <= 0.05) return [];
    return calculateShadowPolygons(buildings, sunPosition.azimuth, sunPosition.altitude);
  }, [buildings, sunPosition, enabled]);

  // Check if current viewport is within the previously fetched bounds
  const isWithinFetchedBounds = useCallback((bounds: google.maps.LatLngBounds): boolean => {
    if (!lastFetchBoundsRef.current) return false;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const margin = 0.05;

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
      return;
    }

    if (buildings.length > 0 && isWithinFetchedBounds(bounds)) {
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    if (buildings.length === 0) {
      setIsLoading(true);
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

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

      if (features.length > 0) {
        setBuildings(prev => {
          if (prev.length === 0) return features;
          const existingIds = new Set(prev.map(f => JSON.stringify(f.geometry.coordinates[0]?.slice(0, 2))));
          const newFeatures = features.filter(f => !existingIds.has(JSON.stringify(f.geometry.coordinates[0]?.slice(0, 2))));
          return [...prev, ...newFeatures].slice(-2000);
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

  // Debounced load
  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(loadBuildings, 500);
  }, [loadBuildings]);

  // Create/update deck.gl overlay with OSMBuildings style
  useEffect(() => {
    if (!map || !enabled) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({
        interleaved: true, // Allow Google Maps elements (markers) to show through
      });
      overlayRef.current.setMap(map);
    }

    const layers = [];

    // Shadow layer - rendered first (below buildings) with dark blue-gray color
    if (shadowPolygons.length > 0) {
      layers.push(
        new PolygonLayer({
          id: 'building-shadows',
          data: shadowPolygons,
          getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
          // Dark shadow color matching OSMBuildings style
          getFillColor: (d: { opacity: number }) => [30, 30, 50, Math.floor(d.opacity * 200)],
          getLineColor: [0, 0, 0, 0],
          filled: true,
          stroked: false,
          extruded: false,
          pickable: false,
        })
      );
    }

    // Building layer - OSMBuildings terracotta style
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
          // Classic OSMBuildings terracotta color
          getFillColor: OSM_COLORS.wallMid,
          // Subtle outline for definition
          getLineColor: [160, 140, 120, 100],
          lineWidthMinPixels: 1,
          // Material for realistic shading
          material: {
            ambient: 0.35,
            diffuse: 0.7,
            shininess: 10,
            specularColor: [255, 255, 255],
          },
          // Enable shadows
          shadowEnabled: true,
          pickable: false,
          // Smooth transitions
          transitions: {
            getElevation: { duration: 600 },
            getFillColor: { duration: 400 },
          },
          updateTriggers: {
            getFillColor: [currentHour],
          },
        })
      );
    }

    overlayRef.current.setProps({
      layers,
      effects: lightingEffect ? [lightingEffect] : [],
    });
  }, [map, enabled, buildings, shadowPolygons, lightingEffect, currentHour]);

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
        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-amber-800">Loading 3D buildings...</span>
      </div>
    );
  }

  return null;
};

export default Google3DBuildingsLayer;
