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
// Using free WMS/tile services that work without API keys
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
    wmsFormat?: string;
    wmsStyles?: string;
  }
> = {
  // Flood risk - Using EFAS (European Flood Awareness System) WMS from Copernicus
  flood: {
    name: 'Flood Risk',
    url: 'https://efas.smhi.se/wms',
    attribution: '&copy; <a href="https://www.efas.eu/">EFAS/Copernicus</a>',
    legendTitle: 'Flood zones',
    legendColors: [
      { color: '#cce5ff', label: 'Low' },
      { color: '#66b3ff', label: 'Med' },
      { color: '#3399ff', label: 'High' },
      { color: '#0066cc', label: 'Severe' },
    ],
    isWMS: true,
    wmsLayers: 'flood_risk',
    wmsFormat: 'image/png',
  },
  // Fire risk - Using EFFIS (European Forest Fire Information System) WMS
  fire: {
    name: 'Fire Risk',
    url: 'https://maps.effis.emergency.copernicus.eu/wms',
    attribution: '&copy; <a href="https://effis.jrc.ec.europa.eu/">EFFIS/Copernicus</a>',
    legendTitle: 'Fire risk level',
    legendColors: [
      { color: '#ffeda0', label: 'Minimal' },
      { color: '#feb24c', label: 'Moderate' },
      { color: '#f03b20', label: 'High' },
      { color: '#bd0026', label: 'Extreme' },
    ],
    isWMS: true,
    wmsLayers: 'fwi.current',
    wmsFormat: 'image/png',
  },
  // Wind risk - Using RainViewer (free radar/wind tiles)
  wind: {
    name: 'Wind Risk',
    url: 'https://tilecache.rainviewer.com/v2/coverage/0/256/{z}/{x}/{y}/1/1_1.png',
    attribution: '&copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
    legendTitle: 'Wind speed',
    legendColors: [
      { color: '#e8f4f8', label: 'Calm' },
      { color: '#a6d9e8', label: 'Light' },
      { color: '#5ab4cf', label: 'Mod' },
      { color: '#1a8ab7', label: 'Strong' },
      { color: '#0d5875', label: 'Severe' },
    ],
  },
  // Air quality - Using Copernicus Atmosphere Monitoring Service (CAMS)
  air: {
    name: 'Air Quality',
    url: 'https://apps.ecmwf.int/wms/',
    attribution: '&copy; <a href="https://atmosphere.copernicus.eu/">CAMS/Copernicus</a>',
    legendTitle: 'Air quality',
    legendColors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'OK' },
      { color: '#ff7e00', label: 'Poor' },
      { color: '#ff0000', label: 'Bad' },
      { color: '#7e0023', label: 'Hazard' },
    ],
    isWMS: true,
    wmsLayers: 'composition_aod550',
    wmsFormat: 'image/png',
  },
  // Heat risk - Using OpenWeatherMap free 1.0 temperature layer
  heat: {
    name: 'Heat Risk',
    url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=439d4b804bc8187953eb36d2a8c26a02',
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
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.7 }) => {
  const map = useMap();

  // Get layer configuration
  const layerConfig = useMemo(() => {
    if (riskType === 'none') return null;
    return CLIMATE_RISK_LAYERS[riskType];
  }, [riskType]);

  // Layer is available at all zoom levels - no constraints

  if (!layerConfig || riskType === 'none') {
    return null;
  }

  // For WMS layers
  if (layerConfig.isWMS && layerConfig.wmsLayers) {
    return (
      <WMSTileLayer
        url={layerConfig.url}
        layers={layerConfig.wmsLayers}
        format={layerConfig.wmsFormat || 'image/png'}
        transparent={true}
        attribution={layerConfig.attribution}
        opacity={opacity}
        maxZoom={21}
        minZoom={1}
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
      minZoom={1}
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
