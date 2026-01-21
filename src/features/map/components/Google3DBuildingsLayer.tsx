/**
 * Google3DBuildingsLayer Component
 * Renders clean, modern 3D building extrusions on Google Maps using deck.gl
 * Inspired by Apple Maps / Google Maps 3D building style
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
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// Cache for building data
const buildingCache = new Map<string, GeoJSON.Feature[]>();

/**
 * Generate Overpass query for buildings in bounds
 */
const generateOverpassQuery = (south: number, west: number, north: number, east: number): string => {
  return `
[out:json][timeout:15];
(
  way["building"](${south},${west},${north},${east});
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
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Overpass endpoint ${endpoint} returned ${response.status}, trying next...`);
        continue;
      }

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

const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
}) => {
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const [buildings, setBuildings] = useState<GeoJSON.Feature[]>([]);
  const lastFetchBoundsRef = useRef<{ south: number; west: number; north: number; east: number } | null>(null);
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate sun direction based on time
  const sunDirection = useMemo((): [number, number, number] => {
    if (!enabled) return [1, 1, -1];

    const dt = dateTime || new Date();
    const hour = dt.getHours() + dt.getMinutes() / 60;
    const clampedHour = Math.max(7, Math.min(17, hour));

    // Sun moves from east to west
    const angle = ((clampedHour - 6) / 12) * Math.PI;
    const altitude = Math.PI / 3; // 60 degree elevation for softer shadows

    return [
      Math.sin(angle) * Math.cos(altitude),
      -Math.cos(angle) * Math.cos(altitude),
      -Math.sin(altitude),
    ];
  }, [dateTime, enabled]);

  // Create MapLibre-style lighting - simple and clean
  const lightingEffect = useMemo(() => {
    if (!enabled) return null;

    // Balanced ambient for overall brightness
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.65,
    });

    // Soft directional light for subtle wall shading
    const directionalLight = new DirectionalLight({
      color: [255, 255, 255],
      intensity: 0.55,
      direction: sunDirection,
    });

    return new LightingEffect({ ambientLight, directionalLight });
  }, [sunDirection, enabled]);

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
        setBuildings(features);
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

    // Building layer - OneGeo style (gray/charcoal urban look)
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
          // OneGeo gray/charcoal color with slight warm tint
          getFillColor: [180, 175, 168, 255],
          // Darker edge for crisp definition
          getLineColor: [140, 135, 130, 255],
          lineWidthMinPixels: 1,
          // Matte material for clean urban look
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
      lastFetchBoundsRef.current = null;
    }
  }, [enabled]);

  return null;
};

export default Google3DBuildingsLayer;
