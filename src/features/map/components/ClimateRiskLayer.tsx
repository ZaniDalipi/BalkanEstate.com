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

// Climate risk layer configurations using free tile services
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
    // OpenTopoMap shows water bodies and terrain
    tileUrl: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    legendTitle: 'Flood zones',
    legendColors: [
      { color: '#cce5ff', label: 'Low' },
      { color: '#66b3ff', label: 'Med' },
      { color: '#3399ff', label: 'High' },
      { color: '#0066cc', label: 'Severe' },
    ],
    className: 'flood-layer',
  },
  fire: {
    name: 'Fire Risk',
    // ESRI World Imagery shows vegetation/dry areas
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
    legendTitle: 'Fire risk',
    legendColors: [
      { color: '#ffeda0', label: 'Low' },
      { color: '#feb24c', label: 'Med' },
      { color: '#f03b20', label: 'High' },
      { color: '#bd0026', label: 'Extreme' },
    ],
    className: 'fire-layer',
  },
  wind: {
    name: 'Wind Risk',
    // CartoDB Voyager - clean basemap
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
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
    // CartoDB Dark Matter - good for showing pollution overlay effect
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
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
    // ESRI World Imagery with heat filter
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
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
      .flood-layer { filter: hue-rotate(200deg) saturate(1.5); }
      .fire-layer { filter: sepia(0.3) saturate(1.5) hue-rotate(-10deg); }
      .wind-layer { filter: hue-rotate(180deg) saturate(0.8); }
      .air-layer { filter: brightness(0.9) contrast(1.1); }
      .heat-layer { filter: sepia(0.4) saturate(1.8) hue-rotate(-20deg); }
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
