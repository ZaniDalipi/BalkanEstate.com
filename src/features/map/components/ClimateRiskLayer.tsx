/**
 * ClimateRiskLayer Component (Leaflet)
 *
 * Displays climate risk overlays on the Leaflet map using free, working data sources:
 *   - Flood: RainViewer precipitation radar (free, no API key)
 *   - Fire:  EFFIS Copernicus VIIRS active fire detections via WMS (free, no API key)
 *   - Wind:  OWM tiles if key set, otherwise Open-Meteo grid (free, no API key)
 *   - Air:   AQICN EPA air quality index tiles (free, no API key)
 *   - Heat:  OWM tiles if key set, otherwise Open-Meteo grid via leaflet.heat (free)
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useRainViewer } from '../hooks/useRainViewer';
import { useOpenMeteoGrid, type MapBounds } from '../hooks/useOpenMeteoGrid';

export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

interface ClimateRiskLayerProps {
  riskType: ClimateRiskType;
  opacity?: number;
}

// OpenWeatherMap API key from environment
const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

// EFFIS Copernicus WMS endpoint (free, no API key needed, global fire data)
const EFFIS_WMS_URL = 'https://maps.effis.emergency.copernicus.eu/effis';

interface LegendItem {
  color: string;
  label: string;
}

interface LayerLegendConfig {
  legendTitle: string;
  legendColors: LegendItem[];
  source: string;
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
    source: 'EFFIS Copernicus',
    legendColors: [
      { color: '#ffe082', label: 'Low FRP' },
      { color: '#ff9800', label: 'Medium' },
      { color: '#f44336', label: 'High' },
      { color: '#b71c1c', label: 'Intense' },
    ],
  },
  wind: {
    legendTitle: 'Wind Speed',
    source: OWM_API_KEY ? 'OpenWeatherMap' : 'Open-Meteo',
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
    source: OWM_API_KEY ? 'OpenWeatherMap' : 'Open-Meteo',
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
      <span className="text-[6px] text-gray-400">{config.source}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helper: extract current Leaflet map bounds as MapBounds
// ---------------------------------------------------------------------------
function useMapBounds(): MapBounds | null {
  const map = useMap();
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  useEffect(() => {
    const update = () => {
      const b = map.getBounds();
      setBounds({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };
    update();
    map.on('moveend', update);
    return () => { map.off('moveend', update); };
  }, [map]);

  return bounds;
}

// ---------------------------------------------------------------------------
// Layer sub-components
// ---------------------------------------------------------------------------

/**
 * WMS layer rendered via native Leaflet (for EFFIS Copernicus fire data)
 */
const WMSFireLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const map = useMap();
  const layerRef = useRef<L.TileLayer.WMS | null>(null);

  useEffect(() => {
    const wmsLayer = L.tileLayer.wms(EFFIS_WMS_URL, {
      layers: 'viirs.crt.firms',
      format: 'image/png',
      transparent: true,
      opacity,
      attribution: '&copy; <a href="https://effis.jrc.ec.europa.eu/">EFFIS Copernicus</a>',
      version: '1.3.0',
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
 */
const RainViewerFloodLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const { tileUrl, isLoading, error } = useRainViewer(true);

  if (isLoading || error || !tileUrl) return null;

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
 * OWM tile layer (for wind and heat) - only when API key present
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
const AQICNTileLayer: React.FC<{ opacity: number }> = ({ opacity }) => (
  <TileLayer
    url="https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://aqicn.org/">AQICN</a>'
    opacity={opacity}
    maxZoom={19}
    minZoom={1}
  />
);

// ---------------------------------------------------------------------------
// Open-Meteo powered fallback layers (no API key needed)
// ---------------------------------------------------------------------------

/**
 * Temperature overlay using Open-Meteo + leaflet.heat
 * Creates a smooth gradient from grid point temperatures.
 */
const OpenMeteoHeatLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const map = useMap();
  const bounds = useMapBounds();
  const { data } = useOpenMeteoGrid(bounds, 'temperature');
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    // Clean up previous
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!data.length) return;

    // Map temperature to 0-1 intensity (-20°C → 0, 45°C → 1)
    const heatData = data
      .filter(p => p.temperature != null)
      .map(p => [
        p.lat,
        p.lng,
        Math.max(0, Math.min(1, (p.temperature! + 20) / 65)),
      ] as [number, number, number]);

    const heat = L.heatLayer(heatData, {
      radius: 55,
      blur: 45,
      maxZoom: 18,
      max: 1,
      minOpacity: opacity * 0.6,
      gradient: {
        0.0: '#313695',   // ≤-20 °C  deep blue
        0.15: '#4575b4',  // ~-10 °C
        0.3: '#74add1',   //   0 °C   light blue
        0.4: '#abd9e9',   //   6 °C
        0.5: '#fee090',   //  12 °C   yellow
        0.6: '#fdae61',   //  19 °C   orange
        0.75: '#f46d43',  //  29 °C   red-orange
        0.85: '#d73027',  //  35 °C   red
        1.0: '#a50026',   //  45 °C   dark red
      },
    });

    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, data, opacity]);

  return null;
};

