import React, { useMemo } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface BusinessLocationMapProps {
  lat: number;
  lng: number;
  label: string;
}

/**
 * A view-only map of where the business is: no search box, no draggable pin.
 * Wheel zoom is off so the page scrolls past it, and on touch screens one
 * finger scrolls the page rather than panning the map.
 */
const BusinessLocationMap: React.FC<BusinessLocationMapProps> = ({ lat, lng, label }) => {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        iconSize: [40, 48],
        iconAnchor: [20, 46],
        html:
          '<span style="display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#0252CD;box-shadow:0 8px 20px -6px rgba(2,82,205,.7);border:3px solid #fff">' +
          '<span style="width:12px;height:12px;border-radius:9999px;background:#fff"></span></span>',
      }),
    [],
  );
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      dragging={!touch}
      zoomControl={!touch}
      attributionControl
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon} title={label} alt={label} keyboard={false} />
    </MapContainer>
  );
};

export default BusinessLocationMap;
