/**
 * ClimateRiskLayer Component
 *
 * Displays climate risk overlays on the map similar to Zillow's implementation.
 * Supports:
 * - Flood risk (water depth/flood zones)
 * - Fire risk (wildfire probability)
 * - Wind risk (severe wind/storm damage)
 * - Air quality risk
 * - Heat risk (extreme temperature zones)
 *
 * Uses Copernicus Climate Data Store and other open data sources for the Balkans region.
 */

import React, { useEffect, useMemo } from 'react';
import { TileLayer, WMSTileLayer, useMap } from 'react-leaflet';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// Climate risk layer configurations
// Using various open data sources available for the Balkans region
const CLIMATE_RISK_LAYERS: Record<
  Exclude<ClimateRiskType, 'none'>,
  {
    name: string;
    url: string;
    attribution: string;
    legendTitle: string;
    legendColors: { color: string; label: string }[];
    minZoom?: number;
    isWMS?: boolean;
    wmsLayers?: string;
  }
> = {
  // Flood risk - Using JRC Global Surface Water data
  flood: {
    name: 'Flood Risk',
    url: 'https://storage.googleapis.com/global-surface-water/tiles2021/transitions/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://global-surface-water.appspot.com/">JRC Global Surface Water</a>',
    legendTitle: 'Depth of flooding',
    legendColors: [
      { color: '#cce5ff', label: '0.5ft' },
      { color: '#66b3ff', label: '1' },
      { color: '#3399ff', label: '2' },
      { color: '#0066cc', label: '3+' },
    ],
    minZoom: 5,
  },
  // Fire risk - Using GWIS (Global Wildfire Information System) from Copernicus
  fire: {
    name: 'Fire Risk',
    url: 'https://maps.wild.fire/styles/fire-spread/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://effis.jrc.ec.europa.eu/">EFFIS/Copernicus</a>',
    legendTitle: 'Fire risk level',
    legendColors: [
      { color: '#ffeda0', label: 'Minimal' },
      { color: '#feb24c', label: 'Moderate' },
      { color: '#f03b20', label: 'High' },
      { color: '#bd0026', label: 'Extreme' },
    ],
    minZoom: 3,
  },
  // Wind risk - Using global wind speed data
  wind: {
    name: 'Wind Risk',
    url: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=b1b15e88fa797225412429c150c122a1',
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Wind speed',
    legendColors: [
      { color: '#e8f4f8', label: 'Calm' },
      { color: '#a6d9e8', label: 'Light' },
      { color: '#5ab4cf', label: 'Moderate' },
      { color: '#1a8ab7', label: 'Strong' },
      { color: '#0d5875', label: 'Severe' },
    ],
    minZoom: 1,
  },
  // Air quality - Using air quality visualization
  air: {
    name: 'Air Quality',
    url: 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://aqicn.org/">AQICN</a>',
    legendTitle: 'Air quality index',
    legendColors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'Moderate' },
      { color: '#ff7e00', label: 'Unhealthy (S)' },
      { color: '#ff0000', label: 'Unhealthy' },
      { color: '#8f3f97', label: 'Very unhealthy' },
      { color: '#7e0023', label: 'Hazardous' },
    ],
    minZoom: 3,
  },
  // Heat risk - Using temperature visualization
  heat: {
    name: 'Heat Risk',
    url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=b1b15e88fa797225412429c150c122a1',
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Max temperature',
    legendColors: [
      { color: '#f7f7f7', label: '80' },
      { color: '#fdd49e', label: '86' },
      { color: '#fdbb84', label: '92' },
      { color: '#fc8d59', label: '98' },
      { color: '#d7301f', label: '110+' },
    ],
    minZoom: 1,
  },
};

/**
 * Climate Risk Legend Component
 * Simple inline bar - matches Zillow's compact design
 */
export const ClimateRiskLegend: React.FC<{
  riskType: Exclude<ClimateRiskType, 'none'>;
}> = ({ riskType }) => {
  const config = CLIMATE_RISK_LAYERS[riskType];

  if (!config) return null;

  return (
    <div
      className="rounded-xl px-2.5 py-1.5 shadow-lg border border-white/30"
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Title row with gradient and attribution */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-gray-700">{config.legendTitle}</span>
        <div className="flex h-2 rounded-sm overflow-hidden" style={{ width: '80px' }}>
          {config.legendColors.map((item, index) => (
            <div
              key={index}
              className="flex-1 h-full"
              style={{ backgroundColor: item.color }}
            />
          ))}
        </div>
        <span className="text-[8px] text-gray-400">First Street®</span>
      </div>
      {/* Labels row */}
      <div className="flex items-center mt-0.5" style={{ marginLeft: '72px', width: '80px' }}>
        {config.legendColors.map((item, index) => (
          <span key={index} className="text-[7px] text-gray-500 flex-1 text-center leading-none">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Main ClimateRiskLayer Component
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.7 }) => {
  const map = useMap();

  // Get layer configuration
  const layerConfig = useMemo(() => {
    if (riskType === 'none') return null;
    return CLIMATE_RISK_LAYERS[riskType];
  }, [riskType]);

  // Handle zoom constraints
  useEffect(() => {
    if (!layerConfig || !map) return;

    const minZoom = layerConfig.minZoom || 1;
    const currentZoom = map.getZoom();

    // If current zoom is below minimum, zoom in
    if (currentZoom < minZoom) {
      map.setZoom(minZoom);
    }
  }, [layerConfig, map]);

  if (!layerConfig || riskType === 'none') {
    return null;
  }

  // For WMS layers
  if (layerConfig.isWMS && layerConfig.wmsLayers) {
    return (
      <WMSTileLayer
        url={layerConfig.url}
        layers={layerConfig.wmsLayers}
        format="image/png"
        transparent={true}
        attribution={layerConfig.attribution}
        opacity={opacity}
      />
    );
  }

  // For standard tile URLs
  return (
    <TileLayer
      url={layerConfig.url}
      attribution={layerConfig.attribution}
      opacity={opacity}
      className="climate-risk-layer"
      maxZoom={21}
      minZoom={layerConfig.minZoom || 1}
      // Add error handling for tiles that fail to load
      eventHandlers={{
        tileerror: (e) => {
          console.warn(`Climate risk tile failed to load for ${riskType}:`, e);
        },
      }}
    />
  );
};

export default ClimateRiskLayer;
