// LandmarksLayer Component
// Shows famous landmarks, tourist attractions, and POIs on the map
// Uses Overpass API to fetch data from OpenStreetMap

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface Landmark {
  id: number;
  name: string;
  type: LandmarkType;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

type LandmarkType =
  | 'monument'
  | 'museum'
  | 'castle'
  | 'church'
  | 'mosque'
  | 'attraction'
  | 'viewpoint'
  | 'historic'
  | 'stadium'
  | 'university'
  | 'hospital'
  | 'park';

interface LandmarksLayerProps {
  enabled: boolean;
  isNightMode: boolean;
  onLandmarkClick?: (landmark: Landmark) => void;
}

// Landmark type to icon emoji mapping
const LANDMARK_ICONS: Record<LandmarkType, string> = {
  monument: '🏛️',
  museum: '🏛️',
  castle: '🏰',
  church: '⛪',
  mosque: '🕌',
  attraction: '⭐',
  viewpoint: '🔭',
  historic: '📜',
  stadium: '🏟️',
  university: '🎓',
  hospital: '🏥',
  park: '🌳',
};

// Landmark type colors for night mode
const LANDMARK_COLORS: Record<LandmarkType, { bg: string; glow: string }> = {
  monument: { bg: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)' },
  museum: { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)' },
  castle: { bg: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
  church: { bg: '#60a5fa', glow: 'rgba(96, 165, 250, 0.6)' },
  mosque: { bg: '#34d399', glow: 'rgba(52, 211, 153, 0.6)' },
  attraction: { bg: '#f472b6', glow: 'rgba(244, 114, 182, 0.6)' },
  viewpoint: { bg: '#22d3ee', glow: 'rgba(34, 211, 238, 0.6)' },
  historic: { bg: '#fcd34d', glow: 'rgba(252, 211, 77, 0.6)' },
  stadium: { bg: '#4ade80', glow: 'rgba(74, 222, 128, 0.6)' },
  university: { bg: '#818cf8', glow: 'rgba(129, 140, 248, 0.6)' },
  hospital: { bg: '#f87171', glow: 'rgba(248, 113, 113, 0.6)' },
  park: { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.6)' },
};

// Determine landmark type from OSM tags
const getLandmarkType = (tags: Record<string, string>): LandmarkType => {
  if (tags.historic === 'monument' || tags.historic === 'memorial') return 'monument';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.historic === 'castle' || tags.historic === 'fort') return 'castle';
  if (tags.building === 'church' || tags.amenity === 'place_of_worship' && tags.religion === 'christian') return 'church';
  if (tags.building === 'mosque' || tags.amenity === 'place_of_worship' && tags.religion === 'muslim') return 'mosque';
  if (tags.tourism === 'attraction') return 'attraction';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.historic) return 'historic';
  if (tags.leisure === 'stadium') return 'stadium';
  if (tags.amenity === 'university' || tags.building === 'university') return 'university';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.leisure === 'park' || tags.landuse === 'park') return 'park';
  return 'attraction';
};

