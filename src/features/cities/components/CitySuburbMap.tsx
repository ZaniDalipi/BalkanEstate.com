/**
 * CitySuburbMap
 * Interactive choropleth map showing suburb polygons coloured by avg price/m².
 * Uses React-Leaflet with GeoJSON layers.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import type { SuburbEntry } from '@/src/shared/types/suburb.types';

// Leaflet CSS must be imported before MapContainer
import 'leaflet/dist/leaflet.css';

// Dynamic import guard: these modules must only load in a browser context.
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { Layer, LeafletMouseEvent, GeoJSON as GeoJSONLayer, PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CitySuburbMapProps {
  suburbs: SuburbEntry[];
  cityAvgPricePerSqm: number;
  selectedSuburb: SuburbEntry | null;
  onSuburbSelect: (suburb: SuburbEntry) => void;
}

interface SuburbFeatureProps {
  suburb: SuburbEntry;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

/**
 * Interpolates between two hex colours by a factor t ∈ [0, 1].
 */
function lerpHex(hex1: string, hex2: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const LOW_COLOR = '#93c5fd';  // blue-300
const MID_COLOR = '#fbbf24';  // amber-400
const HIGH_COLOR = '#ef4444'; // red-500

function priceToColor(price: number, minPrice: number, maxPrice: number): string {
  if (maxPrice <= minPrice) return MID_COLOR;
  const t = Math.max(0, Math.min(1, (price - minPrice) / (maxPrice - minPrice)));
  return t < 0.5
    ? lerpHex(LOW_COLOR, MID_COLOR, t * 2)
    : lerpHex(MID_COLOR, HIGH_COLOR, (t - 0.5) * 2);
}

// ─── Map centre helper ────────────────────────────────────────────────────────

function computeCenter(suburbs: SuburbEntry[]): [number, number] {
  if (suburbs.length === 0) return [42, 21];
  const avgLat = suburbs.reduce((s, sub) => s + sub.center.lat, 0) / suburbs.length;
  const avgLng = suburbs.reduce((s, sub) => s + sub.center.lng, 0) / suburbs.length;
  return [avgLat, avgLng];
}

// ─── Component ────────────────────────────────────────────────────────────────

const CitySuburbMap: React.FC<CitySuburbMapProps> = ({
  suburbs,
  cityAvgPricePerSqm,
  selectedSuburb,
  onSuburbSelect,
}) => {
  const layerRef = useRef<GeoJSONLayer | null>(null);

  const prices = useMemo(
    () => suburbs.map((s) => s.stats.avgPricePerSqm),
    [suburbs]
  );
  const minPrice = useMemo(() => Math.min(...prices, cityAvgPricePerSqm * 0.7), [prices, cityAvgPricePerSqm]);
  const maxPrice = useMemo(() => Math.max(...prices, cityAvgPricePerSqm * 1.3), [prices, cityAvgPricePerSqm]);
  const center = useMemo(() => computeCenter(suburbs), [suburbs]);

  // Build a GeoJSON FeatureCollection from suburb entries
  const geoJSON = useMemo<FeatureCollection<Geometry, SuburbFeatureProps>>(() => ({
    type: 'FeatureCollection',
    features: suburbs.map((suburb): Feature<Geometry, SuburbFeatureProps> => ({
      type: 'Feature',
      geometry: suburb.polygon as unknown as Geometry,
      properties: { suburb },
    })),
  }), [suburbs]);

  // Style each polygon
  const styleFeature = useCallback(
    (feature?: Feature<Geometry, SuburbFeatureProps>): PathOptions => {
      if (!feature) return {};
      const suburb = feature.properties.suburb;
      const isSelected = selectedSuburb?.name === suburb.name;
      const color = priceToColor(suburb.stats.avgPricePerSqm, minPrice, maxPrice);
      return {
        fillColor: color,
        fillOpacity: isSelected ? 0.75 : 0.55,
        color: isSelected ? '#ffffff' : '#1e293b',
        weight: isSelected ? 3 : 1,
        opacity: 0.8,
      };
    },
    [selectedSuburb, minPrice, maxPrice]
  );

  // Attach tooltip + click handler to each feature layer
  const onEachFeature = useCallback(
    (feature: Feature<Geometry, SuburbFeatureProps>, layer: Layer) => {
      const suburb = feature.properties.suburb;
      layer.bindTooltip(
        `<div class="font-semibold text-xs">${suburb.name}</div>
         <div class="text-xs text-neutral-500">€${suburb.stats.avgPricePerSqm.toLocaleString()}/m²</div>`,
        { sticky: true, className: 'suburb-tooltip' }
      );
      layer.on('click', () => onSuburbSelect(suburb));
      layer.on('mouseover', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle({ fillOpacity: 0.85, weight: 2 });
      });
      layer.on('mouseout', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle(styleFeature(feature));
      });
    },
    [onSuburbSelect, styleFeature]
  );

  if (suburbs.length === 0) {
    return (
      <div className="h-[450px] flex items-center justify-center bg-neutral-100 rounded-xl">
        <p className="text-neutral-400 text-sm">No suburb data available</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md border border-neutral-100" style={{ height: 450 }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <GeoJSON
          ref={layerRef}
          key={selectedSuburb?.name ?? 'none'}
          data={geoJSON}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-2.5 shadow-md border border-neutral-200 pointer-events-none">
        <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
          Price / m²
        </p>
        <div
          className="w-28 h-2.5 rounded-full"
          style={{
            background: `linear-gradient(to right, ${LOW_COLOR}, ${MID_COLOR}, ${HIGH_COLOR})`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-neutral-500">€{minPrice.toLocaleString()}</span>
          <span className="text-[9px] text-neutral-500">€{maxPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Selected suburb label */}
      {selectedSuburb && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-primary/20 pointer-events-none">
          <p className="text-xs font-bold text-primary">{selectedSuburb.name}</p>
          <p className="text-[10px] text-neutral-500">
            €{selectedSuburb.stats.avgPricePerSqm.toLocaleString()}/m²
          </p>
        </div>
      )}

      {/* Tooltip styles injected via a style tag approach is avoided; using Leaflet's className */}
      <style>{`
        .suburb-tooltip {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          font-family: inherit;
        }
        .suburb-tooltip::before { display: none; }
      `}</style>
    </div>
  );
};

export default CitySuburbMap;
