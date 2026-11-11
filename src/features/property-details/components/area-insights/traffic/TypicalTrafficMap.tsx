/**
 * TypicalTrafficMap — the roads around a home, coloured by how busy they
 * typically are at the chosen hour (road class × standard daily pattern).
 * In the card it does not take one-finger drags on touch screens, so the page
 * still scrolls; full screen it is fully interactive.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getTileLayer } from '@/config/mapStyles';
import type { RoadLine } from '../../../api/surroundingsApi';
import { ROAD_WEIGHT, SHADES, roadIntensity, shadeFor, type DayType } from './trafficProfile';

export interface TypicalTrafficMapProps {
  center: { lat: number; lng: number };
  roads: RoadLine[];
  day: DayType;
  hour: number;
  /** Full screen: drag, pinch and wheel zoom. In the card: buttons only on touch. */
  interactive: boolean;
}

/** The map opens on the ~600 m the roads were gathered from. */
const VIEW_RADIUS_M = 450;

const LINE_WIDTH: Record<RoadLine['kind'], number> = {
  motorway: 7, trunk: 6.5, primary: 6, secondary: 5, tertiary: 4, street: 3,
};

const TypicalTrafficMap: React.FC<TypicalTrafficMapProps> = ({ center, roads, day, hour, interactive }) => {
  const { t } = useTranslation(['property']);
  const tiles = getTileLayer('positron');
  const touch = L.Browser.mobile;
  const bounds = useMemo(() => L.latLng(center.lat, center.lng).toBounds(VIEW_RADIUS_M * 2), [center.lat, center.lng]);
  // Quieter roads first, so main roads are drawn on top.
  const ordered = useMemo(() => [...roads].sort((a, b) => ROAD_WEIGHT[a.kind] - ROAD_WEIGHT[b.kind]), [roads]);

  return (
    <MapContainer
      key={interactive ? 'full' : 'card'}
      bounds={bounds}
      className="h-full w-full"
      scrollWheelZoom={interactive}
      dragging={interactive || !touch}
      touchZoom={interactive}
      doubleClickZoom={interactive}
      zoomControl
      attributionControl
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} maxNativeZoom={tiles.maxNativeZoom} maxZoom={tiles.maxZoom} />
      {ordered.map((road, i) => {
        const shade = shadeFor(roadIntensity(road.kind, day, hour));
        return (
          <Polyline
            key={`${road.kind}-${i}`}
            positions={road.points}
            pathOptions={{ color: SHADES[shade].color, weight: LINE_WIDTH[road.kind], opacity: 0.9, lineCap: 'round' }}
          >
            {road.name && <Tooltip sticky>{road.name}</Tooltip>}
          </Polyline>
        );
      })}
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={9}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1d4ed8', fillOpacity: 1 }}
      >
        <Tooltip direction="top" offset={[0, -8]} permanent={interactive}>
          {t('property:areaPrices.thisHome', 'This home')}
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
};

export default TypicalTrafficMap;