/**
 * Wind overlay using Open-Meteo data.
 * Renders wind arrows at grid points colored by speed.
 */
const OpenMeteoWindLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  const map = useMap();
  const bounds = useMapBounds();
  const { data } = useOpenMeteoGrid(bounds, 'wind');
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    if (!data.length) return;

    const group = L.layerGroup();

    data.forEach(point => {
      if (point.windSpeed == null || point.windDirection == null) return;

      const speed = point.windSpeed; // km/h
      const dir = point.windDirection; // degrees

      // Color by wind speed: calm → light blue, strong → dark blue
      let color: string;
      if (speed < 5) color = '#b3e0ff';
      else if (speed < 15) color = '#66c2ff';
      else if (speed < 30) color = '#3399ff';
      else if (speed < 50) color = '#0066cc';
      else color = '#003366';

      // Arrow size scales with speed (min 14, max 28)
      const arrowSize = Math.min(28, Math.max(14, 12 + speed * 0.35));

      const icon = L.divIcon({
        className: '',
        iconSize: [arrowSize, arrowSize],
        iconAnchor: [arrowSize / 2, arrowSize / 2],
        html: `<svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 24 24"
                    style="transform:rotate(${dir}deg);opacity:${opacity}"
                    xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 2 L8 14 L12 11 L16 14 Z"
                       fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>
               </svg>`,
      });

      L.marker([point.lat, point.lng], { icon, interactive: false }).addTo(group);
    });

    group.addTo(map);
    markersRef.current = group;

    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
        markersRef.current = null;
      }
    };
  }, [map, data, opacity]);

  return null;
};

// ---------------------------------------------------------------------------
// Wind / Heat wrapper: OWM tiles if key exists, else Open-Meteo fallback
// ---------------------------------------------------------------------------

const WindLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  if (OWM_API_KEY) return <OWMTileLayer layer="wind_new" opacity={opacity} />;
  return <OpenMeteoWindLayer opacity={opacity} />;
};

const HeatLayer: React.FC<{ opacity: number }> = ({ opacity }) => {
  if (OWM_API_KEY) return <OWMTileLayer layer="temp_new" opacity={opacity} />;
  return <OpenMeteoHeatLayer opacity={opacity} />;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const ClimateRiskLayer: React.FC<ClimateRiskLayerProps> = ({ riskType, opacity = 0.6 }) => {
  if (riskType === 'none') return null;

  switch (riskType) {
    case 'flood':
      return <RainViewerFloodLayer opacity={opacity} />;
    case 'fire':
      return <WMSFireLayer opacity={opacity} />;
    case 'wind':
      return <WindLayer opacity={opacity} />;
    case 'air':
      return <AQICNTileLayer opacity={opacity} />;
    case 'heat':
      return <HeatLayer opacity={opacity} />;
    default:
      return null;
  }
};

export default ClimateRiskLayer;
