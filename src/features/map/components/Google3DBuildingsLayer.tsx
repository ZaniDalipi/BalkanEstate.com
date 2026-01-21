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
        if (coord) {
          coordinates.push(coord);
        }
      }

      if (coordinates.length >= 4) {
        let height = 12;
        const tags = element.tags || {};

        if (tags.height) {
          const h = parseFloat(tags.height);
          if (!isNaN(h)) height = h;
        } else if (tags['building:levels']) {
          const levels = parseInt(tags['building:levels']);
          if (!isNaN(levels)) height = levels * 3.5;
        } else {
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
 * Fetch buildings from Overpass API
 */
const fetchBuildings = async (
  south: number,
  west: number,
  north: number,
  east: number
): Promise<GeoJSON.Feature[]> => {
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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

  return [];
};

/**
 * Calculate shadow polygons based on sun position
 * Creates only the cast shadow on the ground (offset from building)
 */
const calculateShadowPolygons = (
  buildings: GeoJSON.Feature[],
  sunAzimuth: number,
  sunAltitude: number
): Array<{ polygon: [number, number][]; opacity: number }> => {
  const shadows: Array<{ polygon: [number, number][]; opacity: number }> = [];

  // Shadow parameters
  const shadowLength = Math.min(3, 1.2 / Math.tan(Math.max(0.4, sunAltitude)));
  const baseOffset = 0.00008;

  const dx = Math.sin(sunAzimuth) * shadowLength * baseOffset;
  const dy = -Math.cos(sunAzimuth) * shadowLength * baseOffset;

  for (const building of buildings) {
    const height = (building.properties?.height as number) || 12;
    const coords = (building.geometry as any).coordinates[0] as [number, number][];
    if (!coords || coords.length < 4) continue;

    const heightFactor = Math.sqrt(height) / 3;
    const shadowDx = dx * heightFactor;
    const shadowDy = dy * heightFactor;

    // Create shadow as offset footprint only (not connecting to building)
    // This prevents shadows from overlapping building geometry
    const shadowPolygon: [number, number][] = coords.map(([lng, lat]) => [
      lng + shadowDx,
      lat + shadowDy,
    ]);

    shadows.push({
      polygon: shadowPolygon,
      opacity: 0.35,
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

  // Calculate sun position from time (always daytime look)
  const sunPosition = useMemo(() => {
    if (!enabled) return { azimuth: Math.PI / 2, altitude: Math.PI / 4 }; // Default: sun from south
    const dt = dateTime || new Date();
    const hour = dt.getHours() + dt.getMinutes() / 60;
    // Clamp hour to daytime range (7am - 5pm) for consistent look
    const clampedHour = Math.max(7, Math.min(17, hour));
    const azimuth = ((clampedHour - 6) / 12) * Math.PI;
    const altitude = Math.PI / 4; // Fixed 45 degree sun angle for consistent shadows
    return { azimuth, altitude };
  }, [dateTime, enabled]);

  // Create lighting effect - always bright daytime
  const lightingEffect = useMemo(() => {
    if (!enabled) return null;

    const { azimuth, altitude } = sunPosition;

    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.6, // Bright ambient
    });

    const sunDirection: [number, number, number] = [
      Math.sin(azimuth) * Math.cos(altitude),
      -Math.cos(azimuth) * Math.cos(altitude),
      -Math.sin(altitude),
    ];

    const directionalLight = new DirectionalLight({
      color: [255, 252, 245],
      intensity: 1.2,
      direction: sunDirection,
    });

    return new LightingEffect({ ambientLight, directionalLight });
  }, [sunPosition, enabled]);

  // Calculate shadow polygons
  const shadowPolygons = useMemo(() => {
    if (!enabled || buildings.length === 0) return [];
    return calculateShadowPolygons(buildings, sunPosition.azimuth, sunPosition.altitude);
  }, [buildings, sunPosition, enabled]);

  // Check if viewport is within fetched bounds
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

  // Load buildings
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled) return;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (!bounds || !zoom || zoom < 15) return;
    if (buildings.length > 0 && isWithinFetchedBounds(bounds)) return;
    if (loadingRef.current) return;

    loadingRef.current = true;
    if (buildings.length === 0) setIsLoading(true);

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latPadding = (ne.lat() - sw.lat()) * 0.2;
    const lngPadding = (ne.lng() - sw.lng()) * 0.2;

    try {
      const features = await fetchBuildings(
        sw.lat() - latPadding,
        sw.lng() - lngPadding,
        ne.lat() + latPadding,
        ne.lng() + lngPadding
      );

      if (features.length > 0) {
        setBuildings(features); // Replace instead of merge to reduce flickering
        lastFetchBoundsRef.current = {
          south: sw.lat() - latPadding,
          west: sw.lng() - lngPadding,
          north: ne.lat() + latPadding,
          east: ne.lng() + lngPadding,
        };
      }
    } catch {
      // Ignore errors
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [map, enabled, buildings.length, isWithinFetchedBounds]);

  const debouncedLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadBuildings, 500);
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

    // Shadow layer - rendered first (below buildings)
    // Using offset footprints to avoid overlap with building geometry
    if (shadowPolygons.length > 0) {
      layers.push(
        new PolygonLayer({
          id: 'building-shadows',
          data: shadowPolygons,
          getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
          getFillColor: [30, 30, 50, 80], // Subtle dark shadow
          filled: true,
          stroked: false,
          extruded: false,
          pickable: false,
        })
      );
    }

    // Building layer - warm terracotta like classic OSMBuildings
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
          getFillColor: [210, 150, 120, 255], // Warm terracotta/salmon
          getLineColor: [160, 120, 90, 255], // Darker brown outline
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.4,
            diffuse: 0.7,
            shininess: 8,
            specularColor: [60, 50, 40],
          },
          pickable: false,
        })
      );
    }

    overlayRef.current.setProps({
      layers,
      effects: lightingEffect ? [lightingEffect] : [],
    });
  }, [map, enabled, buildings, shadowPolygons, lightingEffect]);

  // Map listeners
  useEffect(() => {
    if (!map || !enabled) return;
    loadBuildings();
    const idleListener = map.addListener('idle', debouncedLoad);
    return () => {
      google.maps.event.removeListener(idleListener);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map, enabled, loadBuildings, debouncedLoad]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
