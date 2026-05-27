/**
 * CitySuburbMap
 *
 * Interactive choropleth map for city municipalities/neighbourhoods.
 *
 * Data modes:
 *  • Real GeoJSON boundaries from OpenStreetMap (via Overpass API) when available
 *  • Falls back to AI-generated circle polygons when OSM data isn't cached yet
 *
 * Price modes (toggle):
 *  • "AI Estimate"  — per-suburb prices from BalkanEstate AI model
 *  • "Official Avg" — country-level BIS / World Bank average (if priceHistory provided)
 *
 * Colour scale mirrors kvadrat.house: light peach → orange → dark red.
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import type { SuburbEntry } from '@/src/shared/types/suburb.types';
import type { GeoJSONFeatureCollection } from '../api/suburbApi';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { Layer, LeafletMouseEvent, GeoJSON as GeoJSONLayer, PathOptions, Map as LeafletMap } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CitySuburbMapProps {
  suburbs: SuburbEntry[];
  cityAvgPricePerSqm: number;
  selectedSuburb: SuburbEntry | null;
  onSuburbSelect: (suburb: SuburbEntry | null) => void;
  /** Real GeoJSON boundaries from OpenStreetMap — optional */
  geoData?: GeoJSONFeatureCollection;
  /** Country-level official BIS avg price per m² — optional */
  officialAvgPrice?: number;
  /** Data source label for official price (e.g. "BIS 2024") */
  officialSource?: string;
}

