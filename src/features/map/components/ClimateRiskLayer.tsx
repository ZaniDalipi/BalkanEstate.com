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

import React from 'react';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// Climate risk layer configurations
// Legend-only mode - tile layers require API keys from data providers
// To enable tiles, add your API keys for the respective services
const CLIMATE_RISK_LAYERS: Record<
  Exclude<ClimateRiskType, 'none'>,
  {
    name: string;
    legendTitle: string;
    legendColors: { color: string; label: string }[];
    description: string;
  }
> = {
  flood: {
    name: 'Flood Risk',
    legendTitle: 'Flood zones',
    legendColors: [
      { color: '#cce5ff', label: 'Low' },
      { color: '#66b3ff', label: 'Med' },
      { color: '#3399ff', label: 'High' },
      { color: '#0066cc', label: 'Severe' },
    ],
    description: 'Shows flood risk zones based on historical data',
  },
  fire: {
    name: 'Fire Risk',
    legendTitle: 'Fire risk level',
    legendColors: [
      { color: '#ffeda0', label: 'Minimal' },
      { color: '#feb24c', label: 'Moderate' },
      { color: '#f03b20', label: 'High' },
      { color: '#bd0026', label: 'Extreme' },
    ],
    description: 'Wildfire probability based on conditions',
  },
  wind: {
    name: 'Wind Risk',
    legendTitle: 'Wind speed',
    legendColors: [
      { color: '#e8f4f8', label: 'Calm' },
      { color: '#a6d9e8', label: 'Light' },
      { color: '#5ab4cf', label: 'Mod' },
      { color: '#1a8ab7', label: 'Strong' },
      { color: '#0d5875', label: 'Severe' },
    ],
    description: 'Severe wind and storm damage risk',
  },
  air: {
    name: 'Air Quality',
    legendTitle: 'Air quality',
    legendColors: [
      { color: '#00e400', label: 'Good' },
      { color: '#ffff00', label: 'OK' },
      { color: '#ff7e00', label: 'Poor' },
      { color: '#ff0000', label: 'Bad' },
      { color: '#7e0023', label: 'Hazard' },
    ],
    description: 'Current air quality index',
  },
  heat: {
    name: 'Heat Risk',
    legendTitle: 'Temperature',
    legendColors: [
      { color: '#313695', label: 'Cold' },
      { color: '#74add1', label: 'Cool' },
      { color: '#fee090', label: 'Warm' },
      { color: '#f46d43', label: 'Hot' },
      { color: '#a50026', label: 'Extreme' },
    ],
    description: 'Extreme temperature zones',
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
 * Currently in legend-only mode - tile overlays require API keys
 * The UI/legend is functional, but no map overlays are rendered
 */
const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType }) => {
  // Legend-only mode - no tile overlays rendered
  // To add tile overlays, integrate with a climate data API provider
  return null;
};

export default ClimateRiskLayer;
