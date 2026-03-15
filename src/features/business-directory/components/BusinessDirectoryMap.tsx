import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, OverlayViewF, OverlayView } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleMapLoader, GOOGLE_MAPS_MAP_ID } from '@/src/features/map/hooks/useGoogleMapLoader';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import {
  MapPinIcon,
  PhoneIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  UserIcon,
  CheckBadgeIcon,
} from '@/constants';

interface BusinessDirectoryMapProps {
  listings: BusinessListing[];
  onListingClick: (listing: BusinessListing) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  construction: '\u{1F3D7}',
  renovation: '\u{1F528}',
  cleaning: '\u{2728}',
  moving: '\u{1F69A}',
  interior_design: '\u{1F3A8}',
  architecture: '\u{1F4D0}',
  plumbing: '\u{1F6BF}',
  electrical: '\u{26A1}',
  landscaping: '\u{1F333}',
  security: '\u{1F512}',
  real_estate_law: '\u{2696}',
  insurance: '\u{1F6E1}',
  home_inspection: '\u{1F50D}',
  pest_control: '\u{1F41B}',
  painting: '\u{1F58C}',
  roofing: '\u{1F3E0}',
  hvac: '\u{2744}',
  furniture: '\u{1FA91}',
  appliances: '\u{1F4FA}',
  other: '\u{1F4CB}',
};

// Balkan region center
const BALKAN_CENTER = { lat: 42.5, lng: 21.0 };
const DEFAULT_ZOOM = 7;

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  ...(GOOGLE_MAPS_MAP_ID ? { mapId: GOOGLE_MAPS_MAP_ID } : {}),
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  ],
};

