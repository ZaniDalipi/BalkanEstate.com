import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import { Property } from '../../../types';
import L from 'leaflet';
import { useAppContext } from '../../../context/AppContext';
import {
  BellIcon,
  PencilIcon,
  XCircleIcon,
  SearchPlusIcon,
  MapLegendIcon,
  CrosshairsIcon,
} from '../../../constants';
import { CadastreLayer } from '../../Map/CadastreLayer';
import {
  FlyToController,
  MapEvents,
  ZoomBasedTileSwitch,
  MapDrawEvents,
} from '../../../src/components/map/MapHelpers';
import { Markers, Legend } from '../../../src/components/map/MapPropertyMarker';

// Fix for default icon issue with bundlers
let DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

type TileLayerType = keyof typeof TILE_LAYERS;

// Bounding box for the Balkan region
const BALKAN_BOUNDS = L.latLngBounds(
  [34, 13], // Southwest corner (Southern Greece, Western Croatia)
  [49, 31] // Northeast corner (Northern Romania, Eastern Bulgaria)
);

interface MapComponentProps {
  properties: Property[];
  onMapMove: (bounds: L.LatLngBounds, center: L.LatLng) => void;
  userLocation: [number, number] | null;
  onSaveSearch: () => void;
  isSaving: boolean;
  isAuthenticated: boolean;
  mapBounds: L.LatLngBounds | null;
  drawnBounds: L.LatLngBounds | null;
  onDrawComplete: (bounds: L.LatLngBounds | null) => void;
  isDrawing: boolean;
  onDrawStart: () => void;
  flyToTarget: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
  onRecenter: () => void;
  isMobile: boolean;
  searchMode: 'manual' | 'ai';
  hoveredPropertyId?: string | null;
}

/**
 * MapComponent
 *
 * Main map component for property search with:
 * - Interactive Leaflet map
 * - Property markers with popups
 * - Area drawing for custom search
 * - Street/Satellite view toggle
 * - Cadastral layer overlay
 * - User location centering
 * - Legend display
 *
 * Decomposed from 705 lines to ~150 lines by extracting:
 * - MapHelpers: FlyToController, MapEvents, ZoomBasedTileSwitch, MapDrawEvents
 * - MapPropertyMarker: Markers, PropertyPopup, Legend, marker icons
 */
