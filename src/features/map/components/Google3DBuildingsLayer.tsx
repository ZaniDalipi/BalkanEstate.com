/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Features realistic sun-based lighting that changes with time
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

// Cache for building data
const buildingCache = new Map<string, GeoJSON.FeatureCollection>();

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Calculate sun direction based on time of day
 * Returns a normalized direction vector for the directional light
 */
const calculateSunDirection = (hour: number): [number, number, number] => {
  // Solar hour angle (sun moves from east to west)
  const hourAngle = ((hour - 12) / 12) * Math.PI;

  // Simplified sun altitude (higher at noon, lower at dawn/dusk)
  const altitude = Math.sin((hour / 24) * Math.PI) * 0.8;

  // Calculate direction vector (light coming FROM the sun, so we negate)
  const x = -Math.sin(hourAngle);
  const y = -0.5; // Slightly from south
  const z = -Math.max(0.2, altitude); // Always some downward component

  // Normalize
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
};

/**
 * Get lighting configuration based on time of day
 */
const getLightingConfig = (hour: number): {
  wallColor: [number, number, number, number];
  ambientIntensity: number;
  sunIntensity: number;
  sunColor: [number, number, number];
} => {
  // Night (22-5)
  if (hour >= 22 || hour < 5) {
    return {
      wallColor: [50, 60, 90, 240],
      ambientIntensity: 0.4,
      sunIntensity: 0.1,
      sunColor: [100, 120, 180],
    };
  }
  // Dawn (5-7)
  if (hour >= 5 && hour < 7) {
    return {
      wallColor: [210, 180, 160, 235],
      ambientIntensity: 0.5,
      sunIntensity: 0.6,
      sunColor: [255, 200, 150],
    };
  }
  // Morning (7-10)
  if (hour >= 7 && hour < 10) {
    return {
      wallColor: [220, 215, 205, 235],
      ambientIntensity: 0.5,
      sunIntensity: 0.7,
      sunColor: [255, 245, 230],
    };
  }
  // Midday (10-15)
  if (hour >= 10 && hour < 15) {
    return {
      wallColor: [230, 230, 225, 235],
      ambientIntensity: 0.5,
      sunIntensity: 0.8,
      sunColor: [255, 255, 250],
    };
  }
  // Afternoon (15-18)
  if (hour >= 15 && hour < 18) {
    return {
      wallColor: [225, 215, 195, 235],
      ambientIntensity: 0.5,
      sunIntensity: 0.7,
      sunColor: [255, 240, 210],
    };
  }
  // Sunset (18-20)
  if (hour >= 18 && hour < 20) {
    return {
      wallColor: [220, 170, 130, 235],
      ambientIntensity: 0.45,
      sunIntensity: 0.6,
      sunColor: [255, 180, 100],
    };
  }
  // Dusk (20-22)
  return {
    wallColor: [100, 100, 130, 235],
    ambientIntensity: 0.4,
    sunIntensity: 0.3,
    sunColor: [200, 180, 200],
  };
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

  for (const element of data.elements) {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lon, element.lat]);
    }
  }

  for (const element of data.elements) {
    if (element.type === 'way' && element.nodes) {
      const coordinates: [number, number][] = [];

      for (const nodeId of element.nodes) {
        const coord = nodes.get(nodeId);
        if (coord) coordinates.push(coord);
      }

      if (coordinates.length >= 4) {
        let height = 12;

        if (element.tags) {
          if (element.tags.height) {
            height = parseFloat(element.tags.height) || height;
          } else if (element.tags['building:levels']) {
            height = (parseInt(element.tags['building:levels']) || 3) * 3.5;
          } else {
            const type = element.tags.building;
            if (type === 'house' || type === 'detached') height = 9;
            else if (type === 'apartments' || type === 'residential') height = 20;
            else if (type === 'commercial' || type === 'office') height = 28;
            else if (type === 'industrial' || type === 'warehouse') height = 12;
            else if (type === 'church' || type === 'cathedral') height = 35;
            else if (type === 'retail') height = 10;
          }
        }

        features.push({
          type: 'Feature',
          id: element.id,
          properties: { height, type: element.tags?.building || 'yes' },
          geometry: { type: 'Polygon', coordinates: [coordinates] },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) throw new Error('Overpass API error');

    const data = await response.json();
    const geoJson = parseOverpassToGeoJson(data);

    buildingCache.set(cacheKey, geoJson);
    if (buildingCache.size > 20) {
      const firstKey = buildingCache.keys().next().value;
      if (firstKey) buildingCache.delete(firstKey);
    }

    return geoJson;
  } catch (error) {
    console.warn('Failed to fetch buildings:', error);
    return { type: 'FeatureCollection', features: [] };
  }
};

const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
}) => {
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const [buildingData, setBuildingData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<string | null>(null);

  // Calculate time-based values
  const currentHour = useMemo(() => {
    return dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  }, [dateTime]);

  const sunDirection = useMemo(() => calculateSunDirection(currentHour), [currentHour]);
  const lightingConfig = useMemo(() => getLightingConfig(currentHour), [currentHour]);

  // Load buildings when map bounds change
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    if (!bounds || !zoom || zoom < 15) {
      setBuildingData(null);
      return;
    }

    const boundsKey = `${bounds.getSouthWest().lat().toFixed(3)},${bounds.getSouthWest().lng().toFixed(3)}`;

    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    setIsLoading(true);
    try {
      const data = await fetchBuildings(bounds);
      setBuildingData(data);
    } finally {
      setIsLoading(false);
    }
  }, [map, enabled]);

  // Create/update deck.gl overlay with lighting effects
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

    // Create sun-based lighting effect
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: lightingConfig.ambientIntensity,
    });

    const sunLight = new DirectionalLight({
      color: lightingConfig.sunColor,
      intensity: lightingConfig.sunIntensity,
      direction: sunDirection,
    });

    const lightingEffect = new LightingEffect({ ambientLight, sunLight });

    const buildingLayer = buildingData?.features.length
      ? new GeoJsonLayer({
          id: '3d-buildings',
          data: buildingData,
          filled: true,
          extruded: true,
          wireframe: false,
          opacity: 0.95,
          getElevation: (f: GeoJSON.Feature) => (f.properties?.height as number) || 12,
          getFillColor: lightingConfig.wallColor,
          getLineColor: [80, 80, 90, 120],
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.3,
            diffuse: 0.7,
            shininess: 20,
            specularColor: [50, 50, 60],
          },
          pickable: false,
          updateTriggers: {
            getFillColor: [currentHour],
          },
        })
      : null;

    overlayRef.current.setProps({
      layers: buildingLayer ? [buildingLayer] : [],
      effects: [lightingEffect],
    });
  }, [map, enabled, buildingData, lightingConfig, sunDirection, currentHour]);

  // Setup map listeners
  useEffect(() => {
    if (!map || !enabled) return;

    loadBuildings();

    const idleListener = map.addListener('idle', () => {
      setTimeout(loadBuildings, 300);
    });

    return () => {
      google.maps.event.removeListener(idleListener);
    };
  }, [map, enabled, loadBuildings]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
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
