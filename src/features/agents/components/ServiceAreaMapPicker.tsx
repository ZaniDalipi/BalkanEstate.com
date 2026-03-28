import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { XMarkIcon, MapPinIcon } from '@/constants';

const BALKANS_CENTER: [number, number] = [42.0, 21.4];

interface GeocodedArea {
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  areas: string[];
  onAdd: (name: string) => void;
  onRemove: (index: number) => void;
  centerLat?: number | null;
  centerLng?: number | null;
}

// ─── Nominatim helpers ────────────────────────────────────────────────────────

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  const a = data.address || {};
  return (
    a.suburb || a.neighbourhood || a.city_district || a.quarter ||
    a.town || a.village || a.city || a.county ||
    data.display_name?.split(',')[0]?.trim() ||
    `${lat.toFixed(3)}, ${lng.toFixed(3)}`
  );
};

const forwardGeocode = async (name: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {/* ignore */}
  return null;
};

// ─── Pin icon ─────────────────────────────────────────────────────────────────

const makePinIcon = (color = '#3b82f6') =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });

// ─── Click handler (inside MapContainer) ──────────────────────────────────────

const ClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void; busy: boolean }> = ({ onMapClick, busy }) => {
  useMapEvents({
    click: (e) => { if (!busy) onMapClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ServiceAreaMapPicker: React.FC<Props> = ({ areas, onAdd, onRemove, centerLat, centerLng }) => {
  const [geocoded, setGeocoded] = useState<GeocodedArea[]>([]);
  const [busy, setBusy] = useState(false);
  // Track which names we've already geocoded to avoid re-fetching
  const geocodedNames = useRef<Set<string>>(new Set());

  // Forward-geocode existing areas on mount / when areas change
  useEffect(() => {
    const toGeocode = areas.filter(a => !geocodedNames.current.has(a));
    if (toGeocode.length === 0) return;

    let cancelled = false;

    (async () => {
      for (const name of toGeocode) {
        if (cancelled) return;
        geocodedNames.current.add(name);
        const coords = await forwardGeocode(name);
        if (coords && !cancelled) {
          setGeocoded(prev => {
            if (prev.find(g => g.name === name)) return prev;
            return [...prev, { name, ...coords }];
          });
        }
        // Nominatim rate-limit: max 1 req/sec
        await new Promise(r => setTimeout(r, 1100));
      }
    })();

    return () => { cancelled = true; };
  }, [areas.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove geocoded entry when area is removed from list
  useEffect(() => {
    setGeocoded(prev => prev.filter(g => areas.includes(g.name)));
    geocodedNames.current = new Set([...geocodedNames.current].filter(n => areas.includes(n)));
  }, [areas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setBusy(true);
    try {
      const name = await reverseGeocode(lat, lng);
      onAdd(name);
      geocodedNames.current.add(name);
      setGeocoded(prev => [...prev, { name, lat, lng }]);
    } catch {
      const name = `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
      onAdd(name);
    } finally {
      setBusy(false);
    }
  }, [onAdd]);

  const handleRemove = useCallback((idx: number, name: string) => {
    onRemove(idx);
  }, [onRemove]);

  const center: [number, number] =
    centerLat != null && centerLng != null && !isNaN(centerLat) && !isNaN(centerLng)
      ? [centerLat, centerLng]
      : BALKANS_CENTER;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Loading overlay */}
        {busy && (
          <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-700">Finding area…</span>
            </div>
          </div>
        )}

        <MapContainer
          center={center}
          zoom={centerLat != null ? 10 : 7}
          className="w-full"
          style={{ height: 280, cursor: 'crosshair' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={handleMapClick} busy={busy} />

          {/* Service area markers */}
          {geocoded.map((area, i) => (
            <Marker key={`${area.name}-${i}`} position={[area.lat, area.lng]} icon={makePinIcon('#3b82f6')}>
              <Popup>
                <div className="min-w-[140px]">
                  <p className="font-semibold text-sm text-gray-900 mb-2">{area.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(areas.indexOf(area.name), area.name)}
                    className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 py-1 rounded transition-colors"
                  >
                    Remove area
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Hint */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
          <span className="bg-black/55 text-white text-[11px] font-medium px-3 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
            Click anywhere on the map to add a service area
          </span>
        </div>
      </div>

      {/* Tags */}
      {areas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {areas.map((area, i) => (
            <span
              key={`${area}-${i}`}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-medium"
            >
              <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
              {area}
              <button
                type="button"
                onClick={() => handleRemove(i, area)}
                className="w-4 h-4 rounded-full bg-blue-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors ml-0.5"
                title="Remove"
              >
                <XMarkIcon className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-1">
          No service areas added. Click the map to add areas you serve.
        </p>
      )}
    </div>
  );
};

export default ServiceAreaMapPicker;