const BusinessDirectoryMap: React.FC<BusinessDirectoryMapProps> = ({ listings, onListingClick }) => {
  const { t } = useTranslation('businessDirectory');
  const { isLoaded, loadError } = useGoogleMapLoader();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedListing, setSelectedListing] = useState<BusinessListing | null>(null);

  // Only show listings that have coordinates
  const mappableListings = useMemo(
    () => listings.filter(l => l.latitude != null && l.longitude != null),
    [listings]
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Fit bounds to show all markers
    if (mappableListings.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      mappableListings.forEach(l => {
        bounds.extend({ lat: l.latitude!, lng: l.longitude! });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

      // Don't zoom in too much for a single marker
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 15) map.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }
  }, [mappableListings]);

  const handleMarkerClick = useCallback((listing: BusinessListing) => {
    setSelectedListing(listing);
    if (mapRef.current && listing.latitude && listing.longitude) {
      mapRef.current.panTo({ lat: listing.latitude, lng: listing.longitude });
    }
  }, []);

  const getDirectionsUrl = useCallback((listing: BusinessListing) => {
    const destination = listing.latitude && listing.longitude
      ? `${listing.latitude},${listing.longitude}`
      : encodeURIComponent(`${listing.address || ''} ${listing.city}, ${listing.country}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }, []);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 rounded-2xl">
        <div className="text-center p-6">
          <MapPinIcon className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">{t('map.loadError', 'Could not load map')}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 rounded-2xl">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-500 mt-3 text-sm">{t('map.loading', 'Loading map...')}</p>
        </div>
      </div>
    );
  }

  if (mappableListings.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 rounded-2xl">
        <div className="text-center p-6">
          <MapPinIcon className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">{t('map.noLocations', 'No locations to display')}</p>
          <p className="text-neutral-400 text-sm mt-1">{t('map.noLocationsHint', 'Businesses with addresses will appear here on the map')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg border border-neutral-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={BALKAN_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        options={mapOptions}
        onClick={() => setSelectedListing(null)}
      >
        {/* Custom markers */}
        {mappableListings.map(listing => (
          <OverlayViewF
            key={listing.id}
            position={{ lat: listing.latitude!, lng: listing.longitude! }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              className="relative cursor-pointer group"
              style={{ transform: 'translate(-50%, -100%)' }}
              onClick={(e) => {
                e.stopPropagation();
                handleMarkerClick(listing);
              }}
            >
              {/* Marker pin */}
              <div className={`
                relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg border-2 border-white
                transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl
                ${selectedListing?.id === listing.id
                  ? 'bg-primary text-white scale-110'
                  : 'bg-white text-neutral-800 hover:bg-primary hover:text-white'
                }
              `}>
                <span className="text-sm">{CATEGORY_ICONS[listing.category] || CATEGORY_ICONS.other}</span>
                <span className="text-xs font-bold max-w-[80px] truncate hidden sm:inline">{listing.name}</span>
              </div>
              {/* Pin tail */}
              <div
                className={`w-3 h-3 rotate-45 mx-auto -mt-1.5 border-r-2 border-b-2 border-white
                  ${selectedListing?.id === listing.id ? 'bg-primary' : 'bg-white group-hover:bg-primary'}
                `}
              />
            </div>
          </OverlayViewF>
        ))}

        {/* Selected listing popup */}
        {selectedListing && selectedListing.latitude && selectedListing.longitude && (
          <OverlayViewF
            position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
            mapPaneName={OverlayView.FLOAT_PANE}
          >
            <div style={{ transform: 'translate(-50%, calc(-100% - 55px))' }}>
              <AnimatePresence>
                <motion.div
                  className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-72 overflow-hidden"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {/* Header */}
                  <div className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Logo */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                          {selectedListing.logoUrl ? (
                            <img src={selectedListing.logoUrl} alt={selectedListing.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-sm">{selectedListing.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-neutral-900 truncate flex items-center gap-1">
                            {selectedListing.name}
                            {selectedListing.isVerified && (
                              <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                          </h3>
                          <p className="text-xs text-neutral-500 flex items-center gap-1">
                            {selectedListing.listingType === 'individual'
                              ? <UserIcon className="w-3 h-3" />
                              : <BuildingStorefrontIcon className="w-3 h-3" />
                            }
                            {t(`categories.${selectedListing.category}`)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedListing(null); }}
                        className="p-1 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
                      >
                        <XMarkIcon className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <MapPinIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">
                        {selectedListing.address && `${selectedListing.address}, `}
                        {selectedListing.city}, {selectedListing.country}
                      </span>
                    </div>
                  </div>

                  {/* Services preview */}
                  {selectedListing.services.length > 0 && (
                    <div className="px-3 pb-2">
                      <div className="flex flex-wrap gap-1">
                        {selectedListing.services.slice(0, 3).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-primary/5 text-primary rounded text-[10px] font-medium border border-primary/10">
                            {s}
                          </span>
                        ))}
                        {selectedListing.services.length > 3 && (
                          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[10px] font-medium">
                            +{selectedListing.services.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-3 pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onListingClick(selectedListing); }}
                      className="flex-1 py-2 bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-bold rounded-lg hover:shadow-md transition-shadow"
                    >
                      {t('map.viewDetails', 'View Details')}
                    </button>
                    <a
                      href={getDirectionsUrl(selectedListing)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                      </svg>
                      {t('map.directions', 'Directions')}
                    </a>
                  </div>

                  {/* Phone quick action */}
                  {selectedListing.contactPhone && (
                    <a
                      href={`tel:${selectedListing.contactPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-2 py-2.5 bg-neutral-50 border-t border-neutral-100 text-neutral-600 hover:text-primary hover:bg-primary/5 transition-colors text-xs font-medium"
                    >
                      <PhoneIcon className="w-3.5 h-3.5" />
                      {selectedListing.contactPhone}
                    </a>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </OverlayViewF>
        )}
      </GoogleMap>

      {/* Listing count badge */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-neutral-200 text-xs font-medium text-neutral-700 flex items-center gap-1.5">
        <MapPinIcon className="w-3.5 h-3.5 text-primary" />
        {t('map.listingCount', { count: mappableListings.length, defaultValue: '{{count}} on map' })}
      </div>
    </div>
  );
};

export default BusinessDirectoryMap;
