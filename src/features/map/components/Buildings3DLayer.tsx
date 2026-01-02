// Buildings3DLayer Component
// Adds 3D building extrusions to the map like Snapchat's Snap Map

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface Buildings3DLayerProps {
  enabled: boolean;
  style?: 'night' | 'day';
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
 * Styled for Snapchat-like dark mode with glowing effects.
 *
 * Features:
 * - 3D building extrusions
 * - Dark themed buildings for night mode
 * - Smooth integration with Leaflet
 */
const Buildings3DLayer: React.FC<Buildings3DLayerProps> = ({ enabled, style = 'night' }) => {
  const map = useMap();
  const osmBuildingsRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

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
        // Create OSM Buildings layer with Snapchat-style dark colors
        const osmb = new window.OSMBuildings(map);

        // Load building data
        osmb.load('https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json');

        // Set Snapchat-style dark building colors
        if (style === 'night') {
          osmb.style({
            wallColor: 'rgba(20, 30, 50, 0.95)',      // Dark navy walls
            roofColor: 'rgba(30, 45, 70, 0.9)',       // Slightly lighter roofs
            shadows: true,
          });
        } else {
          osmb.style({
            wallColor: 'rgba(200, 200, 200, 0.9)',
            roofColor: 'rgba(180, 180, 180, 0.9)',
            shadows: true,
          });
        }

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
  }, [enabled, map, style]);

  // Update style when it changes
  useEffect(() => {
    if (osmBuildingsRef.current && enabled) {
      try {
        if (style === 'night') {
          osmBuildingsRef.current.style({
            wallColor: 'rgba(20, 30, 50, 0.95)',
            roofColor: 'rgba(30, 45, 70, 0.9)',
            shadows: true,
          });
        } else {
          osmBuildingsRef.current.style({
            wallColor: 'rgba(200, 200, 200, 0.9)',
            roofColor: 'rgba(180, 180, 180, 0.9)',
            shadows: true,
          });
        }
      } catch (e) {
        // Style update error - ignore
      }
    }
  }, [style, enabled]);

  return null;
};

export default Buildings3DLayer;
