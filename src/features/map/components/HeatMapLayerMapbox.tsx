// HeatMapLayerMapbox Component
// Renders a heat map overlay using Mapbox GL

import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl';
import { Property } from '@/types';

interface HeatMapLayerMapboxProps {
  properties: Property[];
  enabled: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * HeatMapLayerMapbox Component
 *
 * Creates a heat map visualization showing property density on the map.
 * Uses Mapbox GL's native heatmap layer for smooth rendering.
 */
const HeatMapLayerMapbox: React.FC<HeatMapLayerMapboxProps> = ({
  properties,
  enabled,
  intensity = 'medium',
}) => {
  // Generate GeoJSON from properties
  const geoJson = useMemo(() => {
    const features = properties
      .filter((p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng))
      .map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng, p.lat],
        },
        properties: {
          weight: 0.8,
        },
      }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [properties]);

  // Intensity presets
  const intensityConfig = useMemo(() => {
    switch (intensity) {
      case 'low':
        return { radius: 15, maxZoom: 14 };
      case 'high':
        return { radius: 30, maxZoom: 18 };
      case 'medium':
      default:
        return { radius: 20, maxZoom: 16 };
    }
  }, [intensity]);

  if (!enabled || geoJson.features.length === 0) {
    return null;
  }

  return (
    <Source id="heatmap-source" type="geojson" data={geoJson}>
      <Layer
        id="heatmap-layer"
        type="heatmap"
        paint={{
          // Increase weight based on property count
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 0,
            1, 1
          ],
          // Intensity increases with zoom
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            intensityConfig.maxZoom, 3
          ],
          // Snapchat-style gradient: cyan -> green -> yellow -> orange -> red
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 255, 255, 0)',       // transparent
            0.1, 'rgba(0, 255, 255, 0.4)',   // cyan
            0.2, 'rgba(0, 255, 136, 0.5)',   // teal/green
            0.4, 'rgba(136, 255, 0, 0.6)',   // lime
            0.6, 'rgba(255, 255, 0, 0.7)',   // yellow
            0.8, 'rgba(255, 136, 0, 0.8)',   // orange
            1, 'rgba(255, 0, 0, 0.9)'        // red (hottest)
          ],
          // Adjust radius based on zoom
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, intensityConfig.radius * 0.5,
            10, intensityConfig.radius,
            15, intensityConfig.radius * 2
          ],
          // Fade out at high zoom
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.8,
            15, 0.6,
            18, 0.3
          ]
        }}
      />
    </Source>
  );
};

export default HeatMapLayerMapbox;