// Create custom marker icon for landmark
const createLandmarkIcon = (type: LandmarkType, isNightMode: boolean): L.DivIcon => {
  const emoji = LANDMARK_ICONS[type];
  const colors = LANDMARK_COLORS[type];

  const nightModeStyle = isNightMode
    ? `box-shadow: 0 0 12px ${colors.glow}, 0 0 24px ${colors.glow}; border: 2px solid ${colors.bg};`
    : '';

  return L.divIcon({
    className: 'landmark-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${isNightMode ? 'rgba(15, 23, 42, 0.9)' : 'white'};
        border-radius: 50%;
        font-size: 18px;
        ${nightModeStyle}
        ${!isNightMode ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid ' + colors.bg + ';' : ''}
        transition: transform 0.2s ease;
        cursor: pointer;
      " class="landmark-icon-inner">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

/**
 * LandmarksLayer Component
 *
 * Fetches and displays famous landmarks from OpenStreetMap:
 * - Tourist attractions
 * - Museums and historic sites
 * - Religious buildings
 * - Viewpoints and parks
 * - Universities and hospitals
 *
 * Great for real estate - shows nearby amenities and attractions
 */
// Global cache to persist across component remounts
const landmarksCache = new Map<string, { landmarks: Landmark[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache
const MIN_REQUEST_INTERVAL = 10000; // Minimum 10 seconds between API requests
const MIN_ZOOM_FOR_FETCH = 12; // Show POIs at zoom 12+
const DEBOUNCE_DELAY = 2000; // 2 second debounce
const MAX_CACHE_SIZE = 15; // Maximum cache entries

// Alternative Overpass API endpoints for fallback
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

let lastRequestTime = 0;
let requestInFlight = false;
let currentEndpointIndex = 0;
let consecutiveFailures = 0;

// Clean up old cache entries periodically
const cleanupCache = () => {
  const now = Date.now();
  const entries = Array.from(landmarksCache.entries());

  // Remove expired entries
  entries.forEach(([key, value]) => {
    if (now - value.timestamp > CACHE_TTL) {
      landmarksCache.delete(key);
    }
  });

  // If still too many entries, remove oldest
  if (landmarksCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = entries
      .filter(([key]) => landmarksCache.has(key))
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = sortedEntries.slice(0, sortedEntries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => landmarksCache.delete(key));
  }
};

// Empty array constant to avoid creating new references
const EMPTY_LANDMARKS: Landmark[] = [];

const LandmarksLayer: React.FC<LandmarksLayerProps> = ({
  enabled,
  isNightMode,
  onLandmarkClick,
}) => {
  const map = useMap();
  const [landmarks, setLandmarks] = useState<Landmark[]>(EMPTY_LANDMARKS);
  const markersRef = useRef<L.Marker[]>([]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsKeyRef = useRef<string | null>(null);
  const onLandmarkClickRef = useRef(onLandmarkClick);

  // Keep callback ref updated without causing re-renders
  useEffect(() => {
    onLandmarkClickRef.current = onLandmarkClick;
  });

  // Build Overpass API query for landmarks
  const buildOverpassQuery = useCallback((bounds: L.LatLngBounds): string => {
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const bbox = `${south},${west},${north},${east}`;

    // Query for various POI types
    return `
      [out:json][timeout:25];
      (
        node["tourism"~"museum|attraction|viewpoint"]["name"](${bbox});
        node["historic"~"monument|castle|memorial"]["name"](${bbox});
        node["amenity"~"place_of_worship|university|hospital"]["name"](${bbox});
        node["leisure"~"stadium|park"]["name"](${bbox});
        node["building"~"church|mosque|cathedral"]["name"](${bbox});
      );
      out 40;
    `.trim();
  }, []);

  // Fetch landmarks from Overpass API with caching, rate limiting, and endpoint rotation
  const fetchLandmarks = useCallback(async (bounds: L.LatLngBounds) => {
    const boundsKey = bounds.toBBoxString();

    // Skip if bounds haven't changed significantly
    if (boundsKey === lastBoundsKeyRef.current) return;

    // Check cache first
    const cached = landmarksCache.get(boundsKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setLandmarks(cached.landmarks);
      lastBoundsKeyRef.current = boundsKey;
      return;
    }

    // Rate limiting: check if we can make a request
    const now = Date.now();
    if (requestInFlight || now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      return;
    }

    // Stop trying if too many consecutive failures
    if (consecutiveFailures >= 3) {
      // Reset after 5 minutes
      if (now - lastRequestTime > 5 * 60 * 1000) {
        consecutiveFailures = 0;
      } else {
        return;
      }
    }

    requestInFlight = true;
    lastRequestTime = now;

    try {
      const query = buildOverpassQuery(bounds);
      const endpoint = OVERPASS_ENDPOINTS[currentEndpointIndex];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s client timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        consecutiveFailures++;
        // Rotate to next endpoint on failure
        currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
        // Wait longer before next request
        lastRequestTime = now + MIN_REQUEST_INTERVAL * 3;
        throw new Error(`Overpass API request failed: ${response.status}`);
      }

      // Success - reset failure counter
      consecutiveFailures = 0;
      const data = await response.json();
      const elements = data.elements || [];

      // Parse landmarks from OSM data
      const parsedLandmarks: Landmark[] = elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => ({
          id: el.id,
          name: el.tags.name,
          type: getLandmarkType(el.tags),
          lat: el.lat || el.center?.lat,
          lon: el.lon || el.center?.lon,
          tags: el.tags,
        }))
        .filter((l: Landmark) => l.lat && l.lon);

      // Remove duplicates by name (keep first occurrence)
      const uniqueLandmarks = parsedLandmarks.filter(
        (landmark, index, self) =>
          index === self.findIndex((l) => l.name === landmark.name)
      );

      const limitedLandmarks = uniqueLandmarks.slice(0, 40); // Limit to 40 landmarks

      // Cache the result and cleanup old entries
      landmarksCache.set(boundsKey, {
        landmarks: limitedLandmarks,
        timestamp: Date.now(),
      });
      cleanupCache();

      setLandmarks(limitedLandmarks);
      lastBoundsKeyRef.current = boundsKey;
    } catch (error: any) {
      consecutiveFailures++;
      // Rotate to next endpoint on any failure
      currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;

      if (error?.name === 'AbortError') {
        console.warn('Landmarks fetch timed out, will try different endpoint');
      } else {
        console.warn('Failed to fetch landmarks:', error?.message || error);
      }
    } finally {
      requestInFlight = false;
    }
  }, [buildOverpassQuery]);

  // Clear landmarks safely without triggering infinite loops
  const clearLandmarks = useCallback(() => {
    setLandmarks(prev => prev.length === 0 ? prev : EMPTY_LANDMARKS);
  }, []);

  // Fetch landmarks on map move (debounced with longer delay)
  useEffect(() => {
    if (!enabled) return;

    const handleMoveEnd = () => {
      // Clear previous timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Only fetch at zoom level 14+ to reduce API calls
      if (map.getZoom() < MIN_ZOOM_FOR_FETCH) {
        clearLandmarks();
        return;
      }

      // Debounce fetch with longer delay to reduce API calls
      fetchTimeoutRef.current = setTimeout(() => {
        fetchLandmarks(map.getBounds());
      }, DEBOUNCE_DELAY);
    };

    // Initial fetch
    handleMoveEnd();

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [enabled, map, fetchLandmarks, clearLandmarks]);

  // Create/update markers
  useEffect(() => {
    // Remove existing markers
    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    if (!enabled || landmarks.length === 0) return;

    // Create new markers
    landmarks.forEach((landmark) => {
      const icon = createLandmarkIcon(landmark.type, isNightMode);

      const marker = L.marker([landmark.lat, landmark.lon], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="
            min-width: 180px;
            ${isNightMode ? 'color: #e2e8f0;' : ''}
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
            ">
              <span style="font-size: 20px;">${LANDMARK_ICONS[landmark.type]}</span>
              <strong style="font-size: 14px;">${landmark.name}</strong>
            </div>
            ${landmark.tags.description ? `<p style="font-size: 12px; margin: 0; color: ${isNightMode ? '#94a3b8' : '#666'};">${landmark.tags.description}</p>` : ''}
            ${landmark.tags.wikipedia ? `<a href="https://wikipedia.org/wiki/${landmark.tags.wikipedia}" target="_blank" style="font-size: 11px; color: #0ea5e9;">Wikipedia →</a>` : ''}
          </div>
        `, {
          className: isNightMode ? 'night-mode-popup' : '',
        });

      // Use ref for callback to avoid re-renders when callback changes
      marker.on('click', () => {
        if (onLandmarkClickRef.current) {
          onLandmarkClickRef.current(landmark);
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => {
        map.removeLayer(marker);
      });
      markersRef.current = [];
    };
  }, [landmarks, enabled, isNightMode, map]);

  // Cleanup on disable
  useEffect(() => {
    if (!enabled) {
      markersRef.current.forEach((marker) => {
        map.removeLayer(marker);
      });
      markersRef.current = [];
      clearLandmarks();
    }
  }, [enabled, map, clearLandmarks]);

  return null;
};

export default LandmarksLayer;

// Export landmark types for use in legend
export type { LandmarkType, Landmark };
export { LANDMARK_ICONS, LANDMARK_COLORS };
