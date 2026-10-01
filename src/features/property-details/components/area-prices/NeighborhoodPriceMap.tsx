/**
 * A map of the homes around a property, each pinned with its price: blue for
 * homes on the market, orange for ones that sold, black for this home.
 * Loaded lazily — Leaflet is only fetched when the section is shown.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { getTileLayer } from '@/config/mapStyles';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { AreaNeighbour } from '../../api/areaPricesApi';
import { AREA_COLORS, colorFor, fmtDistance } from './format';
import type { AreaFormat } from './useAreaFormat';

export interface NeighborhoodPriceMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  subjectPrice: number;
  neighbours: AreaNeighbour[];
  format: AreaFormat;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
}

const ZOOM_FOR_RADIUS: Record<number, number> = { 1: 15, 2: 14, 4: 13, 8: 12 };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const pinIcon = (label: string, color: string, emphasised: boolean, faded: boolean) =>
  L.divIcon({
    className: '',
    iconSize: undefined,
    iconAnchor: [0, 0],
    html: `<div style="transform:translate(-50%,-100%) scale(${emphasised ? 1.15 : 1});transform-origin:bottom center;display:inline-flex;flex-direction:column;align-items:center;opacity:${faded ? 0.55 : 1};transition:transform .15s">
      <div style="background:${color};color:#fff;font:700 11px/1 system-ui,sans-serif;padding:5px 7px;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.25)">${escapeHtml(label)}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};margin-top:-1px"></div>
    </div>`,
  });

const NeighborhoodPriceMap: React.FC<NeighborhoodPriceMapProps> = ({ center, radiusKm, subjectPrice, neighbours, format, highlightedId, onHighlight }) => {
  const { t } = useTranslation(['property']);
  const tiles = getTileLayer('positron');

  const subjectIcon = useMemo(
    () => pinIcon(`${t('property:areaPrices.thisHome', 'This home')} · ${format.compactPrice(subjectPrice)}`, AREA_COLORS.subject, true, false),
    [subjectPrice, format, t]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={ZOOM_FOR_RADIUS[radiusKm] ?? 13}
      scrollWheelZoom={false}
      attributionControl={false}
      className="w-full h-full"
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} maxNativeZoom={tiles.maxNativeZoom} maxZoom={tiles.maxZoom} />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#64748b', weight: 1, dashArray: '4 4', fillOpacity: 0.03 }}
      />
      {neighbours.map((n) => {
        const emphasised = highlightedId === n.id;
        return (
          <Marker
            key={n.id}
            position={[n.lat, n.lng]}
            icon={pinIcon(format.compactPrice(n.price), colorFor(n.status), emphasised, highlightedId !== null && !emphasised)}
            zIndexOffset={emphasised ? 1000 : n.status === 'active' ? 0 : 100}
            eventHandlers={{
              click: () => navigate(paths.property(n.id)),
              mouseover: () => onHighlight(n.id),
              mouseout: () => onHighlight(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -30]}>
              <div className="text-xs">
                <p className="font-semibold">{n.title || n.address}</p>
                <p>
                  {format.price(n.price)}
                  {format.showsPerSqm && n.pricePerSqm !== null && ` · ${format.value(n.pricePerSqm)}`}
                </p>
                <p className="text-neutral-500">
                  {n.status === 'active' ? format.labels.active : format.labels.closed} · {fmtDistance(n.distanceM)}
                </p>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
      <Marker position={[center.lat, center.lng]} icon={subjectIcon} zIndexOffset={2000} interactive={false} />
    </MapContainer>
  );
};

export default NeighborhoodPriceMap;
