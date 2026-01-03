// LandmarksLayerMapbox Component
// Shows famous landmarks, tourist attractions, and POIs on the Mapbox map

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMap, Marker, Popup } from 'react-map-gl';

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

interface LandmarksLayerMapboxProps {
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

// Landmark type colors
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
  if (tags.building === 'church' || (tags.amenity === 'place_of_worship' && tags.religion === 'christian')) return 'church';
  if (tags.building === 'mosque' || (tags.amenity === 'place_of_worship' && tags.religion === 'muslim')) return 'mosque';
  if (tags.tourism === 'attraction') return 'attraction';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.historic) return 'historic';
  if (tags.leisure === 'stadium') return 'stadium';
  if (tags.amenity === 'university' || tags.building === 'university') return 'university';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.leisure === 'park' || tags.landuse === 'park') return 'park';
  return 'attraction';
};

// Global cache
const landmarksCache = new Map<string, { landmarks: Landmark[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;
const MIN_REQUEST_INTERVAL = 10000;
const MIN_ZOOM_FOR_FETCH = 14;
const DEBOUNCE_DELAY = 3000;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

let lastRequestTime = 0;
let requestInFlight = false;
let currentEndpointIndex = 0;
let consecutiveFailures = 0;

/**
 * LandmarksLayerMapbox Component
 */
const LandmarksLayerMapbox: React.FC<LandmarksLayerMapboxProps> = ({
  enabled,
  isNightMode,
  onLandmarkClick,
}) => {
  const { current: mapRef } = useMap();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsKeyRef = useRef<string | null>(null);

  // Build Overpass API query
  const buildOverpassQuery = useCallback((bounds: { south: number; west: number; north: number; east: number }): string => {
    const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

    return `
      [out:json][timeout:25];
      (
        node["tourism"~"museum|attraction"]["name"](${bbox});
        node["historic"~"monument|castle"]["name"](${bbox});
        node["leisure"="stadium"]["name"](${bbox});
        node["amenity"="university"]["name"](${bbox});
      );
      out 20;
    `.trim();
  }, []);

  // Fetch landmarks
  const fetchLandmarks = useCallback(async (bounds: { south: number; west: number; north: number; east: number }) => {
    const boundsKey = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

    if (boundsKey === lastBoundsKeyRef.current) return;

    const cached = landmarksCache.get(boundsKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setLandmarks(cached.landmarks);
      lastBoundsKeyRef.current = boundsKey;
      return;
    }

    const now = Date.now();
    if (requestInFlight || now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      return;
    }

    if (consecutiveFailures >= 3) {
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
      const timeoutId = setTimeout(() => controller.abort(), 20000);

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
        currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
        lastRequestTime = now + MIN_REQUEST_INTERVAL * 3;
        throw new Error(`Overpass API request failed: ${response.status}`);
      }

      consecutiveFailures = 0;
      const data = await response.json();
      const elements = data.elements || [];

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

      const uniqueLandmarks = parsedLandmarks.filter(
        (landmark, index, self) =>
          index === self.findIndex((l) => l.name === landmark.name)
      );

      const limitedLandmarks = uniqueLandmarks.slice(0, 30);

      landmarksCache.set(boundsKey, {
        landmarks: limitedLandmarks,
        timestamp: Date.now(),
      });

      setLandmarks(limitedLandmarks);
      lastBoundsKeyRef.current = boundsKey;
    } catch (error: any) {
      consecutiveFailures++;
      currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
      console.warn('Failed to fetch landmarks:', error?.message || error);
    } finally {
      requestInFlight = false;
    }
  }, [buildOverpassQuery]);

  // Fetch landmarks on map move
  useEffect(() => {
    if (!enabled || !mapRef) return;

    const handleMoveEnd = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      const map = mapRef.getMap();
      const zoom = map.getZoom();

      if (zoom < MIN_ZOOM_FOR_FETCH) {
        setLandmarks([]);
        return;
      }

      fetchTimeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        fetchLandmarks({
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        });
      }, DEBOUNCE_DELAY);
    };

    const map = mapRef.getMap();
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
  }, [enabled, mapRef, fetchLandmarks]);

  // Clear landmarks when disabled
  useEffect(() => {
    if (!enabled) {
      setLandmarks([]);
      setSelectedLandmark(null);
    }
  }, [enabled]);

  if (!enabled || landmarks.length === 0) {
    return null;
  }

  return (
    <>
      {landmarks.map((landmark) => {
        const colors = LANDMARK_COLORS[landmark.type];
        const nightModeStyle = isNightMode
          ? { boxShadow: `0 0 12px ${colors.glow}, 0 0 24px ${colors.glow}`, border: `2px solid ${colors.bg}` }
          : { boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: `2px solid ${colors.bg}` };

        return (
          <Marker
            key={landmark.id}
            longitude={landmark.lon}
            latitude={landmark.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedLandmark(landmark);
              onLandmarkClick?.(landmark);
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isNightMode ? 'rgba(15, 23, 42, 0.9)' : 'white',
                borderRadius: '50%',
                fontSize: 18,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                ...nightModeStyle,
              }}
              className="hover:scale-110"
            >
              {LANDMARK_ICONS[landmark.type]}
            </div>
          </Marker>
        );
      })}

      {selectedLandmark && (
        <Popup
          longitude={selectedLandmark.lon}
          latitude={selectedLandmark.lat}
          anchor="bottom"
          onClose={() => setSelectedLandmark(null)}
          closeButton={true}
          offset={20}
        >
          <div style={{ minWidth: 180, color: isNightMode ? '#e2e8f0' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{LANDMARK_ICONS[selectedLandmark.type]}</span>
              <strong style={{ fontSize: 14 }}>{selectedLandmark.name}</strong>
            </div>
            {selectedLandmark.tags.description && (
              <p style={{ fontSize: 12, margin: 0, color: isNightMode ? '#94a3b8' : '#666' }}>
                {selectedLandmark.tags.description}
              </p>
            )}
            {selectedLandmark.tags.wikipedia && (
              <a
                href={`https://wikipedia.org/wiki/${selectedLandmark.tags.wikipedia}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#0ea5e9' }}
              >
                Wikipedia →
              </a>
            )}
          </div>
        </Popup>
      )}
    </>
  );
};

export default LandmarksLayerMapbox;
export type { LandmarkType, Landmark };
export { LANDMARK_ICONS, LANDMARK_COLORS };
