// Google3DBuildingsLayer Component
// Adds 3D building extrusions with realistic time-based shadows using OSMBuildings
// Designed for Google Maps integration with shadow simulation

import { useEffect, useRef, useCallback, useState } from 'react';

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

// Declare OSMBuildings on window
declare global {
  interface Window {
    OSMBuildings: any;
  }
}

// OSM Buildings data sources - primary and fallbacks
const OSM_BUILDINGS_DATA_SOURCES = [
  'https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json',
  'https://{s}.data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json',
];

// CDN source for the OSM Buildings standalone library (works with any map including Google Maps)
const OSM_BUILDINGS_CDN = 'https://cdn.osmbuildings.org/4.1.2/OSMBuildings.js';

// Time periods for dynamic theming
type TimePeriod = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk';

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
 */
const getBuildingColorsByTime = (hour: number): { wallColor: string; roofColor: string } => {
  const period = getTimePeriod(hour);

  switch (period) {
    case 'night':
      return {
        wallColor: 'rgba(30, 40, 65, 0.92)',
        roofColor: 'rgba(45, 55, 80, 0.88)',
      };
    case 'dawn':
      return {
        wallColor: 'rgba(180, 140, 130, 0.9)',
        roofColor: 'rgba(200, 160, 140, 0.88)',
      };
    case 'morning':
      return {
        wallColor: 'rgba(200, 195, 180, 0.9)',
        roofColor: 'rgba(180, 175, 165, 0.88)',
      };
    case 'noon':
      return {
        wallColor: 'rgba(220, 220, 215, 0.9)',
        roofColor: 'rgba(195, 195, 190, 0.88)',
      };
    case 'afternoon':
      return {
        wallColor: 'rgba(210, 200, 180, 0.9)',
        roofColor: 'rgba(190, 180, 165, 0.88)',
      };
    case 'sunset':
      return {
        wallColor: 'rgba(200, 150, 100, 0.9)',
        roofColor: 'rgba(220, 160, 90, 0.88)',
      };
    case 'dusk':
      return {
        wallColor: 'rgba(100, 90, 120, 0.9)',
        roofColor: 'rgba(120, 100, 130, 0.88)',
      };
    default:
      return {
        wallColor: 'rgba(200, 200, 200, 0.9)',
        roofColor: 'rgba(180, 180, 180, 0.88)',
      };
  }
};

/**
 * Google3DBuildingsLayer Component
 *
 * Renders 3D building extrusions on Google Maps using OSMBuildings standalone.
 * Features:
 * - 3D building extrusions from OpenStreetMap data
 * - Time-based shadow projection with realistic sun position
 * - Dynamic theming based on time of day
 * - Building click interaction
 * - Smooth integration with Google Maps
 */
