import React, { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../../utils/travel';

export type MapLayer = 'map' | 'satellite';

interface BusinessLocationMapProps {
  business: LatLng;
  label: string;
  layer: MapLayer;
  visitor?: LatLng | null;
  /** [lat, lng] pairs of the route, when there is one. */
  path?: Array<[number, number]> | null;
}

const TILES: Record<MapLayer, { url: string; attribution: string }> = {
  map: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' },
};

const PIN_HTML =
  '<span style="display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#0252CD;box-shadow:0 8px 20px -6px rgba(2,82,205,.7);border:3px solid #fff">' +
  '<span style="width:12px;height:12px;border-radius:9999px;background:#fff"></span></span>';

/** Keep the business, the visitor and the route in view whenever they change. */
const FitToTrip: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
  const map = useMap();
  const latest = useRef(points);
  latest.current = points;
  // Refit only when the trip itself changes, not on every new array.
  const key = points.length > 1 ? `${points[0]}|${points[points.length - 1]}|${points.length}` : '';
  useEffect(() => {
    if (key) map.fitBounds(L.latLngBounds(latest.current), { padding: [36, 36], maxZoom: 16 });
  }, [map, key]);
  return null;
};

/**
 * A view-only map of the business — no search box, no draggable pin. Shows
 * the visitor and the route once they ask for it, with a satellite option.
 * Wheel zoom is off so the page scrolls past it; on touch, one finger scrolls
 * the page and the map's own buttons zoom.
 */
const BusinessLocationMap: React.FC<BusinessLocationMapProps> = ({ business, label, layer, visitor, path }) => {
  const icon = useMemo(() => L.divIcon({ className: '', iconSize: [40, 48], iconAnchor: [20, 46], html: PIN_HTML }), []);
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const tiles = TILES[layer];
  const fitPoints = useMemo<Array<[number, number]>>(
    () => (path && path.length > 1 ? path : visitor ? [[visitor.lat, visitor.lng], [business.lat, business.lng]] : []),
    [path, visitor, business.lat, business.lng],
  );

  return (
    <MapContainer center={[business.lat, business.lng]} zoom={15} scrollWheelZoom={false} dragging={!touch} className="h-full w-full">
      <TileLayer key={layer} url={tiles.url} attribution={tiles.attribution} />
      {path && path.length > 1 && (
        <>
          <Polyline positions={path} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={path} pathOptions={{ color: '#0A84FF', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
        </>
      )}
      {visitor && (
        <>
          <CircleMarker center={[visitor.lat, visitor.lng]} radius={16} pathOptions={{ stroke: false, fillColor: '#0A84FF', fillOpacity: 0.18 }} />
          <CircleMarker center={[visitor.lat, visitor.lng]} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#0A84FF', fillOpacity: 1 }} />
        </>
      )}
      <Marker position={[business.lat, business.lng]} icon={icon} title={label} alt={label} keyboard={false} />
      <FitToTrip points={fitPoints} />
    </MapContainer>
  );
};

export default BusinessLocationMap;
