import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Agency } from '../types';
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, StarIcon } from '../constants';

// Fix for default icon issue with bundlers
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Bounding box for the Balkan region
const BALKAN_BOUNDS = L.latLngBounds(
    [34, 13], // Southwest corner (Southern Greece, Western Croatia)
    [49, 31]  // Northeast corner (Northern Romania, Eastern Bulgaria)
);

interface AgenciesMapProps {
  agencies: Agency[];
  onAgencyClick?: (agencyId: string) => void;
}

// Custom marker icon for agencies
const createAgencyMarkerIcon = (isFeatured: boolean) => {
  const color = isFeatured ? '#f59e0b' : '#1f2937'; // Amber for featured, gray for regular

  const svgHtml = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <circle cx="24" cy="24" r="22" fill="${color}" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M24 14 L28 18 L28 30 L32 30 L32 32 L16 32 L16 30 L20 30 L20 18 Z M22 20 L22 22 L26 22 L26 20 Z M22 24 L22 26 L26 26 L26 24 Z" fill="white"/>
      ${isFeatured ? '<circle cx="34" cy="14" r="6" fill="#fbbf24" stroke="#FFFFFF" stroke-width="2"/><text x="34" y="17" font-family="Arial" font-size="10" font-weight="bold" fill="#000" text-anchor="middle">★</text>' : ''}
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24]
  });
};

const MapEvents: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | null = null;

    // Debounced resize function to prevent performance issues
    const debouncedResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        map.invalidateSize({ pan: false }); // Don't pan, just resize
      }, 150); // Debounce by 150ms
    };

    const resizeObserver = new ResizeObserver(debouncedResize);
    const mapContainer = map.getContainer();
    resizeObserver.observe(mapContainer);

    // Single initial resize
    const timer = setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 100);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.unobserve(mapContainer);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  return null;
};

const AgenciesMap: React.FC<AgenciesMapProps> = ({ agencies, onAgencyClick }) => {
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  // Filter agencies with valid coordinates
  const validAgencies = agencies.filter(a =>
    a.lat != null && !isNaN(a.lat) && a.lng != null && !isNaN(a.lng)
  );

  // Calculate center based on agencies or default to Balkans center
  const center: [number, number] = validAgencies.length > 0
    ? [
        validAgencies.reduce((sum, a) => sum + (a.lat || 0), 0) / validAgencies.length,
        validAgencies.reduce((sum, a) => sum + (a.lng || 0), 0) / validAgencies.length
      ]
    : [41.5, 22]; // Default center for Balkans

  const handleAgencyClick = (agencyId: string) => {
    if (onAgencyClick) {
      onAgencyClick(agencyId);
    }
  };

  if (validAgencies.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-2xl">
        <div className="text-center">
          <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">No agencies with location data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={true}
        className="w-full h-full rounded-2xl"
        maxZoom={18}
        minZoom={6}
        zoomControl={true}
        maxBounds={BALKAN_BOUNDS}
        maxBoundsViscosity={0.8}
        preferCanvas={true}
        updateWhenIdle={true}
        updateWhenZooming={false}
        keepBuffer={2}
      >
        <MapEvents />
        <TileLayer
          key={mapType}
          attribution={mapType === 'street'
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            : 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          }
          url={mapType === 'street'
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          }
          keepBuffer={2}
          updateWhenIdle={true}
          updateWhenZooming={false}
          updateInterval={150}
        />

        {validAgencies.map(agency => (
          <Marker
            key={agency._id}
            position={[agency.lat!, agency.lng!]}
            icon={createAgencyMarkerIcon(agency.isFeatured)}
          >
            <Popup maxWidth={280}>
              <div
                className="cursor-pointer"
                onClick={() => handleAgencyClick(agency._id)}
              >
                {/* Agency Logo/Header */}
                <div className="flex items-center gap-3 mb-3">
                  {agency.logo ? (
                    <img
                      src={agency.logo}
                      alt={agency.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-gray-900 leading-tight">{agency.name}</h3>
                    {agency.isFeatured && (
                      <div className="flex items-center gap-1 mt-1">
                        <StarIcon className="w-3 h-3 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">Featured</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {agency.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{agency.description}</p>
                )}

                {/* Stats */}
                <div className="flex gap-4 mb-3 text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{agency.totalProperties}</span>
                    <span className="text-gray-500 ml-1">Properties</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">{agency.totalAgents}</span>
                    <span className="text-gray-500 ml-1">Agents</span>
                  </div>
                  {agency.yearsInBusiness && (
                    <div>
                      <span className="font-bold text-gray-900">{agency.yearsInBusiness}</span>
                      <span className="text-gray-500 ml-1">Years</span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {agency.address && (
                  <p className="text-sm text-gray-600 mb-2">{agency.address}</p>
                )}
                {agency.city && agency.country && (
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    {agency.city}, {agency.country}
                  </p>
                )}

                {/* Contact */}
                <div className="space-y-1.5 text-xs border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <PhoneIcon className="w-4 h-4" />
                    <span>{agency.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span className="truncate">{agency.email}</span>
                  </div>
                </div>

                {/* View Button */}
                <button
                  className="w-full mt-3 bg-gray-900 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm"
                  onClick={() => handleAgencyClick(agency._id)}
                >
                  View Agency
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Type Toggle */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-lg flex items-center gap-1">
          <button
            onClick={() => setMapType('street')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              mapType === 'street'
                ? 'bg-gray-900 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Street
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              mapType === 'satellite'
                ? 'bg-gray-900 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <h4 className="font-bold text-sm mb-2 text-gray-900">Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
                <BuildingOfficeIcon className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Regular Agency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center relative">
                <BuildingOfficeIcon className="w-3 h-3 text-white" />
                <span className="absolute -top-1 -right-1 text-xs">⭐</span>
              </div>
              <span className="text-xs font-semibold text-gray-700">Featured Agency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgenciesMap;
