// Buildings3DLayer Component
// Adds 3D building extrusions with realistic time-based shadows and dynamic theming
// Enhanced with OSM Buildings for detailed 3D visualization

import { useEffect, useRef, useCallback, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface Buildings3DLayerProps {
  enabled: boolean;
  dateTime?: Date; // For shadow projection and theme based on sun position
  onBuildingClick?: (buildingInfo: BuildingInfo) => void;
  highlightedBuilding?: string | number | null;
  showBuildingInfo?: boolean; // Show popup on building click
}

interface BuildingInfo {
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

// CDN sources for the OSM Buildings library
const OSM_BUILDINGS_CDN = 'https://cdn.osmbuildings.org/classic/0.2.2b/OSMBuildings-Leaflet.js';

// Patch canvas getContext to add willReadFrequently for better performance
// This fixes the Chrome warning about multiple readback operations
// Runs immediately when module loads (IIFE)
const _canvasPatch = (() => {
  if (typeof window === 'undefined' || typeof HTMLCanvasElement === 'undefined') return;

  // Check if already patched
  if ((HTMLCanvasElement.prototype as any)._willReadFrequentlyPatched) return;
  (HTMLCanvasElement.prototype as any)._willReadFrequentlyPatched = true;

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(
    contextId: string,
    options?: any
  ): RenderingContext | null {
    if (contextId === '2d') {
      options = { ...options, willReadFrequently: true };
    }
    return originalGetContext.call(this, contextId, options);
  } as typeof HTMLCanvasElement.prototype.getContext;
})();

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
 * Creates realistic lighting effects that change throughout the day
 */
const getBuildingColorsByTime = (hour: number): { wallColor: string; roofColor: string; shadows: boolean } => {
  const period = getTimePeriod(hour);

  switch (period) {
    case 'night':
      // Deep blue/navy night colors
      return {
        wallColor: 'rgba(30, 40, 65, 0.92)',
        roofColor: 'rgba(45, 55, 80, 0.88)',
        shadows: true,
      };
    case 'dawn':
      // Warm pink/orange dawn light
      return {
        wallColor: 'rgba(180, 140, 130, 0.9)',
        roofColor: 'rgba(200, 160, 140, 0.88)',
        shadows: true,
      };
    case 'morning':
      // Fresh morning light - slightly warm
      return {
        wallColor: 'rgba(200, 195, 180, 0.9)',
        roofColor: 'rgba(180, 175, 165, 0.88)',
        shadows: true,
      };
    case 'noon':
      // Bright midday - neutral/bright
      return {
        wallColor: 'rgba(220, 220, 215, 0.9)',
        roofColor: 'rgba(195, 195, 190, 0.88)',
        shadows: true,
      };
    case 'afternoon':
      // Warm afternoon golden hour approaching
      return {
        wallColor: 'rgba(210, 200, 180, 0.9)',
        roofColor: 'rgba(190, 180, 165, 0.88)',
        shadows: true,
      };
    case 'sunset':
      // Golden/orange sunset light
      return {
        wallColor: 'rgba(200, 150, 100, 0.9)',
        roofColor: 'rgba(220, 160, 90, 0.88)',
        shadows: true,
      };
    case 'dusk':
      // Purple/blue dusk transition
      return {
        wallColor: 'rgba(100, 90, 120, 0.9)',
        roofColor: 'rgba(120, 100, 130, 0.88)',
        shadows: true,
      };
    default:
      return {
        wallColor: 'rgba(200, 200, 200, 0.9)',
        roofColor: 'rgba(180, 180, 180, 0.88)',
        shadows: true,
      };
  }
};

/**
 * Buildings3DLayer Component
 *
 * Adds 3D building extrusions using OSM Buildings.
 * Enhanced features for real estate:
 * - 3D building extrusions with realistic shadows
 * - Dynamic theming based on time of day (dawn, noon, sunset, night)
 * - Time-based shadow projection (see sunlight at any hour)
 * - Building click interaction with info popup
 * - Smooth integration with Leaflet
 * - Fallback data sources for reliability
 */
const Buildings3DLayer: React.FC<Buildings3DLayerProps> = ({
  enabled,
  dateTime,
  onBuildingClick,
  highlightedBuilding,
  showBuildingInfo = true,
}) => {
  const map = useMap();
  const osmBuildingsRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);
  const lastHourRef = useRef<number>(-1);
  const popupRef = useRef<L.Popup | null>(null);
  const dataSourceIndexRef = useRef(0);

  // Get current hour from dateTime
  const getCurrentHour = useCallback(() => {
    return dateTime ? dateTime.getHours() : new Date().getHours();
  }, [dateTime]);

  // Show building info popup
  const showBuildingPopup = useCallback((info: BuildingInfo) => {
    if (!showBuildingInfo || !map) return;

    // Close existing popup
    if (popupRef.current) {
      map.closePopup(popupRef.current);
    }

    const heightInfo = info.height ? `${Math.round(info.height)}m` : info.levels ? `~${info.levels * 3}m (${info.levels} floors)` : 'Unknown';
    const typeInfo = info.type || 'Building';
    const nameInfo = info.name ? `<strong>${info.name}</strong><br/>` : '';

    const popupContent = `
      <div style="min-width: 150px; font-family: system-ui, -apple-system, sans-serif;">
        ${nameInfo}
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 16px;">🏢</span>
          <span style="font-weight: 500; color: #374151;">${typeInfo}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 13px;">
          <span>📏</span>
          <span>Height: ${heightInfo}</span>
        </div>
      </div>
    `;

    popupRef.current = L.popup({
      closeButton: true,
      className: 'building-info-popup',
      maxWidth: 250,
    })
      .setLatLng([info.lat, info.lon])
      .setContent(popupContent)
      .openOn(map);
  }, [map, showBuildingInfo]);

  useEffect(() => {
    if (!enabled) {
      // Remove buildings layer if disabled
      if (osmBuildingsRef.current) {
        try {
          map.removeLayer(osmBuildingsRef.current);
        } catch (e) {
          // Layer might already be removed
        }
        osmBuildingsRef.current = null;
      }
      // Close popup
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
      return;
    }

    const loadOSMBuildings = () => {
      // Check if OSMBuildings is already loaded
      if (window.OSMBuildings && !osmBuildingsRef.current) {
        initBuildings();
        return;
      }

      // Load the OSM Buildings script if not already loaded
      if (!scriptLoadedRef.current) {
        const script = document.createElement('script');
        script.src = OSM_BUILDINGS_CDN;
        script.async = true;
        script.onload = () => {
          scriptLoadedRef.current = true;
          initBuildings();
        };
        script.onerror = () => {
          // Warning removed
        };
        document.head.appendChild(script);
      }
    };

    const initBuildings = () => {
      if (!window.OSMBuildings || osmBuildingsRef.current) return;

      try {
        // Create OSM Buildings layer
        const osmb = new window.OSMBuildings(map);

        // Load building data from primary source, with fallback
        const dataSource = OSM_BUILDINGS_DATA_SOURCES[dataSourceIndexRef.current];
        osmb.load(dataSource);

        // Set initial style based on time
        const hour = getCurrentHour();
        const colors = getBuildingColorsByTime(hour);
        osmb.style(colors);
        lastHourRef.current = hour;

        // Set initial date/time for shadow projection
        if (dateTime) {
          osmb.date(dateTime);
        } else {
          osmb.date(new Date());
        }

        // Handle building click events
        osmb.click((info: BuildingInfo) => {
          // Show popup with building info
          showBuildingPopup(info);

          // Call custom handler if provided
          if (onBuildingClick) {
            onBuildingClick(info);
          }
        });

        // Custom feature styling - highlight specific buildings
        if (highlightedBuilding) {
          osmb.each((feature: any) => {
            if (feature.id === highlightedBuilding) {
              feature.wallColor = 'rgba(2, 82, 205, 0.95)'; // Primary blue
              feature.roofColor = 'rgba(59, 130, 246, 0.9)';
            }
            return true; // Include feature
          });
        }

        osmBuildingsRef.current = osmb;
      } catch (e) {
        // Warning removed
        // Try fallback data source
        if (dataSourceIndexRef.current < OSM_BUILDINGS_DATA_SOURCES.length - 1) {
          dataSourceIndexRef.current++;
          initBuildings();
        }
      }
    };

    loadOSMBuildings();

    return () => {
      if (osmBuildingsRef.current) {
        try {
          map.removeLayer(osmBuildingsRef.current);
        } catch (e) {
          // Cleanup error - ignore
        }
        osmBuildingsRef.current = null;
      }
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
    };
  }, [enabled, map, onBuildingClick, highlightedBuilding, getCurrentHour, showBuildingPopup, dateTime]);

  // Update date/time for shadow projection AND building colors
  useEffect(() => {
    if (osmBuildingsRef.current && enabled) {
      try {
        const hour = getCurrentHour();

        // Update shadow projection
        if (dateTime) {
          osmBuildingsRef.current.date(dateTime);
        }

        // Update building colors if hour changed (with smooth transition feel)
        if (hour !== lastHourRef.current) {
          const colors = getBuildingColorsByTime(hour);
          osmBuildingsRef.current.style(colors);
          lastHourRef.current = hour;
        }
      } catch (e) {
        // Update error - ignore
      }
    }
  }, [dateTime, enabled, getCurrentHour]);

  return null;
};

export default Buildings3DLayer;

// Export helpers for use in other components
export { getTimePeriod, getBuildingColorsByTime, OSM_BUILDINGS_DATA_SOURCES };
export type { TimePeriod, BuildingInfo, Buildings3DLayerProps };
