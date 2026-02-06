/**
 * ClimateRiskLayer Component
 *
 * Displays climate risk overlays on the Leaflet map.
 * Data sources:
 *   - Flood: OpenWeatherMap precipitation radar (free tier, API key required)
 *   - Fire:  NASA FIRMS VIIRS active fire detections via WMS (free, no key)
 *   - Wind:  OpenWeatherMap wind speed (free tier, API key required)
 *   - Air:   AQICN EPA air quality index tiles (free, no key)
 *   - Heat:  OpenWeatherMap temperature (free tier, API key required)
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// OpenWeatherMap API key from environment
const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

// NASA FIRMS WMS endpoint (free, no API key required for map tiles)
const FIRMS_WMS_URL =
  'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/51e65c3412f9d1b15eddb27ab9c3b28c/';

interface LayerConfig {
  name: string;
  legendTitle: string;
  legendColors: { color: string; label: string }[];
}

interface XYZLayerConfig extends LayerConfig {
  type: 'xyz';
  tileUrl: string;
  attribution: string;
}

interface WMSLayerConfig extends LayerConfig {
  type: 'wms';
  url: string;
  layers: string;
  attribution: string;
}

type ClimateLayerConfig = XYZLayerConfig | WMSLayerConfig;

// Climate risk layer configurations
const CLIMATE_RISK_LAYERS: Record<Exclude<ClimateRiskType, 'none'>, ClimateLayerConfig> = {
  flood: {
    type: 'xyz',
    name: 'Precipitation',
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
    type: 'wms',
    name: 'Active Fires',
    url: FIRMS_WMS_URL,
    layers: 'fires_viirs_24',
    attribution: '&copy; <a href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</a>',
    legendTitle: 'Fire detections',
    legendColors: [
      { color: '#ffe082', label: 'Low' },
      { color: '#ff9800', label: 'Med' },
      { color: '#f44336', label: 'High' },
      { color: '#b71c1c', label: 'Intense' },
    ],
  },
  wind: {
    type: 'xyz',
    name: 'Wind Speed',
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
    type: 'xyz',
    name: 'Air Quality',
    tileUrl: 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://aqicn.org/">AQICN</a>',
    legendTitle: 'Air quality',
    legendColors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'OK' },
      { color: '#ff7e00', label: 'Poor' },
      { color: '#ff0000', label: 'Bad' },
      { color: '#7e0023', label: 'Hazard' },
    ],
  },
  heat: {
    type: 'xyz',
    name: 'Temperature',
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
 * WMS layer rendered via native Leaflet (avoids CRS issues with react-leaflet WMSTileLayer)
 */
const WMSClimateLayer: React.FC<{ config: WMSLayerConfig; opacity: number }> = ({ config, opacity }) => {
  const map = useMap();
  const layerRef = useRef<L.TileLayer.WMS | null>(null);

  useEffect(() => {
    const wmsLayer = L.tileLayer.wms(config.url, {
      layers: config.layers,
      format: 'image/png',
      transparent: true,
      opacity,
      attribution: config.attribution,
      version: '1.1.1',
    });
    wmsLayer.addTo(map);
    layerRef.current = wmsLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, config.url, config.layers, config.attribution, opacity]);

  return null;
};

/**
 * Main ClimateRiskLayer Component
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.5 }) => {
  const layerConfig = useMemo(() => {
    if (riskType === 'none') return null;
    return CLIMATE_RISK_LAYERS[riskType];
  }, [riskType]);

  if (!layerConfig || riskType === 'none') {
    return null;
  }

  // WMS layers (NASA FIRMS fire data) need native Leaflet handling
  if (layerConfig.type === 'wms') {
    return <WMSClimateLayer config={layerConfig} opacity={opacity} />;
  }

  // Standard XYZ tile layers (OWM, AQICN)
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
