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
const OSMB_TILE_URL = 'https://data.osmbuildings.org/0.2/59fcc2e8/tile';

// Cache for tile data
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
        wallColor: [60, 50, 70, 230],      // Dark purple-gray
        roofColor: [80, 75, 90, 220],      // Slightly lighter
      };
    case 'dawn':
      return {
        wallColor: [200, 130, 110, 230],   // Warm terracotta with pink
        roofColor: [180, 170, 165, 220],   // Light gray
      };
    case 'morning':
      return {
        wallColor: [215, 135, 105, 230],   // Terracotta/coral
        roofColor: [190, 185, 180, 220],   // Light gray
      };
    case 'noon':
      return {
        wallColor: [220, 140, 110, 230],   // Classic terracotta/coral (like screenshot)
        roofColor: [200, 195, 190, 220],   // Light gray roof
      };
    case 'afternoon':
      return {
        wallColor: [218, 138, 108, 230],   // Terracotta/coral
        roofColor: [195, 190, 185, 220],   // Light gray
      };
    case 'sunset':
      return {
        wallColor: [210, 125, 90, 230],    // Warmer orange terracotta
        roofColor: [200, 180, 160, 220],   // Warm gray
      };
    case 'dusk':
      return {
        wallColor: [140, 100, 110, 230],   // Muted purple-brown
        roofColor: [130, 125, 135, 220],   // Gray-purple
      };
    default:
      return {
        wallColor: [220, 140, 110, 230],   // Default terracotta
        roofColor: [200, 195, 190, 220],   // Default gray roof
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
 * Fetch building tile from OSMBuildings server
 */
const fetchTile = async (z: number, x: number, y: number): Promise<GeoJSON.Feature[]> => {
  const cacheKey = `${z}/${x}/${y}`;

  if (tileCache.has(cacheKey)) {
    return tileCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`${OSMB_TILE_URL}/${z}/${x}/${y}.json`);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const features: GeoJSON.Feature[] = [];

    // OSMBuildings tile format: array of [footprint, height, minHeight, color, id]
    // footprint is array of [lng, lat] pairs
    if (Array.isArray(data)) {
      for (const building of data) {
        if (!Array.isArray(building) || building.length < 2) continue;

        const footprint = building[0];
        const height = building[1] || 12;
        const minHeight = building[2] || 0;

        if (!Array.isArray(footprint) || footprint.length < 4) continue;

        // Convert footprint to GeoJSON coordinates
        const coordinates: [number, number][] = [];
        for (let i = 0; i < footprint.length; i += 2) {
          coordinates.push([footprint[i], footprint[i + 1]]);
        }

        // Close the polygon if needed
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

    // Limit cache size
    if (tileCache.size > 50) {
      const firstKey = tileCache.keys().next().value;
      if (firstKey) tileCache.delete(firstKey);
    }

    tileCache.set(cacheKey, features);
    return features;
  } catch (error) {
    console.warn('Failed to fetch building tile:', error);
    return [];
  }
};

/**
 * Get all tiles needed for current viewport
 */
const getTilesForBounds = async (
  bounds: google.maps.LatLngBounds,
  zoom: number
): Promise<GeoJSON.Feature[]> => {
  // OSMBuildings tiles work best at zoom 15
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
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  // Get current hour for coloring
  const currentHour = useMemo(() => {
    return dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  }, [dateTime]);

  const colors = useMemo(() => getBuildingColors(currentHour), [currentHour]);

  // Load buildings when viewport changes
  const loadBuildings = useCallback(async () => {
    if (!map || !enabled || loadingRef.current) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();

    if (!bounds || !zoom || zoom < 15) {
      setBuildings([]);
      return;
    }

    const boundsKey = `${bounds.getSouthWest().lat().toFixed(4)},${bounds.getSouthWest().lng().toFixed(4)},${zoom}`;

    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const features = await getTilesForBounds(bounds, zoom);
      setBuildings(features);
    } catch (error) {
      console.warn('Failed to load buildings:', error);
    } finally {
      loadingRef.current = false;
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
          getLineColor: [100, 90, 85, 150],  // Subtle outline matching terracotta
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.4,
            diffuse: 0.7,
            shininess: 10,
            specularColor: [60, 50, 45],
          },
          pickable: false,
          _shadows: true,
          updateTriggers: {
            getFillColor: [currentHour],
          },
        })
      : null;

    overlayRef.current.setProps({
      layers: buildingLayer ? [buildingLayer] : [],
    });
  }, [map, enabled, buildings, colors, currentHour]);

  // Setup map listeners
  useEffect(() => {
    if (!map || !enabled) return;

    loadBuildings();

    const idleListener = map.addListener('idle', () => {
      setTimeout(loadBuildings, 200);
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

  if (enabled && isLoading && buildings.length === 0) {
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
