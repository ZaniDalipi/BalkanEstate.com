/**
 * Google3DBuildingsLayer Component
 * Renders 3D building extrusions on Google Maps using deck.gl
 * Loads building data from OpenStreetMap via Overpass API
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer } from '@deck.gl/layers';

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
 * Get building color based on time of day
 */
const getBuildingColor = (hour: number): [number, number, number, number] => {
  if (hour >= 6 && hour < 8) return [200, 160, 140, 220]; // Dawn - warm
  if (hour >= 8 && hour < 17) return [200, 200, 195, 220]; // Day - neutral
  if (hour >= 17 && hour < 20) return [210, 170, 130, 220]; // Sunset - orange
  if (hour >= 20 || hour < 6) return [60, 70, 100, 220]; // Night - blue-ish
  return [200, 200, 200, 220];
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

  // Collect all nodes
  for (const element of data.elements) {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lon, element.lat]);
    }
  }

  // Build features from ways
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
        let height = 12; // Default height

        if (element.tags) {
          if (element.tags.height) {
            height = parseFloat(element.tags.height) || height;
          } else if (element.tags['building:levels']) {
            height = (parseInt(element.tags['building:levels']) || 3) * 3.5;
          } else {
            // Estimate based on building type
            const type = element.tags.building;
            if (type === 'house' || type === 'detached') height = 8;
            else if (type === 'apartments' || type === 'residential') height = 18;
            else if (type === 'commercial' || type === 'office') height = 25;
            else if (type === 'industrial' || type === 'warehouse') height = 10;
            else if (type === 'church' || type === 'cathedral') height = 30;
          }
        }

        features.push({
          type: 'Feature',
          id: element.id,
          properties: {
            height,
            type: element.tags?.building || 'yes',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
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

    // Cache the result
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

  // Current hour for lighting
  const currentHour = dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  const buildingColor = getBuildingColor(currentHour);

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

    const buildingLayer = buildingData?.features.length
      ? new GeoJsonLayer({
          id: '3d-buildings',
          data: buildingData,
          filled: true,
          extruded: true,
          wireframe: false,
          getElevation: (f: GeoJSON.Feature) => (f.properties?.height as number) || 12,
          getFillColor: buildingColor,
          material: {
            ambient: 0.35,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [60, 64, 70],
          },
          pickable: false,
        })
      : null;

    overlayRef.current.setProps({
      layers: buildingLayer ? [buildingLayer] : [],
    });
  }, [map, enabled, buildingData, buildingColor]);

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
