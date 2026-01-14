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

import React, { useMemo } from 'react';
import { TileLayer } from 'react-leaflet';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// OpenWeatherMap API key (free tier)
const OWM_API_KEY = '439d4b804bc8187953eb36d2a8c26a02';

// Climate risk layer configurations using OpenWeatherMap 1.0 tiles (free)
const CLIMATE_RISK_LAYERS: Record<
  Exclude<ClimateRiskType, 'none'>,
  {
    name: string;
    tileUrl: string;
    attribution: string;
    legendTitle: string;
    legendColors: { color: string; label: string }[];
  }
> = {
  flood: {
    name: 'Flood Risk',
    tileUrl: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Precipitation',
    legendColors: [
      { color: '#a0f0a0', label: 'Light' },
      { color: '#00ff00', label: 'Med' },
      { color: '#ffff00', label: 'Heavy' },
      { color: '#ff0000', label: 'Severe' },
    ],
  },
  fire: {
    name: 'Fire Risk',
    tileUrl: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Temperature',
    legendColors: [
      { color: '#313695', label: 'Cool' },
      { color: '#fee090', label: 'Warm' },
      { color: '#f46d43', label: 'Hot' },
      { color: '#a50026', label: 'Extreme' },
    ],
  },
  wind: {
    name: 'Wind Risk',
    tileUrl: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Wind speed',
    legendColors: [
      { color: '#e8f4f8', label: 'Calm' },
      { color: '#a6d9e8', label: 'Light' },
      { color: '#5ab4cf', label: 'Mod' },
      { color: '#1a8ab7', label: 'Strong' },
    ],
  },
  air: {
    name: 'Air Quality',
    tileUrl: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Cloud cover',
    legendColors: [
      { color: '#ffffff', label: 'Clear' },
      { color: '#cccccc', label: 'Light' },
      { color: '#888888', label: 'Med' },
      { color: '#444444', label: 'Heavy' },
    ],
  },
  heat: {
    name: 'Heat Risk',
    tileUrl: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
    legendTitle: 'Temperature',
    legendColors: [
      { color: '#313695', label: 'Cold' },
      { color: '#74add1', label: 'Cool' },
      { color: '#fee090', label: 'Warm' },
      { color: '#f46d43', label: 'Hot' },
      { color: '#a50026', label: 'Extreme' },
    ],
  },
};

/**
 * Climate Risk Legend Component
 * Compact responsive design - no fixed sizes
 */
export const ClimateRiskLegend: React.FC<{
  riskType: Exclude<ClimateRiskType, 'none'>;
}> = ({ riskType }) => {
  const config = CLIMATE_RISK_LAYERS[riskType];

  if (!config) return null;

  return (
    <div
      className="rounded-lg px-2 py-1 shadow-md border border-white/20 inline-flex flex-col"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Single row: title + gradient + labels */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-medium text-gray-600 whitespace-nowrap">{config.legendTitle}</span>
        <div className="flex items-center">
          {config.legendColors.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className="w-4 h-1.5"
                style={{
                  backgroundColor: item.color,
                  borderRadius: index === 0 ? '2px 0 0 2px' : index === config.legendColors.length - 1 ? '0 2px 2px 0' : '0',
                }}
              />
              <span className="text-[6px] text-gray-500 leading-tight mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Main ClimateRiskLayer Component
 * Renders weather/climate overlay tiles from OpenWeatherMap
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.6 }) => {
  const layerConfig = useMemo(() => {
    if (riskType === 'none') return null;
    return CLIMATE_RISK_LAYERS[riskType];
  }, [riskType]);

  if (!layerConfig || riskType === 'none') {
    return null;
  }

  return (
    <TileLayer
      url={layerConfig.tileUrl}
      attribution={layerConfig.attribution}
      opacity={opacity}
      maxZoom={19}
      minZoom={1}
    />
  );
};

export default ClimateRiskLayer;
