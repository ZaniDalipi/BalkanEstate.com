// Google3DBuildingsLayer Component
// Adds 3D building extrusions with realistic time-based shadows using deck.gl
// Designed for Google Maps integration with shadow simulation

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core';

interface Google3DBuildingsLayerProps {
  map: google.maps.Map | null;
  enabled: boolean;
  dateTime?: Date;
  onBuildingClick?: (info: BuildingInfo) => void;
  highlightedBuilding?: string | number | null;
}

export interface BuildingInfo {
  featureId: string | number;
  lat: number;
  lon: number;
  height?: number;
  levels?: number;
  type?: string;
  name?: string;
}

// Time periods for dynamic theming
type TimePeriod = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk';

// Overpass API for loading building data
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Cache for building data to avoid re-fetching
const buildingCache = new Map<string, GeoJSON.FeatureCollection>();

/**
 * Get the time period based on hour
 */
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
 * Creates realistic lighting effects that change throughout the day
 */
const getBuildingColorsByTime = (hour: number): { wallColor: [number, number, number, number]; roofColor: [number, number, number, number] } => {
  const period = getTimePeriod(hour);

  switch (period) {
    case 'night':
      return {
        wallColor: [30, 40, 65, 230],
        roofColor: [45, 55, 80, 220],
      };
    case 'dawn':
      return {
        wallColor: [180, 140, 130, 230],
        roofColor: [200, 160, 140, 220],
      };
    case 'morning':
      return {
        wallColor: [200, 195, 180, 230],
        roofColor: [180, 175, 165, 220],
      };
    case 'noon':
      return {
        wallColor: [220, 220, 215, 230],
        roofColor: [195, 195, 190, 220],
      };
    case 'afternoon':
      return {
        wallColor: [210, 200, 180, 230],
        roofColor: [190, 180, 165, 220],
      };
    case 'sunset':
      return {
        wallColor: [200, 150, 100, 230],
        roofColor: [220, 160, 90, 220],
      };
    case 'dusk':
      return {
        wallColor: [100, 90, 120, 230],
        roofColor: [120, 100, 130, 220],
      };
    default:
      return {
        wallColor: [200, 200, 200, 230],
        roofColor: [180, 180, 180, 220],
      };
  }
};

/**
 * Calculate shadow color based on sun altitude and time
 */
const getShadowColor = (hour: number): [number, number, number, number] => {
  const period = getTimePeriod(hour);

  switch (period) {
    case 'night':
      return [10, 15, 30, 180];
    case 'dawn':
    case 'dusk':
      return [60, 40, 80, 150];
    case 'sunset':
      return [80, 50, 40, 140];
    default:
      return [40, 45, 60, 120];
  }
};

/**
 * Calculate sun direction vector based on hour
 * Returns [x, y] where direction of shadow is cast
 */
const getSunDirection = (hour: number, latitude: number = 41): [number, number] => {
  // Convert hour to radians (0-24 -> 0-2PI)
  // Sun rises in east (azimuth ~90), peaks at south (azimuth ~180), sets in west (azimuth ~270)
  const hourAngle = ((hour - 12) / 12) * Math.PI;

  // Sun altitude affects shadow length
  const maxAltitude = 90 - Math.abs(latitude - 23.5);
  const altitudeProgress = Math.sin((hour / 24) * Math.PI);
  const altitude = altitudeProgress * maxAltitude;

  // Calculate shadow direction
  const x = Math.cos(hourAngle);
  const y = Math.sin(hourAngle);

  // Shadow length increases as sun gets lower
  const shadowMultiplier = altitude < 10 ? 3 : altitude < 30 ? 2 : 1;

  return [x * shadowMultiplier, y * shadowMultiplier];
};

/**
 * Generate Overpass query for buildings
 */
const generateOverpassQuery = (bounds: google.maps.LatLngBounds): string => {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  return `
    [out:json][timeout:25];
    (
      way["building"](${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()});
      relation["building"]["type"="multipolygon"](${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()});
    );
    out body;
    >;
    out skel qt;
  `;
};

