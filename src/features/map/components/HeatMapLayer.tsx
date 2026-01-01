// HeatMapLayer Component
// Renders a heat map overlay showing property density/hotspots

import React, { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Property } from '@/types';

// Extend Leaflet types for heat layer
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatMapOptions
  ): L.Layer;
}

interface HeatMapOptions {
  minOpacity?: number;
  maxZoom?: number;
  max?: number;
  radius?: number;
  blur?: number;
  gradient?: Record<number, string>;
}

interface HeatMapLayerProps {
  properties: Property[];
  enabled: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * HeatMapLayer Component
 *
 * Creates a heat map visualization showing property density on the map.
 * Uses leaflet.heat plugin for smooth gradient rendering.
 *
 * Features:
 * - Customizable intensity levels
 * - Snapchat-style gradient colors (cyan -> yellow -> red)
 * - Automatic updates when properties change
 * - Performance optimized with useMemo
 */
const HeatMapLayer: React.FC<HeatMapLayerProps> = ({
  properties,
  enabled,
  intensity = 'medium',
}) => {
  const map = useMap();

  // Generate heat map data points from properties
  const heatData = useMemo(() => {
    return properties
      .filter((p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng))
      .map((p) => {
        // Weight based on property price tier (optional enhancement)
        const weight = 0.8;
        return [p.lat, p.lng, weight] as [number, number, number];
      });
  }, [properties]);

  // Intensity presets
  const intensityConfig = useMemo(() => {
    switch (intensity) {
      case 'low':
        return { radius: 20, blur: 15, maxZoom: 14 };
      case 'high':
        return { radius: 35, blur: 20, maxZoom: 18 };
      case 'medium':
      default:
        return { radius: 25, blur: 18, maxZoom: 16 };
    }
  }, [intensity]);

  useEffect(() => {
    if (!enabled || heatData.length === 0) return;

    // Snapchat-style gradient: cyan -> green -> yellow -> orange -> red
    const heatLayer = L.heatLayer(heatData, {
      minOpacity: 0.4,
      maxZoom: intensityConfig.maxZoom,
      radius: intensityConfig.radius,
      blur: intensityConfig.blur,
      gradient: {
        0.0: '#00ffff',  // Cyan
        0.2: '#00ff88',  // Teal/Green
        0.4: '#88ff00',  // Lime
        0.6: '#ffff00',  // Yellow
        0.8: '#ff8800',  // Orange
        1.0: '#ff0000',  // Red (hottest)
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, enabled, heatData, intensityConfig]);

  return null;
};

export default HeatMapLayer;