interface FeatureProps {
  suburbName: string | null;   // matched suburb name (for price lookup)
  osmName: string;             // raw OSM name (for display)
  osmNameEn: string | null;    // English OSM name
  pricePerSqm: number | null;  // null = no data
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

// kvadrat.house palette: light peach → orange → dark red
const COLORS = {
  noData: '#d9d9d9',
  low: '#fde8d8',
  mid: '#f0842c',
  high: '#c0392b',
};

function lerpHex(a: string, b: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bv = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

function priceToColor(price: number, min: number, max: number): string {
  if (max <= min) return COLORS.mid;
  const t = Math.max(0, Math.min(1, (price - min) / (max - min)));
  return t < 0.5 ? lerpHex(COLORS.low, COLORS.mid, t * 2) : lerpHex(COLORS.mid, COLORS.high, (t - 0.5) * 2);
}

// ─── Name matching (OSM local name ↔ suburb name) ────────────────────────────

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchSuburb(candidates: Array<string | null | undefined>, suburbs: SuburbEntry[]): SuburbEntry | undefined {
  const validCandidates = candidates.filter(Boolean) as string[];
  for (const candidate of validCandidates) {
    const normCandidate = normalizeForMatch(candidate);
    const match = suburbs.find(s => {
      const normSub = normalizeForMatch(s.name);
      return normSub === normCandidate
        || normSub.includes(normCandidate)
        || normCandidate.includes(normSub);
    });
    if (match) return match;
  }
  return undefined;
}

// ─── Map bounds helper ────────────────────────────────────────────────────────

function computeCenter(suburbs: SuburbEntry[]): [number, number] {
  if (suburbs.length === 0) return [42, 21];
  return [
    suburbs.reduce((s, x) => s + x.center.lat, 0) / suburbs.length,
    suburbs.reduce((s, x) => s + x.center.lng, 0) / suburbs.length,
  ];
}

// Fit map to GeoJSON bounds after it renders
function FitBounds({ geoData }: { geoData?: GeoJSONFeatureCollection }) {
  const map = useMap() as LeafletMap;
  React.useEffect(() => {
    if (!geoData || geoData.features.length === 0) return;
    try {
      const L = (window as unknown as { L: { geoJSON: (d: unknown) => { getBounds: () => unknown } } }).L;
      if (L) {
        const layer = L.geoJSON(geoData);
        const bounds = layer.getBounds();
        if (bounds) (map as unknown as { fitBounds: (b: unknown, o: unknown) => void }).fitBounds(bounds, { padding: [20, 20] });
      }
    } catch {
      // ignore
    }
  }, [geoData, map]);
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CitySuburbMap: React.FC<CitySuburbMapProps> = ({
  suburbs,
  cityAvgPricePerSqm,
  selectedSuburb,
  onSuburbSelect,
  geoData,
  officialAvgPrice,
  officialSource = 'BIS',
}) => {
  const layerRef = useRef<GeoJSONLayer | null>(null);
  const [priceMode, setPriceMode] = useState<'ai' | 'official'>('ai');

  const hasOfficialData = officialAvgPrice != null && officialAvgPrice > 0;

  // When priceMode is 'official' we use a flat country-level reference price.
  // Suburbs are still colored relative to the official avg (±30% range for visual variation).
  const effectiveSuburbs = useMemo(() => {
    if (priceMode === 'official' && hasOfficialData) {
      return suburbs.map(s => ({
        ...s,
        stats: { ...s.stats, avgPricePerSqm: officialAvgPrice! },
      }));
    }
    return suburbs;
  }, [suburbs, priceMode, hasOfficialData, officialAvgPrice]);

  const prices = useMemo(() => effectiveSuburbs.map(s => s.stats.avgPricePerSqm), [effectiveSuburbs]);
  const minPrice = useMemo(() => Math.min(...prices, cityAvgPricePerSqm * 0.7), [prices, cityAvgPricePerSqm]);
  const maxPrice = useMemo(() => Math.max(...prices, cityAvgPricePerSqm * 1.3), [prices, cityAvgPricePerSqm]);
  const center = useMemo(() => computeCenter(suburbs), [suburbs]);

  // ── Real GeoJSON mode ──────────────────────────────────────────────────────

  const enrichedGeoJSON = useMemo<FeatureCollection<Geometry, FeatureProps> | null>(() => {
    if (!geoData || geoData.features.length === 0) return null;

    const features = geoData.features.map(f => {
      const osmName = (f.properties.name as string) ?? '';
      const osmNameEn = (f.properties.name_en as string | null) ?? null;
      const matched = matchSuburb([osmNameEn, osmName], effectiveSuburbs);
      return {
        type: 'Feature' as const,
        id: f.id,
        geometry: f.geometry as unknown as Geometry,
        properties: {
          suburbName: matched?.name ?? null,
          osmName,
          osmNameEn,
          pricePerSqm: matched?.stats.avgPricePerSqm ?? null,
        } satisfies FeatureProps,
      };
    });
    return { type: 'FeatureCollection', features };
  }, [geoData, effectiveSuburbs]);

  const styleGeoFeature = useCallback(
    (feature?: Feature<Geometry, FeatureProps>): PathOptions => {
      if (!feature) return {};
      const { pricePerSqm, suburbName } = feature.properties;
      const isSelected = selectedSuburb?.name === suburbName;
      const fill = pricePerSqm != null
        ? priceToColor(pricePerSqm, minPrice, maxPrice)
        : COLORS.noData;
      return {
        fillColor: fill,
        fillOpacity: isSelected ? 0.85 : pricePerSqm != null ? 0.70 : 0.35,
        color: isSelected ? '#000000' : '#ffffff',
        weight: isSelected ? 2.5 : 1,
        opacity: 0.9,
      };
    },
    [selectedSuburb, minPrice, maxPrice]
  );

  const onEachGeoFeature = useCallback(
    (feature: Feature<Geometry, FeatureProps>, layer: Layer) => {
      const { osmName, osmNameEn, pricePerSqm, suburbName } = feature.properties;
      const displayName = osmNameEn ?? osmName;
      const priceLabel = pricePerSqm != null ? `€${pricePerSqm.toLocaleString()}/m²` : 'No data';
      const sourceLabel = priceMode === 'official' && hasOfficialData ? `${officialSource} avg` : 'AI estimate';

      layer.bindTooltip(
        `<div style="font-weight:700;font-size:12px;margin-bottom:2px">${displayName}</div>
         <div style="font-size:11px;color:#555">${priceLabel}</div>
         <div style="font-size:9px;color:#999;margin-top:2px">${sourceLabel}</div>`,
        { sticky: true, className: 'suburb-tooltip' }
      );

      // Permanent label on the polygon
      layer.bindTooltip(displayName, {
        permanent: true,
        direction: 'center',
        className: 'municipality-label',
        offset: [0, 0],
      });

      layer.on('click', () => {
        const matched = suburbName ? suburbs.find(s => s.name === suburbName) ?? null : null;
        onSuburbSelect(matched);
      });
      layer.on('mouseover', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle({
          fillOpacity: 0.9,
          weight: 2.5,
          color: '#333',
        });
      });
      layer.on('mouseout', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle(styleGeoFeature(feature));
      });
    },
    [onSuburbSelect, styleGeoFeature, suburbs, priceMode, hasOfficialData, officialSource]
  );

  // ── Circle polygon fallback mode ───────────────────────────────────────────

  interface SuburbFeatureProps { suburb: SuburbEntry }

  const circleGeoJSON = useMemo<FeatureCollection<Geometry, SuburbFeatureProps>>(() => ({
    type: 'FeatureCollection',
    features: effectiveSuburbs.map(s => ({
      type: 'Feature',
      geometry: s.polygon as unknown as Geometry,
      properties: { suburb: s },
    })),
  }), [effectiveSuburbs]);

  const styleCircle = useCallback(
    (feature?: Feature<Geometry, SuburbFeatureProps>): PathOptions => {
      if (!feature) return {};
      const s = feature.properties.suburb;
      const isSelected = selectedSuburb?.name === s.name;
      return {
        fillColor: priceToColor(s.stats.avgPricePerSqm, minPrice, maxPrice),
        fillOpacity: isSelected ? 0.85 : 0.65,
        color: isSelected ? '#000' : '#fff',
        weight: isSelected ? 2.5 : 1,
        opacity: 0.9,
      };
    },
    [selectedSuburb, minPrice, maxPrice]
  );

  const onEachCircle = useCallback(
    (feature: Feature<Geometry, SuburbFeatureProps>, layer: Layer) => {
      const s = feature.properties.suburb;
      layer.bindTooltip(
        `<div style="font-weight:700;font-size:12px">${s.name}</div>
         <div style="font-size:11px;color:#555">€${s.stats.avgPricePerSqm.toLocaleString()}/m²</div>
         <div style="font-size:9px;color:#999">AI estimate</div>`,
        { sticky: true, className: 'suburb-tooltip' }
      );
      layer.on('click', () => onSuburbSelect(s));
      layer.on('mouseover', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle({ fillOpacity: 0.9 });
      });
      layer.on('mouseout', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle(styleCircle(feature));
      });
    },
    [onSuburbSelect, styleCircle]
  );

  if (suburbs.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-neutral-100 rounded-xl">
        <p className="text-neutral-400 text-sm">No suburb data available</p>
      </div>
    );
  }

  const usingRealBoundaries = enrichedGeoJSON != null && enrichedGeoJSON.features.length > 0;

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md border border-neutral-100" style={{ height: 500 }}>

      {/* Price mode toggle */}
      {hasOfficialData && (
        <div className="absolute top-3 left-3 z-[1000] flex gap-1 bg-white/95 backdrop-blur-sm rounded-lg p-1 shadow border border-neutral-200 text-[11px] font-semibold">
          <button
            onClick={() => setPriceMode('ai')}
            className={`px-2.5 py-1 rounded-md transition-colors ${priceMode === 'ai' ? 'bg-violet-600 text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            AI Estimate
          </button>
          <button
            onClick={() => setPriceMode('official')}
            className={`px-2.5 py-1 rounded-md transition-colors ${priceMode === 'official' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {officialSource}
          </button>
        </div>
      )}

      {/* Boundary source badge */}
      <div className="absolute top-3 right-3 z-[1000]">
        <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${usingRealBoundaries ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
          {usingRealBoundaries ? '📍 OSM boundaries' : '⬤ AI circles'}
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Minimalist tile layer (like kvadrat.house) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {usingRealBoundaries ? (
          <GeoJSON
            ref={layerRef}
            key={`geo-${selectedSuburb?.name ?? 'none'}-${priceMode}`}
            data={enrichedGeoJSON as unknown as FeatureCollection}
            style={styleGeoFeature as unknown as (f?: Feature<Geometry, Record<string, unknown>>) => PathOptions}
            onEachFeature={onEachGeoFeature as unknown as (f: Feature<Geometry, Record<string, unknown>>, l: Layer) => void}
          />
        ) : (
          <GeoJSON
            ref={layerRef}
            key={`circle-${selectedSuburb?.name ?? 'none'}-${priceMode}`}
            data={circleGeoJSON as unknown as FeatureCollection}
            style={styleCircle as unknown as (f?: Feature<Geometry, Record<string, unknown>>) => PathOptions}
            onEachFeature={onEachCircle as unknown as (f: Feature<Geometry, Record<string, unknown>>, l: Layer) => void}
          />
        )}

        <FitBounds geoData={usingRealBoundaries ? geoData : undefined} />
      </MapContainer>

      {/* Legend — kvadrat.house style */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow border border-neutral-200 pointer-events-none">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            €/m² — {priceMode === 'official' ? `${officialSource} avg` : 'AI estimate'}
          </span>
        </div>
        <div
          className="w-32 h-3 rounded-full"
          style={{ background: `linear-gradient(to right, ${COLORS.low}, ${COLORS.mid}, ${COLORS.high})` }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-neutral-500">€{minPrice.toLocaleString()}</span>
          <span className="text-[9px] text-neutral-500">€{maxPrice.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="w-4 h-3 rounded-sm" style={{ background: COLORS.noData }} />
          <span className="text-[9px] text-neutral-400">No data</span>
        </div>
      </div>

      {/* Selected suburb badge */}
      {selectedSuburb && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow border border-neutral-200 pointer-events-none">
          <p className="text-xs font-bold text-neutral-900">{selectedSuburb.name}</p>
          <p className="text-[11px] text-orange-600 font-semibold">
            €{selectedSuburb.stats.avgPricePerSqm.toLocaleString()}/m²
          </p>
        </div>
      )}

      <style>{`
        .suburb-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          font-family: inherit !important;
        }
        .suburb-tooltip::before { display: none !important; }
        .municipality-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: rgba(0,0,0,0.7) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-shadow: 0 1px 3px rgba(255,255,255,0.9), 0 -1px 3px rgba(255,255,255,0.9),
                       1px 0 3px rgba(255,255,255,0.9), -1px 0 3px rgba(255,255,255,0.9) !important;
          pointer-events: none !important;
        }
        .municipality-label::before { display: none !important; }
      `}</style>
    </div>
  );
};

export default CitySuburbMap;
