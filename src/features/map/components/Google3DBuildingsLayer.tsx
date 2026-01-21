/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Enhanced sun lighting system for realistic building illumination
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { AmbientLight, DirectionalLight, LightingEffect, _SunLight as SunLight } from '@deck.gl/core';

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
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per endpoint

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Skip to next endpoint on server errors
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

/**
 * Calculate shadow polygons based on sun position
 * Creates realistic cast shadows that vary with sun altitude
 */
const calculateShadowPolygons = (
  buildings: GeoJSON.Feature[],
  sunAzimuth: number,
  sunAltitude: number,
  hour: number
): Array<{ polygon: [number, number][]; opacity: number }> => {
  const shadows: Array<{ polygon: [number, number][]; opacity: number }> = [];

  // Shadow length based on sun altitude (longer shadows at low sun angles)
  // At 60° altitude: short shadows, at 15° altitude: long shadows
  const shadowMultiplier = 1 / Math.tan(Math.max(0.2, sunAltitude));
  const baseOffset = 0.00006;

  // Shadow direction - opposite of sun direction
  const dx = Math.sin(sunAzimuth) * shadowMultiplier * baseOffset;
  const dy = -Math.cos(sunAzimuth) * shadowMultiplier * baseOffset;

  // Shadow opacity varies with time - darker at midday, softer at golden hour
  const hourFromNoon = Math.abs(hour - 12);
  const baseOpacity = hourFromNoon > 4 ? 0.25 : 0.4;

  for (const building of buildings) {
    const height = (building.properties?.height as number) || 12;
    const coords = (building.geometry as any).coordinates[0] as [number, number][];
    if (!coords || coords.length < 4) continue;

    // Height affects shadow length (taller buildings cast longer shadows)
    const heightFactor = Math.sqrt(height) / 2.5;
    const shadowDx = dx * heightFactor;
    const shadowDy = dy * heightFactor;

    // Create shadow as offset footprint
    const shadowPolygon: [number, number][] = coords.map(([lng, lat]) => [
      lng + shadowDx,
      lat + shadowDy,
    ]);

    shadows.push({
      polygon: shadowPolygon,
      opacity: baseOpacity,
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

  // Calculate sun position from time with realistic solar angles
  const sunPosition = useMemo(() => {
    if (!enabled) return { azimuth: Math.PI * 0.75, altitude: Math.PI / 4, hour: 12 };

    const dt = dateTime || new Date();
    const hour = dt.getHours() + dt.getMinutes() / 60;
    // Clamp to daytime (6am - 6pm) for good visibility
    const clampedHour = Math.max(6, Math.min(18, hour));

    // Sun azimuth: East (6am) -> South (12pm) -> West (6pm)
    // 0 = North, PI/2 = East, PI = South, 3PI/2 = West
    const azimuth = Math.PI * (0.5 + (clampedHour - 6) / 12);

    // Sun altitude: peaks at noon (~60°), lower at morning/evening (~15°)
    const hourFromNoon = Math.abs(clampedHour - 12);
    const maxAltitude = Math.PI / 3; // 60 degrees at noon
    const minAltitude = Math.PI / 12; // 15 degrees at sunrise/sunset
    const altitude = maxAltitude - (hourFromNoon / 6) * (maxAltitude - minAltitude);

    return { azimuth, altitude, hour: clampedHour };
  }, [dateTime, enabled]);

  // Calculate sun color temperature based on time (warmer at sunrise/sunset)
  const sunColor = useMemo((): [number, number, number] => {
    const { hour } = sunPosition;
    const hourFromNoon = Math.abs(hour - 12);

    if (hourFromNoon > 5) {
      // Golden hour - warm orange
      return [255, 200, 150];
    } else if (hourFromNoon > 3) {
      // Late afternoon/early morning - warm yellow
      return [255, 240, 210];
    } else {
      // Midday - neutral white with slight warmth
      return [255, 252, 248];
    }
  }, [sunPosition]);

  // Create comprehensive lighting effect for realistic sun illumination
  const lightingEffect = useMemo(() => {
    if (!enabled) return null;

    const { azimuth, altitude } = sunPosition;

    // Sky light - cool blue ambient from above (simulates sky dome)
    const skyLight = new AmbientLight({
      color: [220, 235, 255], // Slight blue tint
      intensity: 0.35,
    });

    // Calculate sun direction vector
    const sunDirection: [number, number, number] = [
      Math.sin(azimuth) * Math.cos(altitude),
      -Math.cos(azimuth) * Math.cos(altitude),
      -Math.sin(altitude),
    ];

    // Primary sun light - warm directional
    const sunLight = new DirectionalLight({
      color: sunColor,
      intensity: 1.8, // Strong for dramatic contrast
      direction: sunDirection,
    });

    // Fill light - subtle bounce light from opposite direction (ground reflection)
    const bounceDirection: [number, number, number] = [
      -sunDirection[0] * 0.5,
      -sunDirection[1] * 0.5,
      0.3, // Slight upward angle (bouncing off ground)
    ];

    const bounceLight = new DirectionalLight({
      color: [200, 190, 180], // Warm neutral (ground reflection)
      intensity: 0.25,
      direction: bounceDirection,
    });

    return new LightingEffect({
      ambientLight: skyLight,
      directionalLight: sunLight,
      directionalLight2: bounceLight,
    });
  }, [sunPosition, sunColor, enabled]);

  // Calculate shadow polygons
  const shadowPolygons = useMemo(() => {
    if (!enabled || buildings.length === 0) return [];
    return calculateShadowPolygons(buildings, sunPosition.azimuth, sunPosition.altitude, sunPosition.hour);
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

    // Determine shadow color based on time of day
    const { hour } = sunPosition;
    const hourFromNoon = Math.abs(hour - 12);
    // Warmer shadow color during golden hour, cooler at midday
    const shadowColor: [number, number, number, number] = hourFromNoon > 4
      ? [40, 30, 50, 70]  // Purple-ish at golden hour
      : [25, 30, 45, 90]; // Blue-ish at midday (stronger)

    // Shadow layer - rendered first (below buildings)
    if (shadowPolygons.length > 0) {
      layers.push(
        new PolygonLayer({
          id: 'building-shadows',
          data: shadowPolygons,
          getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
          getFillColor: shadowColor,
          filled: true,
          stroked: false,
          extruded: false,
          pickable: false,
        })
      );
    }

    // Building layer with enhanced material for realistic sun response
    if (buildings.length > 0) {
      // Base wall color - warm terracotta that responds well to directional lighting
      // The lighting system will make sun-facing sides brighter and shadow sides darker
      const wallColor: [number, number, number] = [215, 165, 135];

      layers.push(
        new GeoJsonLayer({
          id: '3d-buildings',
          data: { type: 'FeatureCollection', features: buildings },
          filled: true,
          extruded: true,
          wireframe: false,
          opacity: 1,
          getElevation: (f: GeoJSON.Feature) => (f.properties?.height as number) || 12,
          getFillColor: wallColor,
          getLineColor: [140, 110, 85, 255], // Darker edge lines
          lineWidthMinPixels: 1,
          // Material settings optimized for directional lighting visibility
          // High diffuse = surfaces respond strongly to light direction
          // Low ambient = shadow sides stay dark
          // This creates strong contrast between sun-facing and shadow-facing sides
          material: {
            ambient: 0.25,  // Low ambient - shadow sides stay dark
            diffuse: 0.85,  // High diffuse - strong response to sun direction
            shininess: 12,  // Slight shininess for roof highlights
            specularColor: [80, 70, 60], // Warm specular
          },
          pickable: false,
        })
      );
    }

    overlayRef.current.setProps({
      layers,
      effects: lightingEffect ? [lightingEffect] : [],
    });
  }, [map, enabled, buildings, shadowPolygons, lightingEffect, sunPosition]);

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