/**
 * Parse Overpass response to GeoJSON
 */
const parseOverpassToGeoJson = (data: any): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];
  const nodes = new Map<number, [number, number]>();

  // First pass: collect all nodes
  for (const element of data.elements) {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lon, element.lat]);
    }
  }

  // Second pass: build features from ways
  for (const element of data.elements) {
    if (element.type === 'way' && element.nodes) {
      const coordinates: [number, number][] = [];

      for (const nodeId of element.nodes) {
        const coord = nodes.get(nodeId);
        if (coord) {
          coordinates.push(coord);
        }
      }

      if (coordinates.length >= 4) {
        // Calculate building height
        let height = 10; // Default height in meters

        if (element.tags) {
          if (element.tags.height) {
            height = parseFloat(element.tags.height) || height;
          } else if (element.tags['building:levels']) {
            height = (parseInt(element.tags['building:levels']) || 3) * 3.5;
          } else if (element.tags.building === 'house') {
            height = 8;
          } else if (element.tags.building === 'apartments' || element.tags.building === 'residential') {
            height = 15;
          } else if (element.tags.building === 'commercial' || element.tags.building === 'office') {
            height = 20;
          } else if (element.tags.building === 'industrial') {
            height = 12;
          }
        }

        features.push({
          type: 'Feature',
          id: element.id,
          properties: {
            height,
            levels: element.tags?.['building:levels'],
            type: element.tags?.building || 'yes',
            name: element.tags?.name,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        });
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};

/**
 * Fetch buildings from Overpass API
 */
const fetchBuildings = async (bounds: google.maps.LatLngBounds): Promise<GeoJSON.FeatureCollection> => {
  const cacheKey = `${bounds.getSouthWest().lat().toFixed(3)},${bounds.getSouthWest().lng().toFixed(3)},${bounds.getNorthEast().lat().toFixed(3)},${bounds.getNorthEast().lng().toFixed(3)}`;

  if (buildingCache.has(cacheKey)) {
    return buildingCache.get(cacheKey)!;
  }

  try {
    const query = generateOverpassQuery(bounds);
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch buildings');
    }

    const data = await response.json();
    const geoJson = parseOverpassToGeoJson(data);

    // Cache the result
    buildingCache.set(cacheKey, geoJson);

    // Limit cache size
    if (buildingCache.size > 20) {
      const firstKey = buildingCache.keys().next().value;
      buildingCache.delete(firstKey);
    }

    return geoJson;
  } catch (error) {
    console.warn('Failed to fetch buildings from Overpass:', error);
    return { type: 'FeatureCollection', features: [] };
  }
};

/**
 * Google3DBuildingsLayer Component
 *
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Features:
 * - Loads building footprints from OpenStreetMap via Overpass API
 * - Time-based coloring for realistic lighting
 * - Shadow simulation based on sun position
 * - Smooth integration with Google Maps
 */
const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
  onBuildingClick,
  highlightedBuilding,
}) => {
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const [buildingData, setBuildingData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<string | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current hour from dateTime
  const currentHour = useMemo(() => {
    return dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  }, [dateTime]);

  // Get colors based on time
  const colors = useMemo(() => getBuildingColorsByTime(currentHour), [currentHour]);
  const shadowColor = useMemo(() => getShadowColor(currentHour), [currentHour]);
  const sunDirection = useMemo(() => getSunDirection(currentHour), [currentHour]);

  // Fetch buildings when map bounds change
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    if (!bounds || !zoom || zoom < 14) {
      // Only load buildings at zoom level 14+
      setBuildingData(null);
      return;
    }

    const boundsKey = `${bounds.getSouthWest().lat().toFixed(3)},${bounds.getSouthWest().lng().toFixed(3)},${bounds.getNorthEast().lat().toFixed(3)},${bounds.getNorthEast().lng().toFixed(3)}`;

    if (boundsKey === lastBoundsRef.current) {
      return;
    }

    lastBoundsRef.current = boundsKey;
    setIsLoading(true);

    try {
      const data = await fetchBuildings(bounds);
      setBuildingData(data);
    } catch (error) {
      console.warn('Error loading buildings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [map, enabled]);

  // Create and update deck.gl overlay
  useEffect(() => {
    if (!map || !enabled) {
      // Cleanup overlay when disabled
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    // Create overlay if it doesn't exist
    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({});
      overlayRef.current.setMap(map);
    }

    // Create lighting effect based on sun position
    // Sun direction affects the directional light direction
    const sunAltitude = Math.sin((currentHour / 24) * Math.PI);
    const isNight = currentHour < 6 || currentHour > 20;

    const ambientLight = new AmbientLight({
      color: isNight ? [80, 80, 120] : [255, 255, 255],
      intensity: isNight ? 0.3 : 0.4,
    });

    const directionalLight = new DirectionalLight({
      color: isNight ? [100, 120, 180] : [255, 250, 240],
      intensity: isNight ? 0.2 : 0.8 * sunAltitude + 0.2,
      direction: [-sunDirection[0], -sunDirection[1], -1],
      _shadow: true,
    });

    const lightingEffect = new LightingEffect({ ambientLight, directionalLight });

    // Create building layer
    const buildingLayer = buildingData?.features.length ? new GeoJsonLayer({
      id: '3d-buildings',
      data: buildingData,
      filled: true,
      extruded: true,
      wireframe: false,
      getElevation: (f: GeoJSON.Feature) => f.properties?.height || 10,
      getFillColor: (f: GeoJSON.Feature) => {
        // Highlighted building gets special color
        if (highlightedBuilding && f.id === highlightedBuilding) {
          return [2, 82, 205, 240] as [number, number, number, number];
        }
        return colors.wallColor;
      },
      getLineColor: [60, 60, 60, 100] as [number, number, number, number],
      lineWidthMinPixels: 1,
      material: {
        ambient: 0.4,
        diffuse: 0.6,
        shininess: 32,
        specularColor: [60, 64, 70],
      },
      pickable: true,
      onClick: (info: any) => {
        if (info.object && onBuildingClick) {
          const coordinates = info.coordinate;
          onBuildingClick({
            featureId: info.object.id,
            lat: coordinates[1],
            lon: coordinates[0],
            height: info.object.properties?.height,
            levels: info.object.properties?.levels,
            type: info.object.properties?.type,
            name: info.object.properties?.name,
          });
        }
      },
      // Shadow simulation parameters
      parameters: {
        depthTest: true,
        depthMask: true,
      },
      // Update on time change
      updateTriggers: {
        getFillColor: [colors.wallColor, highlightedBuilding],
      },
    }) : null;

    // Shadow layer - create offset shadow geometries
    // Note: For simplicity, we skip shadow layer as deck.gl handles basic shadows via lighting
    // The 3D extrusions naturally create depth perception

    // Set layers on overlay with lighting effects
    const layers = [buildingLayer].filter(Boolean);
    overlayRef.current.setProps({
      layers,
      effects: [lightingEffect],
    });

    return () => {
      // Cleanup will happen on next effect run or unmount
    };
  }, [map, enabled, buildingData, colors, shadowColor, sunDirection, currentHour, highlightedBuilding, onBuildingClick]);

  // Setup map listeners for loading buildings
  useEffect(() => {
    if (!map || !enabled) return;

    // Initial load
    loadBuildings();

    // Load buildings when map idle (finished panning/zooming)
    const idleListener = map.addListener('idle', () => {
      // Debounce to avoid too many requests
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(loadBuildings, 500);
    });

    return () => {
      google.maps.event.removeListener(idleListener);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [map, enabled, loadBuildings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, []);

  // Loading indicator
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
export { getTimePeriod, getBuildingColorsByTime };
