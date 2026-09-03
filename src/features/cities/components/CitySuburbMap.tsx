/**
 * CitySuburbMap
 *
 * Interactive neighbourhood map.
 * • Default view: each district gets a distinct palette color
 * • Official toggle: switches to choropleth (low→high price heat scale)
 * • Name + price labels on every polygon big enough to hold one
 *
 * Shapes come from OpenStreetMap, in two nested layers (see `selectBoundarySet`
 * in `backend/src/services/geoDataService.ts`): a base partition of the city —
 * its administrative districts — with the named neighbourhoods that sit inside
 * them drawn on top. Both are shown at once, because they are a hierarchy
 * rather than two rival partitions of the same ground; showing only one is what
 * used to leave most of a city's neighbourhoods off the map.
 *
 * Where a city has no mapped areas at all, the fallback is a nearest-centre
 * partition (`districtTessellation`) rather than a circle per neighbourhood:
 * contiguous districts read as a map, overlapping bubbles hide each other and
 * their labels. The badge says which of the two is on screen.
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import type { SuburbEntry } from '@/src/shared/types/suburb.types';
import type { GeoJSONFeatureCollection } from '../api/suburbApi';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type {
  Layer,
  LeafletMouseEvent,
  GeoJSON as GeoJSONLayer,
  PathOptions,
  Map as LeafletMap,
} from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { getTileLayer } from '@/config/mapStyles';
import { tessellateDistricts } from '../utils/districtTessellation';
import { splitBoundaryLayers, type BoundaryLayer } from '../utils/boundaryLayers';
import MapLabelDensity, { HIDDEN_LABEL_CLASS } from './MapLabelDensity';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CitySuburbMapProps {
  suburbs: SuburbEntry[];
  cityAvgPricePerSqm: number;
  selectedSuburb: SuburbEntry | null;
  onSuburbSelect: (suburb: SuburbEntry | null) => void;
  geoData?: GeoJSONFeatureCollection;
  officialAvgPrice?: number;
  officialSource?: string;
}

interface FeatureProps {
  suburbName: string | null;
  osmName: string;
  osmNameEn: string | null;
  pricePerSqm: number | null;
  featureIndex: number;
  layer: BoundaryLayer;
}

interface SuburbFeatureProps {
  suburb: SuburbEntry;
  featureIndex: number;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

// 15 distinct, vibrant but not garish municipality colours
const PALETTE = [
  '#e05c5c', '#e8773a', '#d4a012', '#4fa87a', '#3d9db5',
  '#5b6dd4', '#9655c7', '#c7407a', '#3ab5a8', '#a87d3a',
  '#6c5ce7', '#00897b', '#e67e22', '#8e44ad', '#2980b9',
];

// Choropleth scale for official price mode (mirrors kvadrat.house)
const CHORO = { low: '#fde8d8', mid: '#f0842c', high: '#c0392b', noData: '#d9d9d9' };

/**
 * The nested layer is drawn on top of the districts, so it is deliberately
 * quieter: a light wash and a dark outline read as "an area inside this
 * district" rather than as a competing block of colour.
 */
const NEIGHBOURHOOD_STYLE = {
  fill: '#ffffff',
  fillOpacity: 0.22,
  outline: '#37415199',
} as const;

function lerpHex(a: string, b: string, t: number): string {
  const p = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return (
    '#' +
    Math.round(r1 + (r2 - r1) * t).toString(16).padStart(2, '0') +
    Math.round(g1 + (g2 - g1) * t).toString(16).padStart(2, '0') +
    Math.round(b1 + (b2 - b1) * t).toString(16).padStart(2, '0')
  );
}

function priceToColor(price: number, min: number, max: number): string {
  if (max <= min) return CHORO.mid;
  const t = Math.max(0, Math.min(1, (price - min) / (max - min)));
  return t < 0.5
    ? lerpHex(CHORO.low, CHORO.mid, t * 2)
    : lerpHex(CHORO.mid, CHORO.high, (t - 0.5) * 2);
}

// ─── Name matching (OSM ↔ suburb list) ───────────────────────────────────────

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchSuburb(
  candidates: Array<string | null | undefined>,
  suburbs: SuburbEntry[]
): SuburbEntry | undefined {
  for (const c of candidates.filter(Boolean) as string[]) {
    const nc = normalizeForMatch(c);
    const m = suburbs.find(s => {
      const ns = normalizeForMatch(s.name);
      return ns === nc || ns.includes(nc) || nc.includes(ns);
    });
    if (m) return m;
  }
}

