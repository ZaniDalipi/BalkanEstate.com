/**
 * ClimateRiskLayer Component (Leaflet)
 *
 * Displays climate risk overlays on the Leaflet map using free, working data sources:
 *   - Flood: RainViewer precipitation radar (free, no API key)
 *   - Fire:  NASA FIRMS VIIRS active fire detections via WMS (free, public MAP_KEY)
 *   - Wind:  OpenWeatherMap wind speed (free tier, VITE_OWM_API_KEY required)
 *   - Air:   AQICN EPA air quality index tiles (free, no API key)
 *   - Heat:  OpenWeatherMap temperature (free tier, VITE_OWM_API_KEY required)
 */

import React, { useEffect, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useRainViewer } from '../hooks/useRainViewer';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// OpenWeatherMap API key from environment
const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

// NASA FIRMS WMS endpoint (public MAP_KEY for tile access)
const FIRMS_WMS_URL =
  'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/51e65c3412f9d1b15eddb27ab9c3b28c/';

interface LegendItem {
  color: string;
  label: string;
}

interface LayerLegendConfig {
  legendTitle: string;
  legendColors: LegendItem[];
  source: string;
  needsApiKey?: boolean;
}

// Legend configurations for each layer type
const LEGEND_CONFIGS: Record<Exclude<ClimateRiskType, 'none'>, LayerLegendConfig> = {
  flood: {
    legendTitle: 'Precipitation Radar',
    source: 'RainViewer',
    legendColors: [
      { color: '#88bbee', label: 'Light' },
      { color: '#00ff00', label: 'Moderate' },
      { color: '#ffff00', label: 'Heavy' },
      { color: '#ff0000', label: 'Intense' },
    ],
  },
  fire: {
    legendTitle: 'Active Fires (24h)',
    source: 'NASA FIRMS',
    legendColors: [
      { color: '#ffe082', label: 'Low FRP' },
      { color: '#ff9800', label: 'Medium' },
      { color: '#f44336', label: 'High' },
      { color: '#b71c1c', label: 'Intense' },
    ],
  },
  wind: {
    legendTitle: 'Wind Speed',
    source: 'OpenWeatherMap',
    needsApiKey: !OWM_API_KEY,
    legendColors: [
      { color: '#e8f4f8', label: 'Calm' },
      { color: '#a6d9e8', label: 'Light' },
      { color: '#5ab4cf', label: 'Moderate' },
      { color: '#1a8ab7', label: 'Strong' },
    ],
  },
  air: {
    legendTitle: 'Air Quality (EPA AQI)',
    source: 'WAQI/AQICN',
    legendColors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'OK' },
      { color: '#ff7e00', label: 'Poor' },
      { color: '#ff0000', label: 'Bad' },
      { color: '#7e0023', label: 'Hazard' },
    ],
  },
  heat: {
    legendTitle: 'Temperature',
    source: 'OpenWeatherMap',
    needsApiKey: !OWM_API_KEY,
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
  const config = LEGEND_CONFIGS[riskType];
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
      {config.needsApiKey && (
        <span className="text-[7px] text-amber-600 mt-0.5">Set VITE_OWM_API_KEY in .env</span>
      )}
      <span className="text-[6px] text-gray-400">{config.source}</span>
    </div>
  );
};

/**
 * WMS layer rendered via native Leaflet (for NASA FIRMS fire data)
 */
const WMSFireLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const map = useMap();
  const layerRef = useRef<L.TileLayer.WMS | null>(null);

  useEffect(() => {
    const wmsLayer = L.tileLayer.wms(FIRMS_WMS_URL, {
      layers: 'fires_viirs_24',
      format: 'image/png',
      transparent: true,
      opacity,
      attribution: '&copy; <a href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</a>',
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
  }, [map, opacity]);

  return null;
};

/**
 * RainViewer precipitation layer for Leaflet
 * Fetches latest radar frame path and renders as XYZ tile layer.
 */
const RainViewerFloodLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const { tileUrl, isLoading, error } = useRainViewer(true);

  if (isLoading || error || !tileUrl) {
    return null;
  }

  return (
    <TileLayer
      key={tileUrl}
      url={tileUrl}
      attribution='&copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
      opacity={opacity}
      maxZoom={20}
      minZoom={1}
      tileSize={256}
    />
  );
};

/**
 * OWM tile layer (for wind and heat) - only renders when API key is available
 */
const OWMTileLayer: React.FC<{
  layer: 'wind_new' | 'temp_new';
  opacity: number;
}> = ({ layer, opacity }) => {
  if (!OWM_API_KEY) return null;

  const url = `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`;

  return (
    <TileLayer
      url={url}
      attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
      opacity={opacity}
      maxZoom={19}
      minZoom={1}
    />
  );
};

/**
 * AQICN air quality tile layer (free, no key)
 */
const AQICNTileLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <TileLayer
      url="https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://aqicn.org/">AQICN</a>'
      opacity={opacity}
      maxZoom={19}
      minZoom={1}
    />
  );
};

/**
 * Main ClimateRiskLayer Component
 *
 * Renders the appropriate tile layer overlay based on the selected risk type.
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.6 }) => {
  if (riskType === 'none') return null;

  switch (riskType) {
    case 'flood':
      return <RainViewerFloodLayer opacity={opacity} />;
    case 'fire':
      return <WMSFireLayer opacity={opacity} />;
    case 'wind':
      return <OWMTileLayer layer="wind_new" opacity={opacity} />;
    case 'air':
      return <AQICNTileLayer opacity={opacity} />;
    case 'heat':
      return <OWMTileLayer layer="temp_new" opacity={opacity} />;
    default:
      return null;
  }
};

export default ClimateRiskLayer;