const MapComponent: React.FC<MapComponentProps> = ({
  properties,
  onMapMove,
  userLocation,
  onSaveSearch,
  isSaving,
  isAuthenticated,
  mapBounds,
  drawnBounds,
  onDrawComplete,
  isDrawing,
  onDrawStart,
  flyToTarget,
  onFlyComplete,
  onRecenter,
  isMobile,
  searchMode,
  hoveredPropertyId,
}) => {
  const { dispatch } = useAppContext();
  const [mapType, setMapType] = useState<TileLayerType>('street');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [showCadastre, setShowCadastre] = useState(false);

  const validProperties = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );
  }, [properties]);

  // Always show all valid properties on the map (up to 500 for performance)
  // This ensures the map never appears empty and users can navigate to any property
  const propertiesInView = useMemo(() => {
    return validProperties.slice(0, 500);
  }, [validProperties]);

  const { center, zoom } = useMemo(() => {
    if (userLocation) return { center: userLocation, zoom: 13 };
    return { center: [41.5, 22] as [number, number], zoom: 7 };
  }, [userLocation]);

  const handlePopupClick = (propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
        maxZoom={18}
        minZoom={7}
        zoomControl={false}
        maxBounds={BALKAN_BOUNDS}
        maxBoundsViscosity={1.0}
        preferCanvas={true}
        updateWhenIdle={true}
        updateWhenZooming={false}
        keepBuffer={2}
      >
        <FlyToController target={flyToTarget} onComplete={onFlyComplete} />
        <MapEvents onMove={onMapMove} mapBounds={mapBounds} searchMode={searchMode} />
        <MapDrawEvents isDrawing={isDrawing} onDrawComplete={onDrawComplete} />
        <ZoomBasedTileSwitch mapType={mapType} setMapType={setMapType} />
        {drawnBounds && !isDrawing && (
          <Rectangle
            bounds={drawnBounds}
            pathOptions={{ color: '#0252CD', weight: 3, fillOpacity: 0.2 }}
          />
        )}
        <TileLayer
          key={mapType}
          attribution={TILE_LAYERS[mapType].attribution}
          url={TILE_LAYERS[mapType].url}
          keepBuffer={2}
          updateWhenIdle={true}
          updateWhenZooming={false}
          updateInterval={150}
        />
        <CadastreLayer enabled={showCadastre && mapType === 'satellite'} opacity={0.7} />
        <Markers properties={propertiesInView} onPopupClick={handlePopupClick} hoveredPropertyId={hoveredPropertyId} />
      </MapContainer>

      {!isMobile && (
        <>
          <div className="absolute bottom-12 right-4 z-[1000] flex flex-col items-end gap-3">
            <div className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg flex items-center gap-2">
              <button
                onClick={onRecenter}
                className="p-2 rounded-full hover:bg-black/10 transition-colors"
                title="Center on my location"
              >
                <CrosshairsIcon className="w-6 h-6 text-neutral-700" />
              </button>
              <div className="flex items-center gap-1 bg-neutral-200/50 p-1 rounded-full">
                <button
                  onClick={() => setMapType('street')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mapType === 'street'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  Street
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mapType === 'satellite'
                      ? 'bg-white shadow text-primary'
                      : 'text-neutral-600 hover:bg-white/50'
                  }`}
                >
                  Satellite
                </button>
              </div>
              <button
                onClick={onDrawStart}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full shadow-md transition-colors ${
                  isDrawing
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-neutral-800 text-white hover:bg-neutral-900'
                }`}
              >
                {isDrawing ? <XCircleIcon className="w-5 h-5" /> : <PencilIcon className="w-5 h-5" />}
                <span>{isDrawing ? 'Cancel' : 'Draw Area'}</span>
              </button>
            </div>

            {mapType === 'satellite' && (
              <button
                onClick={() => setShowCadastre(!showCadastre)}
                className={`px-4 py-2 text-sm font-bold rounded-full shadow-lg transition-all animate-fade-in ${
                  showCadastre
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-white/90 text-neutral-800 hover:bg-white'
                }`}
                title="Show cadastral parcels (zoom in to see)"
              >
                {showCadastre ? '✓ ' : ''} Cadastral Parcels
              </button>
            )}

            {drawnBounds && !isDrawing && (
              <div className="flex flex-col items-end gap-2 animate-fade-in">
                {isAuthenticated && (
                  <button
                    onClick={onSaveSearch}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-full shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    <SearchPlusIcon className="w-5 h-5" />
                    <span>{isSaving ? 'Saving...' : 'Save Area'}</span>
                  </button>
                )}
                <button
                  onClick={() => onDrawComplete(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white font-bold rounded-full shadow-lg hover:bg-neutral-900"
                >
                  <XCircleIcon className="w-5 h-5" />
                  <span>Clear Area</span>
                </button>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 left-4 z-[1000]">
            <Legend />
          </div>
        </>
      )}

      {isMobile && (
        <div className="absolute bottom-20 left-4 z-[1000] pointer-events-none flex flex-col gap-2">
          {isLegendOpen && (
            <div className="absolute bottom-full mb-2 pointer-events-auto">
              <Legend />
            </div>
          )}
          {mapType === 'satellite' && (
            <button
              onClick={() => setShowCadastre(!showCadastre)}
              className={`pointer-events-auto px-3 py-2 text-xs font-bold rounded-full shadow-lg transition-all animate-fade-in ${
                showCadastre
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-white/90 text-neutral-800 hover:bg-white'
              }`}
              title="Show cadastral parcels (zoom in to see)"
            >
              {showCadastre ? '✓ ' : ''}Parcels
            </button>
          )}
          <button
            onClick={() => setIsLegendOpen((p) => !p)}
            className="bg-white/80 backdrop-blur-sm p-2.5 rounded-full shadow-lg pointer-events-auto"
            title="Map Legend"
          >
            <MapLegendIcon className="w-6 h-6 text-neutral-800" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