// ─── Geographic point-in-polygon matching ────────────────────────────────────

function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  // GeoJSON rings: [lon, lat] pairs
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][1], yj = ring[j][1];
    const xi = ring[i][0], xj = ring[j][0];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function suburbCenterInGeometry(s: SuburbEntry, geometry: Geometry): boolean {
  const { lat, lng } = s.center;
  if (geometry.type === 'Polygon') {
    return pointInRing(lat, lng, (geometry.coordinates as number[][][])[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).some(poly =>
      pointInRing(lat, lng, poly[0])
    );
  }
  return false;
}

function matchSuburbByGeography(
  geometry: Geometry,
  suburbs: SuburbEntry[]
): SuburbEntry | undefined {
  return suburbs.find(s => suburbCenterInGeometry(s, geometry));
}

// ─── FitBounds helper ─────────────────────────────────────────────────────────

function FitBounds({ geoData }: { geoData?: { features: unknown[] } }) {
  const map = useMap() as LeafletMap;
  React.useEffect(() => {
    if (!geoData?.features.length) return;
    try {
      const LLib = (
        window as unknown as {
          L: { geoJSON: (d: unknown) => { getBounds: () => unknown } };
        }
      ).L;
      if (LLib) {
        const bounds = LLib.geoJSON(geoData).getBounds();
        if (bounds)
          (
            map as unknown as {
              fitBounds: (b: unknown, o: unknown) => void;
            }
          ).fitBounds(bounds, { padding: [24, 24] });
      }
    } catch {
      // ignore
    }
  }, [geoData, map]);
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeCenter(suburbs: SuburbEntry[]): [number, number] {
  if (!suburbs.length) return [42, 21];
  return [
    suburbs.reduce((s, x) => s + x.center.lat, 0) / suburbs.length,
    suburbs.reduce((s, x) => s + x.center.lng, 0) / suburbs.length,
  ];
}

function isNonLatin(s: string): boolean {
  return /[^\u0000-\u024f]/.test(s); // anything beyond Latin Extended-B
}

function labelHtml(localName: string, nameEn: string | null, price: number | null): string {
  // Show local name as primary — this is how residents call their neighborhood.
  // If local name uses non-Latin script (Cyrillic, Greek…) also show the Latin
  // transliteration as a subtitle so non-local users can read it too.
  const showSub = nameEn && nameEn !== localName && isNonLatin(localName);
  const subStr = showSub
    ? `<div class="mlabel-sub">${nameEn}</div>`
    : '';
  const priceStr =
    price != null
      ? `<div class="mlabel-price">€${price.toLocaleString()}/m²</div>`
      : '';
  return `<div class="mlabel-name">${localName || nameEn || ''}</div>${subStr}${priceStr}`;
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
  const districtLayerRef = useRef<GeoJSONLayer | null>(null);
  const neighbourhoodLayerRef = useRef<GeoJSONLayer | null>(null);
  const fallbackLayerRef = useRef<GeoJSONLayer | null>(null);
  const [priceMode, setPriceMode] = useState<'ai' | 'official'>('ai');

  // Label-free light base: the polygons carry the labels here. Resolved through
  // the shared config so a missing provider key falls back to a keyless tile
  // source instead of an "API KEY REQUIRED" watermark.
  const choroplethBase = getTileLayer('choropleth');

  const hasOfficialData = officialAvgPrice != null && officialAvgPrice > 0;

  const effectiveSuburbs = useMemo(() => {
    if (priceMode === 'official' && hasOfficialData) {
      return suburbs.map(s => ({
        ...s,
        stats: { ...s.stats, avgPricePerSqm: officialAvgPrice! },
      }));
    }
    return suburbs;
  }, [suburbs, priceMode, hasOfficialData, officialAvgPrice]);

  const prices = useMemo(
    () => effectiveSuburbs.map(s => s.stats.avgPricePerSqm),
    [effectiveSuburbs]
  );
  const minPrice = useMemo(
    () => Math.min(...prices, cityAvgPricePerSqm * 0.7),
    [prices, cityAvgPricePerSqm]
  );
  const maxPrice = useMemo(
    () => Math.max(...prices, cityAvgPricePerSqm * 1.3),
    [prices, cityAvgPricePerSqm]
  );
  const center = useMemo(() => computeCenter(suburbs), [suburbs]);

  // ── GeoJSON (real boundaries, two nested layers) ──────────────────────────

  const layers = useMemo(
    () =>
      splitBoundaryLayers<FeatureProps>(geoData, (f, layer, indexInLayer) => {
        const osmName = (f.properties.name as string) ?? '';
        const osmNameEn = (f.properties.name_en as string | null) ?? null;
        // Try name matching first; fall back to geographic containment test
        const matched =
          matchSuburb([osmNameEn, osmName], effectiveSuburbs) ??
          matchSuburbByGeography(f.geometry as unknown as Geometry, effectiveSuburbs);
        return {
          suburbName: matched?.name ?? null,
          osmName,
          osmNameEn,
          pricePerSqm: matched?.stats.avgPricePerSqm ?? null,
          featureIndex: indexInLayer,
          layer,
        };
      }),
    [geoData, effectiveSuburbs]
  );

  const fillForGeo = useCallback(
    (featureIndex: number, pricePerSqm: number | null, layer: BoundaryLayer): string => {
      // A nested area is a wash over its district's colour, not a colour of its
      // own — except in price mode, where its own price is the whole point.
      if (priceMode === 'official' && hasOfficialData) {
        return pricePerSqm != null
          ? priceToColor(pricePerSqm, minPrice, maxPrice)
          : layer === 'neighbourhood' ? NEIGHBOURHOOD_STYLE.fill : CHORO.noData;
      }
      return layer === 'neighbourhood'
        ? NEIGHBOURHOOD_STYLE.fill
        : PALETTE[featureIndex % PALETTE.length];
    },
    [priceMode, hasOfficialData, minPrice, maxPrice]
  );

  const restingStyle = useCallback(
    (props: FeatureProps): PathOptions => {
      const { pricePerSqm, suburbName, featureIndex, layer } = props;
      const isSelected = suburbName != null && selectedSuburb?.name === suburbName;
      const nested = layer === 'neighbourhood';
      const hasOwnPrice = priceMode === 'official' && hasOfficialData && pricePerSqm != null;

      return {
        fillColor: fillForGeo(featureIndex, pricePerSqm, layer),
        fillOpacity: isSelected
          ? 0.92
          : nested && !hasOwnPrice
            ? NEIGHBOURHOOD_STYLE.fillOpacity
            : 0.7,
        color: isSelected
          ? '#1a1a1a'
          : nested
            ? NEIGHBOURHOOD_STYLE.outline
            : 'rgba(255,255,255,0.85)',
        weight: isSelected ? 3 : nested ? 1 : 1.5,
        // Dashed nested outlines: a solid one at this weight reads as another
        // district boundary, which is the one thing it must not look like.
        ...(nested && !isSelected ? { dashArray: '3 3' } : {}),
        opacity: 1,
      };
    },
    [selectedSuburb, fillForGeo, priceMode, hasOfficialData]
  );

  const styleGeoFeature = useCallback(
    (feature?: Feature<Geometry, FeatureProps>): PathOptions =>
      feature ? restingStyle(feature.properties) : {},
    [restingStyle]
  );

  const onEachGeoFeature = useCallback(
    (feature: Feature<Geometry, FeatureProps>, layer: Layer) => {
      const props = feature.properties;
      const { osmName, osmNameEn, pricePerSqm, suburbName } = props;

      // Show suburb name (e.g. "Blloku") when matched; fall back to OSM name
      const displayName = suburbName ?? osmName;
      const displaySubtitle = suburbName ? null : osmNameEn;

      // Permanent label — hidden by MapLabelDensity while this shape is too
      // small on screen to hold it, shown again as the reader zooms in.
      layer.bindTooltip(labelHtml(displayName, displaySubtitle, pricePerSqm), {
        permanent: true,
        direction: 'center',
        className: `municipality-label${props.layer === 'neighbourhood' ? ' municipality-label--nested' : ''}`,
      });

      layer.on('click', () => {
        const matched = suburbName ? suburbs.find(s => s.name === suburbName) ?? null : null;
        onSuburbSelect(matched);
      });

      layer.on('mouseover', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle({
          fillOpacity: 0.95,
          weight: 3,
          color: '#1a1a1a',
          dashArray: '',
        });
      });

      layer.on('mouseout', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle({ dashArray: '', ...restingStyle(props) });
      });
    },
    [onSuburbSelect, suburbs, restingStyle]
  );

  // ── Approximate districts (no OSM area for these neighbourhoods) ─────────

  // Nearest-centre partition of the city: contiguous, non-overlapping areas
  // that carry their own label. Recomputed only when the centres change —
  // prices do not move a boundary.
  const districtGeoJSON = useMemo<FeatureCollection<Geometry, SuburbFeatureProps>>(() => {
    const cells = tessellateDistricts(
      effectiveSuburbs.map((suburb, featureIndex) => ({
        center: suburb.center,
        payload: { suburb, featureIndex },
      })),
    );

    return {
      type: 'FeatureCollection',
      features: cells.map(cell => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon', coordinates: [cell.ring] } as Geometry,
        properties: cell.payload,
      })),
    };
  }, [effectiveSuburbs]);

  const styleDistrict = useCallback(
    (feature?: Feature<Geometry, SuburbFeatureProps>): PathOptions => {
      if (!feature) return {};
      const { suburb, featureIndex } = feature.properties;
      const isSelected = selectedSuburb?.name === suburb.name;
      const fill =
        priceMode === 'official' && hasOfficialData
          ? priceToColor(suburb.stats.avgPricePerSqm, minPrice, maxPrice)
          : PALETTE[featureIndex % PALETTE.length];
      return {
        fillColor: fill,
        fillOpacity: isSelected ? 0.85 : 0.6,
        color: isSelected ? '#1a1a1a' : 'rgba(255,255,255,0.9)',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
      };
    },
    [selectedSuburb, minPrice, maxPrice, priceMode, hasOfficialData]
  );

  const onEachDistrict = useCallback(
    (feature: Feature<Geometry, SuburbFeatureProps>, layer: Layer) => {
      const { suburb } = feature.properties;
      layer.bindTooltip(labelHtml(suburb.name, null, suburb.stats.avgPricePerSqm), {
        permanent: true,
        direction: 'center',
        className: 'municipality-label',
      });
      layer.on('click', () => onSuburbSelect(suburb));
      layer.on('mouseover', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle({ fillOpacity: 0.9, weight: 3, color: '#1a1a1a' });
      });
      layer.on('mouseout', (e: LeafletMouseEvent) => {
        (e.target as GeoJSONLayer).setStyle(styleDistrict(feature));
      });
    },
    [onSuburbSelect, styleDistrict]
  );

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!suburbs.length) {
    return (
      <div className="h-[420px] sm:h-[520px] md:h-[620px] lg:h-[760px] flex items-center justify-center bg-neutral-100 rounded-xl">
        <p className="text-neutral-400 text-sm">No suburb data available</p>
      </div>
    );
  }

  const usingRealBoundaries = layers.total > 0;
  const hasNested = layers.neighbourhoods.features.length > 0;
  // A rebuild of either layer needs a fresh label pass, and both are keyed on
  // the same inputs, so one revision string covers them.
  const layerRevision = `${layers.total}-${priceMode}-${selectedSuburb?.name ?? 'none'}`;

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-md border border-neutral-100 h-[420px] sm:h-[520px] md:h-[620px] lg:h-[760px]"
    >
      {/* Price-mode toggle */}
      {hasOfficialData && (
        <div className="absolute top-3 left-3 z-[1000] flex gap-1 bg-white/95 backdrop-blur-sm rounded-lg p-1 shadow border border-neutral-200 text-[11px] font-semibold">
          <button
            onClick={() => setPriceMode('ai')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              priceMode === 'ai'
                ? 'bg-violet-600 text-white'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Estimate
          </button>
          <button
            onClick={() => setPriceMode('official')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              priceMode === 'official'
                ? 'bg-blue-600 text-white'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {officialSource}
          </button>
        </div>
      )}

      {/* Boundary source badge — what is on screen, and how much of it */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-1">
        <span
          className={`text-[9px] font-bold px-2 py-1 rounded-full ${
            usingRealBoundaries
              ? 'bg-blue-100 text-blue-700'
              : 'bg-violet-100 text-violet-700'
          }`}
        >
          {usingRealBoundaries
            ? `📍 OSM boundaries · ${layers.total}`
            : '◇ Approx. districts'}
        </span>
        {hasNested && (
          <span className="text-[9px] font-semibold px-2 py-1 rounded-full bg-white/90 text-neutral-600 border border-neutral-200">
            {layers.districts.features.length} districts ·{' '}
            {layers.neighbourhoods.features.length} neighbourhoods
          </span>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        touchZoom={true}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url={choroplethBase.url}
          attribution={choroplethBase.attribution}
          maxNativeZoom={choroplethBase.maxNativeZoom}
          maxZoom={choroplethBase.maxZoom}
        />

        {usingRealBoundaries ? (
          <>
            {/* Base partition first, so the nested areas draw over it. */}
            <GeoJSON
              ref={districtLayerRef}
              key={`districts-${layerRevision}`}
              data={layers.districts as unknown as FeatureCollection}
              style={
                styleGeoFeature as unknown as (
                  f?: Feature<Geometry, Record<string, unknown>>
                ) => PathOptions
              }
              onEachFeature={
                onEachGeoFeature as unknown as (
                  f: Feature<Geometry, Record<string, unknown>>,
                  l: Layer
                ) => void
              }
            />
            {hasNested && (
              <GeoJSON
                ref={neighbourhoodLayerRef}
                key={`neighbourhoods-${layerRevision}`}
                data={layers.neighbourhoods as unknown as FeatureCollection}
                style={
                  styleGeoFeature as unknown as (
                    f?: Feature<Geometry, Record<string, unknown>>
                  ) => PathOptions
                }
                onEachFeature={
                  onEachGeoFeature as unknown as (
                    f: Feature<Geometry, Record<string, unknown>>,
                    l: Layer
                  ) => void
                }
              />
            )}
          </>
        ) : (
          <GeoJSON
            ref={fallbackLayerRef}
            key={`district-${selectedSuburb?.name ?? 'none'}-${priceMode}`}
            data={districtGeoJSON as unknown as FeatureCollection}
            style={
              styleDistrict as unknown as (
                f?: Feature<Geometry, Record<string, unknown>>
              ) => PathOptions
            }
            onEachFeature={
              onEachDistrict as unknown as (
                f: Feature<Geometry, Record<string, unknown>>,
                l: Layer
              ) => void
            }
          />
        )}

        <MapLabelDensity
          layers={[districtLayerRef, neighbourhoodLayerRef, fallbackLayerRef]}
          revision={layerRevision}
        />

        <FitBounds geoData={usingRealBoundaries ? layers.districts : districtGeoJSON} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow border border-neutral-200 pointer-events-none">
        {priceMode === 'official' && hasOfficialData ? (
          <>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              €/m² — {officialSource}
            </div>
            <div
              className="w-32 h-3 rounded-full"
              style={{
                background: `linear-gradient(to right, ${CHORO.low}, ${CHORO.mid}, ${CHORO.high})`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-neutral-500">€{minPrice.toLocaleString()}</span>
              <span className="text-[9px] text-neutral-500">€{maxPrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-4 h-3 rounded-sm" style={{ background: CHORO.noData }} />
              <span className="text-[9px] text-neutral-400">No data</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
              {usingRealBoundaries ? 'Districts' : 'Approx. districts'}
            </div>
            <div className="flex flex-wrap gap-1" style={{ maxWidth: 120 }}>
              {PALETTE.map((c, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            {hasNested && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-200">
                <div
                  className="w-4 h-3 rounded-sm border border-dashed"
                  style={{ borderColor: '#374151', background: 'rgba(255,255,255,0.5)' }}
                />
                <span className="text-[9px] text-neutral-500">Neighbourhood</span>
              </div>
            )}
          </>
        )}
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
        /* Permanent polygon label */
        .municipality-label {
          background: rgba(255, 255, 255, 0.88) !important;
          border: none !important;
          border-radius: 5px !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18) !important;
          padding: 3px 7px !important;
          pointer-events: none !important;
          white-space: nowrap !important;
          backdrop-filter: blur(2px);
        }
        .municipality-label::before { display: none !important; }

        /* A nested area's label sits lighter than its district's, so the two
           read as a hierarchy where they end up side by side. */
        .municipality-label--nested {
          background: rgba(255, 255, 255, 0.78) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
          padding: 2px 5px !important;
        }
        .municipality-label--nested .mlabel-name {
          font-size: 9.5px !important;
          font-weight: 600 !important;
          color: #333 !important;
        }

        /* Set by MapLabelDensity on shapes too small at this zoom to hold a
           label. The shape itself stays drawn and clickable. */
        .${HIDDEN_LABEL_CLASS} { display: none !important; }

        .mlabel-name {
          font-size: 10.5px !important;
          font-weight: 700 !important;
          color: #111 !important;
          line-height: 1.3 !important;
          letter-spacing: 0.01em !important;
        }
        .mlabel-sub {
          font-size: 9px !important;
          font-weight: 500 !important;
          color: #555 !important;
          line-height: 1.2 !important;
          letter-spacing: 0.02em !important;
        }
        .mlabel-price {
          font-size: 9.5px !important;
          font-weight: 600 !important;
          color: #e67e22 !important;
          line-height: 1.2 !important;
        }
      `}</style>
    </div>
  );
};

export default CitySuburbMap;
