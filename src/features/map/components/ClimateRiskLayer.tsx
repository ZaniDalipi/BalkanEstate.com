/**
 * ClimateRiskLayer Component
 *
 * Displays climate risk overlays on the map.
 * Uses free tile services that work without API keys.
 */

import React, { useMemo, useEffect } from 'react';
import { TileLayer } from 'react-leaflet';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// OpenWeatherMap API key from environment
const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

// Climate risk layer configurations
const CLIMATE_RISK_LAYERS: Record<
  Exclude<ClimateRiskType, 'none'>,
  {
    name: string;
    tileUrl: string;
    attribution: string;
    legendTitle: string;
    legendColors: { color: string; label: string }[];
    className?: string;
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
    className: 'flood-layer',
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
    className: 'fire-layer',
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
    className: 'wind-layer',
  },
  air: {
    name: 'Air Quality',
    tileUrl: 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://aqicn.org/">AQICN</a>',
    legendTitle: 'Air quality',
    legendColors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'OK' },
      { color: '#ff7e00', label: 'Poor' },
      { color: '#ff0000', label: 'Bad' },
    ],
    className: 'air-layer',
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
    className: 'heat-layer',
  },
};

/**
 * Climate Risk Legend Component
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
 * Inject CSS styles for climate layer filters
 */
const useClimateLayerStyles = () => {
  useEffect(() => {
    const styleId = 'climate-layer-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .flood-layer { }
      .fire-layer { }
      .wind-layer { }
      .air-layer { }
      .heat-layer { }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);
};

/**
 * Main ClimateRiskLayer Component
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.5 }) => {
  useClimateLayerStyles();

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
      className={layerConfig.className}
    />
  );
};

export default ClimateRiskLayer;
