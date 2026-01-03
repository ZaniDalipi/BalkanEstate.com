// Buildings3DLayer Component
// Adds 3D building extrusions with realistic time-based shadows

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';

interface Buildings3DLayerProps {
  enabled: boolean;
  style?: 'night' | 'day';
  dateTime?: Date; // For shadow projection based on sun position
  onBuildingClick?: (buildingInfo: { featureId: string | number; lat: number; lon: number }) => void;
  highlightedBuilding?: string | number | null;
}

// Declare OSMBuildings on window
declare global {
  interface Window {
    OSMBuildings: any;
  }
}

/**
 * Buildings3DLayer Component
 *
 * Adds 3D building extrusions using OSM Buildings.
 * Enhanced features for real estate:
 * - 3D building extrusions with realistic shadows
 * - Time-based shadow projection (see sunlight at any hour)
 * - Building click interaction
 * - Dark/light theme support
 * - Smooth integration with Leaflet
 */
const Buildings3DLayer: React.FC<Buildings3DLayerProps> = ({
  enabled,
  style = 'night',
  dateTime,
  onBuildingClick,
  highlightedBuilding,
}) => {
  const map = useMap();
  const osmBuildingsRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  // Get building colors based on style
  const getBuildingColors = useCallback((themeStyle: 'night' | 'day') => {
    if (themeStyle === 'night') {
      return {
        wallColor: 'rgba(45, 55, 85, 0.92)',       // Navy walls
        roofColor: 'rgba(70, 85, 120, 0.88)',      // Lighter roofs
        shadows: true,
      };
    }
    return {
      wallColor: 'rgba(220, 220, 225, 0.9)',
      roofColor: 'rgba(200, 200, 205, 0.9)',
      shadows: true,
    };
  }, []);

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
        script.src = 'https://cdn.osmbuildings.org/classic/0.2.2b/OSMBuildings-Leaflet.js';
        script.async = true;
        script.onload = () => {
          scriptLoadedRef.current = true;
          initBuildings();
        };
        document.head.appendChild(script);
      }
    };

    const initBuildings = () => {
      if (!window.OSMBuildings || osmBuildingsRef.current) return;

      try {
        // Create OSM Buildings layer
        const osmb = new window.OSMBuildings(map);

        // Load building data from OSM Buildings proxy
        osmb.load('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');

        // Set building style based on theme
        osmb.style(getBuildingColors(style));

        // Set initial date/time for shadow projection
        if (dateTime) {
          osmb.date(dateTime);
        } else {
          // Default to current time
          osmb.date(new Date());
        }

        // Handle building click events
        if (onBuildingClick) {
          osmb.click((info: { featureId: string | number; lat: number; lon: number }) => {
            onBuildingClick(info);
          });
        }

        // Custom feature styling - highlight specific buildings
        osmb.each((feature: any) => {
          if (highlightedBuilding && feature.id === highlightedBuilding) {
            feature.wallColor = style === 'night'
              ? 'rgba(0, 200, 255, 0.9)'
              : 'rgba(2, 82, 205, 0.9)';
            feature.roofColor = style === 'night'
              ? 'rgba(0, 255, 255, 0.85)'
              : 'rgba(2, 102, 255, 0.85)';
          }
          return true; // Include feature
        });

        osmBuildingsRef.current = osmb;
      } catch (e) {
        console.warn('Failed to initialize OSM Buildings:', e);
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
    };
  }, [enabled, map, style, onBuildingClick, highlightedBuilding, getBuildingColors]);

  // Update date/time for shadow projection
  useEffect(() => {
    if (osmBuildingsRef.current && enabled && dateTime) {
      try {
        osmBuildingsRef.current.date(dateTime);
      } catch (e) {
        // Date update error - ignore
      }
    }
  }, [dateTime, enabled]);

  // Update style when it changes
  useEffect(() => {
    if (osmBuildingsRef.current && enabled) {
      try {
        osmBuildingsRef.current.style(getBuildingColors(style));
      } catch (e) {
        // Style update error - ignore
      }
    }
  }, [style, enabled, getBuildingColors]);

  return null;
};

export default Buildings3DLayer;