const Google3DBuildingsLayer: React.FC<Google3DBuildingsLayerProps> = ({
  map,
  enabled,
  dateTime,
  onBuildingClick,
  highlightedBuilding,
}) => {
  const osmBuildingsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);
  const lastHourRef = useRef<number>(-1);
  const dataSourceIndexRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get current hour from dateTime
  const getCurrentHour = useCallback(() => {
    return dateTime ? dateTime.getHours() + dateTime.getMinutes() / 60 : new Date().getHours();
  }, [dateTime]);

  // Initialize OSMBuildings
  const initBuildings = useCallback(() => {
    if (!window.OSMBuildings || !map || osmBuildingsRef.current) return;

    try {
      const center = map.getCenter();
      const zoom = map.getZoom();

      if (!center || !zoom) return;

      // Create container for OSMBuildings if not exists
      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
        containerRef.current.id = 'osm-buildings-container';
        containerRef.current.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        `;

        // Find the Google Maps container and append
        const mapDiv = map.getDiv();
        const firstChild = mapDiv.querySelector('[aria-label]')?.parentElement;
        if (firstChild) {
          firstChild.appendChild(containerRef.current);
        } else {
          mapDiv.appendChild(containerRef.current);
        }
      }

      // Create OSMBuildings instance
      const osmb = new window.OSMBuildings({
        container: 'osm-buildings-container',
        position: { latitude: center.lat(), longitude: center.lng() },
        zoom: zoom,
        minZoom: 14,
        maxZoom: 20,
        tilt: 45,
        rotation: 0,
        fastMode: false,
        backgroundColor: 'transparent',
        highlightColor: 'rgba(2, 82, 205, 0.9)',
      });

      // Load building data
      const dataSource = OSM_BUILDINGS_DATA_SOURCES[dataSourceIndexRef.current];
      osmb.addGeoJSONTiles(dataSource);

      // Set initial style based on time
      const hour = getCurrentHour();
      const colors = getBuildingColorsByTime(hour);
      osmb.setStyle(colors);
      lastHourRef.current = Math.floor(hour);

      // Set initial date/time for shadow projection
      osmb.setDate(dateTime || new Date());

      // Handle building click events
      osmb.on('click', (e: any) => {
        if (e && onBuildingClick) {
          onBuildingClick({
            featureId: e.feature?.id || 'unknown',
            lat: e.lat,
            lon: e.lon,
            height: e.feature?.height,
            levels: e.feature?.levels,
            type: e.feature?.type,
            name: e.feature?.name,
          });
        }
      });

      // Highlight specific building if set
      if (highlightedBuilding) {
        osmb.highlight(highlightedBuilding, 'rgba(2, 82, 205, 0.95)');
      }

      osmBuildingsRef.current = osmb;

      // Sync OSMBuildings with Google Maps movements
      const syncWithMap = () => {
        if (!osmBuildingsRef.current || !map) return;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const tilt = map.getTilt();
        const heading = map.getHeading();

        if (center && zoom) {
          osmBuildingsRef.current.setPosition({
            latitude: center.lat(),
            longitude: center.lng(),
          });
          osmBuildingsRef.current.setZoom(zoom);
          if (typeof tilt === 'number') {
            osmBuildingsRef.current.setTilt(tilt);
          }
          if (typeof heading === 'number') {
            osmBuildingsRef.current.setRotation(heading);
          }
        }
      };

      // Add map listeners
      map.addListener('center_changed', syncWithMap);
      map.addListener('zoom_changed', syncWithMap);
      map.addListener('tilt_changed', syncWithMap);
      map.addListener('heading_changed', syncWithMap);

      setIsLoading(false);
    } catch (e) {
      console.warn('Failed to initialize OSM Buildings:', e);
      // Try fallback data source
      if (dataSourceIndexRef.current < OSM_BUILDINGS_DATA_SOURCES.length - 1) {
        dataSourceIndexRef.current++;
        setTimeout(initBuildings, 100);
      }
      setIsLoading(false);
    }
  }, [map, dateTime, getCurrentHour, onBuildingClick, highlightedBuilding]);

  // Load OSMBuildings script and initialize
  useEffect(() => {
    if (!enabled || !map) {
      // Cleanup when disabled
      if (osmBuildingsRef.current) {
        try {
          osmBuildingsRef.current.destroy();
        } catch (e) {
          // Cleanup error
        }
        osmBuildingsRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
      return;
    }

    setIsLoading(true);

    // Check if OSMBuildings is already loaded
    if (window.OSMBuildings) {
      initBuildings();
      return;
    }

    // Load the OSM Buildings script
    if (!scriptLoadedRef.current) {
      const existingScript = document.querySelector(`script[src="${OSM_BUILDINGS_CDN}"]`);
      if (existingScript) {
        // Script already in DOM, wait for load
        existingScript.addEventListener('load', () => {
          scriptLoadedRef.current = true;
          initBuildings();
        });
        return;
      }

      const script = document.createElement('script');
      script.src = OSM_BUILDINGS_CDN;
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        initBuildings();
      };
      script.onerror = () => {
        console.warn('Failed to load OSM Buildings from CDN');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      if (osmBuildingsRef.current) {
        try {
          osmBuildingsRef.current.destroy();
        } catch (e) {
          // Cleanup error
        }
        osmBuildingsRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
    };
  }, [enabled, map, initBuildings]);

  // Update date/time for shadow projection and building colors
  useEffect(() => {
    if (osmBuildingsRef.current && enabled) {
      try {
        const hour = getCurrentHour();

        // Update shadow projection
        if (dateTime) {
          osmBuildingsRef.current.setDate(dateTime);
        }

        // Update building colors if hour changed
        const hourFloor = Math.floor(hour);
        if (hourFloor !== lastHourRef.current) {
          const colors = getBuildingColorsByTime(hour);
          osmBuildingsRef.current.setStyle(colors);
          lastHourRef.current = hourFloor;
        }
      } catch (e) {
        // Update error
      }
    }
  }, [dateTime, enabled, getCurrentHour]);

  // Update highlighted building
  useEffect(() => {
    if (osmBuildingsRef.current && enabled && highlightedBuilding) {
      try {
        osmBuildingsRef.current.highlight(highlightedBuilding, 'rgba(2, 82, 205, 0.95)');
      } catch (e) {
        // Highlight error
      }
    }
  }, [highlightedBuilding, enabled]);

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
