/**
 * useGoogleMap - Custom hook containing all state, refs, effects, and handlers
 * for the GoogleMapComponent. Extracted for modularity.
 *
 * This hook manages:
 * - Map loading, initialization, and lifecycle
 * - Marker creation and clustering
 * - Drawing mode (rectangle selection)
 * - Measurement tools (distance/area)
 * - Layer management (cadastre, climate, 3D buildings, landmarks)
 * - Map style switching
 * - Fly-to animations
 * - Property hover highlighting
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { Property } from '@/types';
import L from 'leaflet';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { getCadastreLayerForLocation, CADASTRE_MIN_ZOOM } from '@/config/cadastreLayers';
import { SaveMeasurementUseCase, GetMeasurementsUseCase } from '@/src/domain/usecases/measurement';
import { measurementRepository } from '@/src/data/repositories/MeasurementRepository';
import { MeasurementLimitExceededError, InvalidMeasurementError } from '@/src/domain/repositories/IMeasurementRepository';
import { MEASUREMENT_LIMITS } from '@/src/domain/entities/Measurement';
import { validateCoordinates } from '@/shared/utils/validation';
import {
  useGoogleMapLoader,
  GOOGLE_MAPS_MAP_ID,
  calculateDistance,
  calculateTotalDistance,
  calculatePolygonArea,
  formatMeasureDistance,
  type MeasurementPoint,
  type LocalMeasurement,
} from '../hooks';
import {
  injectUserLocationMarkerStyles,
  createUserLocationMarkerElement,
  userLocationScaleForZoom,
} from '../utils/userLocationMarker';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { useRainViewer } from '../hooks/useRainViewer';
import { useOpenMeteoGrid, type MapBounds } from '../hooks/useOpenMeteoGrid';
import { useMapServices, weatherTileProxyUrl, firmsWmsProxyUrl } from '../hooks/useMapServices';
import {
  MapStyleType,
  ClimateRiskType,
  PROPERTY_TYPE_COLORS,
  PROMOTION_TIER_COLORS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  BALKAN_BOUNDS,
  cleanMapStyles,
  colorMapStyles,
  latLngToWebMercator,
  formatMarkerPrice,
} from './googleMapConstants';

// Inject CSS for marker entrance fly-in animation (Google Maps variant)
if (typeof window !== 'undefined') {
  const styleId = 'gmap-marker-entrance-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes gmarkerFlyIn {
        0% {
          opacity: 0;
          transform: translate(var(--fly-x, 0px), var(--fly-y, -300px)) scale(0.2) rotate(var(--fly-r, 0deg));
        }
        35% { opacity: 1; }
        65% { transform: translate(0px, -8px) scale(1.18) rotate(0deg); }
        82% { transform: translate(0px, 3px) scale(0.95) rotate(0deg); }
        100% {
          opacity: 1;
          transform: translate(0px, 0px) scale(1) rotate(0deg);
        }
      }
      .gmarker-entrance-fly {
        will-change: transform, opacity;
        animation: gmarkerFlyIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) both !important;
        animation-delay: var(--fly-delay, 0ms) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Props interface matching the Leaflet-based MapComponent for seamless switching
export interface GoogleMapComponentProps {
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
  onResetView?: () => void;
  isMobile: boolean;
  searchMode: 'manual' | 'ai';
  hoveredPropertyId?: string | null;
  /** Hide all map controls (for saved searches view) */
  hideControls?: boolean;
}

export function useGoogleMap(props: GoogleMapComponentProps) {
  const {
    properties,
    onMapMove,
    userLocation,
    isAuthenticated,
    drawnBounds,
    onDrawComplete,
    isDrawing,
    flyToTarget,
    onFlyComplete,
    onRecenter,
    hoveredPropertyId,
  } = props;

  const { dispatch } = useAppContext();
  const { t } = useTranslation(['search', 'property']);

  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // UI state - matching Leaflet options
  const [mapStyle, setMapStyle] = useState<MapStyleType>('street');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area'>('area');
  const [localMeasurements, setLocalMeasurements] = useState<LocalMeasurement[]>([]);
  const [selectedClimateRisk, setSelectedClimateRisk] = useState<ClimateRiskType>('none');
  const [isClimateMenuOpen, setIsClimateMenuOpen] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Save measurement modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [measurementName, setMeasurementName] = useState('');
  const [measurementAddress, setMeasurementAddress] = useState('');
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [pendingMeasurement, setPendingMeasurement] = useState<LocalMeasurement | null>(null);

  // Measurement limit state
  const [measurementCount, setMeasurementCount] = useState<number>(0);
  const [measurementMaxAllowed, setMeasurementMaxAllowed] = useState<number>(MEASUREMENT_LIMITS.FREE_MAX);
  const [measurementIsPro, setMeasurementIsPro] = useState(false);
  const [measurementSaveError, setMeasurementSaveError] = useState<string | null>(null);
  const [isAtMeasurementLimit, setIsAtMeasurementLimit] = useState(false);

  // Cadastre layer state
  const [showCadastre, setShowCadastre] = useState(false);
  const cadastreLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const cadastreInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const cadastreClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  // Promoted listings filter
  const [showOnlyPromoted, setShowOnlyPromoted] = useState(false);

  // Tracks when the marker library + clusterer are ready (avoids race condition)
  const [markersReady, setMarkersReady] = useState(false);

  // Refs - ALL useRef hooks must be at the top to maintain consistent hook order
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const markerDivsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastMapTypeRef = useRef<string | null>(null);
  const climateLayerRef = useRef<google.maps.ImageMapType | null>(null);
  // Ref to track map instance synchronously (avoids race condition with async setState)
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  // The animated "you are here" dot — recreated only when the map (re)loads
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Drawing refs - for rectangle drawing on map
  const drawingStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const isDrawingDragRef = useRef(false);
  const [drawingRect, setDrawingRect] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const drawingRectRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null);
  const drawingPropsRef = useRef({ isDrawing, onDrawComplete });

  // Ref to store promoted markers separately (not clustered)
  const promotedMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Track whether we've already played the entrance fly-in animation
  const hasAnimatedEntranceRef = useRef(false);

  // Debounce timer for marker creation to avoid rapid clear/recreate cycles
  const markerCreationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep drawing props ref updated
  useEffect(() => {
    drawingPropsRef.current = { isDrawing, onDrawComplete };
  }, [isDrawing, onDrawComplete]);

  // Keep drawingRect ref in sync with state (for use in event handlers)
  useEffect(() => {
    drawingRectRef.current = drawingRect;
  }, [drawingRect]);

  // Load Google Maps API using centralized hook (enables preloading benefits)
  const { isLoaded, loadError } = useGoogleMapLoader();

  // RainViewer precipitation radar (free, no API key) - for flood layer
  const { tileUrl: rainViewerTileUrl } = useRainViewer(selectedClimateRisk === 'flood');

  // Google Maps bounds tracking for Open-Meteo weather grid
  const [gmapBounds, setGmapBounds] = useState<MapBounds | null>(null);
  // Ref removed – openMeteoMarkersRef declared below handles cleanup

  // Map proxy services availability (OWM, FIRMS keys on backend)
  const mapServices = useMapServices();

  // Open-Meteo: free weather data fallback when no OWM proxy available
  const needsOpenMeteoWind = selectedClimateRisk === 'wind' && !mapServices.owm;
  const needsOpenMeteoHeat = selectedClimateRisk === 'heat' && !mapServices.owm;
  const openMeteoDataType = needsOpenMeteoWind ? 'wind' as const : needsOpenMeteoHeat ? 'temperature' as const : null;
  const { data: openMeteoData } = useOpenMeteoGrid(
    openMeteoDataType ? gmapBounds : null,
    openMeteoDataType,
  );

  // Filter valid properties (optionally only promoted)
  const validProperties = useMemo(() => {
    let filtered = properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng)
    );

    // Filter to only show promoted listings if enabled
    if (showOnlyPromoted) {
      filtered = filtered.filter(
        (p) => p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now()
      );
    }

    return filtered;
  }, [properties, showOnlyPromoted]);

  // Count of promoted properties for badge
  const promotedCount = useMemo(() => {
    return properties.filter(
      (p) => p.lat != null && !isNaN(p.lat) && p.lng != null && !isNaN(p.lng) &&
             p.isPromoted && p.promotionEndDate && p.promotionEndDate > Date.now()
    ).length;
  }, [properties]);

  // Validate the browser-supplied geolocation fix before trusting it anywhere
  // (system boundary: coordinates originate from navigator.geolocation, not our own code).
  const validUserLocation = useMemo(() => {
    if (!userLocation) return null;
    const [lat, lng] = userLocation;
    return validateCoordinates(lat, lng).isValid ? userLocation : null;
  }, [userLocation]);

  // Initial center from user location
  const initialCenter = useMemo(() => {
    if (validUserLocation) {
      return { lat: validUserLocation[0], lng: validUserLocation[1] };
    }
    return DEFAULT_CENTER;
  }, [validUserLocation]);

  // Initial zoom
  const initialZoom = validUserLocation ? 13 : DEFAULT_ZOOM;

  // Fetch measurement count on mount and when authentication changes
  useEffect(() => {
    const fetchMeasurementLimits = async () => {
      if (!isAuthenticated) {
        // Reset to defaults for non-authenticated users
        setMeasurementCount(0);
        setMeasurementMaxAllowed(MEASUREMENT_LIMITS.FREE_MAX);
        setMeasurementIsPro(false);
        setIsAtMeasurementLimit(false);
        return;
      }

      try {
        const getMeasurementsUseCase = new GetMeasurementsUseCase(measurementRepository);
        const result = await getMeasurementsUseCase.execute();
        setMeasurementCount(result.count);
        setMeasurementMaxAllowed(result.maxAllowed);
        setMeasurementIsPro(result.isPro);
        setIsAtMeasurementLimit(result.isAtLimit);
      } catch (error) {
        // Error removed
      }
    };

    fetchMeasurementLimits();
  }, [isAuthenticated]);

  // Drawing mode - handle cursor and map interaction
  useEffect(() => {
    if (!map) return;

    const mapDiv = map.getDiv();
    if (!mapDiv) return;
    if (isDrawing) {
      mapDiv.style.cursor = 'crosshair';
      map.setOptions({ draggable: false, scrollwheel: false });
    } else {
      mapDiv.style.cursor = '';
      map.setOptions({ draggable: true, scrollwheel: true });
      // Clear drawing state if cancelled
      if (isDrawingDragRef.current) {
        isDrawingDragRef.current = false;
        drawingStartRef.current = null;
        setDrawingRect(null);
      }
    }
  }, [isDrawing, map]);

  // Drawing event handlers
  useEffect(() => {
    if (!map) return;

    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    const getLatLngFromEvent = (e: MouseEvent | TouchEvent): { lat: number; lng: number } | null => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX === undefined || clientY === undefined) return null;

      const rect = mapDiv.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Convert pixel position to lat/lng
      const bounds = map.getBounds();
      const projection = map.getProjection();
      if (!bounds || !projection) return null;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const topRight = projection.fromLatLngToPoint(ne);
      const bottomLeft = projection.fromLatLngToPoint(sw);
      if (!topRight || !bottomLeft) return null;

      const scale = Math.pow(2, map.getZoom() || 0);
      const worldPoint = new google.maps.Point(
        bottomLeft.x + (x / scale) * (topRight.x - bottomLeft.x) / rect.width * scale,
        topRight.y + (y / scale) * (bottomLeft.y - topRight.y) / rect.height * scale
      );

      // Simpler approach: use overlay projection
      const latLng = map.getCenter();
      if (!latLng) return null;

      // Calculate based on bounds
      const lng = sw.lng() + (x / rect.width) * (ne.lng() - sw.lng());
      const lat = ne.lat() - (y / rect.height) * (ne.lat() - sw.lat());

      return { lat, lng };
    };

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      if (!drawingPropsRef.current.isDrawing || isDrawingDragRef.current) return;
      if ('button' in e && e.button !== 0) return;

      e.preventDefault();
      const latLng = getLatLngFromEvent(e);
      if (!latLng) return;

      isDrawingDragRef.current = true;
      drawingStartRef.current = latLng;
      setDrawingRect(null);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingDragRef.current || !drawingStartRef.current) return;

      e.preventDefault();
      const latLng = getLatLngFromEvent(e);
      if (!latLng) return;

      const start = drawingStartRef.current;
      const newRect = {
        north: Math.max(start.lat, latLng.lat),
        south: Math.min(start.lat, latLng.lat),
        east: Math.max(start.lng, latLng.lng),
        west: Math.min(start.lng, latLng.lng),
      };
      // Update both ref (for immediate use in handlers) and state (for rendering)
      drawingRectRef.current = newRect;
      setDrawingRect(newRect);
    };

    const handleMouseUp = () => {
      if (!isDrawingDragRef.current) return;

      isDrawingDragRef.current = false;
      // Read from ref to get the latest value (not from closure which may be stale)
      const rect = drawingRectRef.current;

      // Clear temp drawing state
      drawingStartRef.current = null;
      drawingRectRef.current = null;
      setDrawingRect(null);

      // Convert to Leaflet LatLngBounds format for compatibility
      if (rect && Math.abs(rect.north - rect.south) > 0.0001 && Math.abs(rect.east - rect.west) > 0.0001) {
        const bounds = L.latLngBounds(
          L.latLng(rect.south, rect.west),
          L.latLng(rect.north, rect.east)
        );
        drawingPropsRef.current.onDrawComplete(bounds);
      } else {
        drawingPropsRef.current.onDrawComplete(null);
      }
    };

    // Attach event listeners
    mapDiv.addEventListener('mousedown', handleMouseDown);
    mapDiv.addEventListener('touchstart', handleMouseDown, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      mapDiv.removeEventListener('mousedown', handleMouseDown);
      mapDiv.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [map]); // Only depend on map - use refs for other values

  // Get map type ID based on style
  // Note: mapId prevents client-side styles, so we use different map types for visual distinction
  const getMapTypeId = useCallback((): google.maps.MapTypeId => {
    switch (mapStyle) {
      case 'clean':
        return google.maps.MapTypeId.ROADMAP;
      case 'color':
        return google.maps.MapTypeId.TERRAIN;
      case 'satellite':
      case 'hybrid':
        return google.maps.MapTypeId.HYBRID;
      case 'street':
        return google.maps.MapTypeId.ROADMAP;
      default:
        return google.maps.MapTypeId.ROADMAP;
    }
  }, [mapStyle]);

  // Get map styles based on style type
  const getMapStyles = useCallback((): google.maps.MapTypeStyle[] => {
    switch (mapStyle) {
      case 'clean':
        return cleanMapStyles;
      case 'color':
        return colorMapStyles;
      default:
        return showLandmarks ? [] : [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ];
    }
  }, [mapStyle, showLandmarks]);

  // Inject CSS keyframes for promoted marker glow animation
  useEffect(() => {
    const styleId = 'promoted-marker-glow-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes promotedFloat {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-6px);
        }
      }
      @keyframes promotedGlow {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.85;
        }
      }
      .promoted-marker-premium {
        animation: promotedFloat 2s ease-in-out infinite, promotedGlow 2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(255, 184, 0, 0.7), 0 0 20px 6px rgba(255, 184, 0, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-highlight {
        animation: promotedFloat 2.2s ease-in-out infinite, promotedGlow 2.2s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(14, 165, 233, 0.7), 0 0 20px 6px rgba(14, 165, 233, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-featured {
        animation: promotedFloat 2.4s ease-in-out infinite, promotedGlow 2.4s ease-in-out infinite;
        box-shadow: 0 0 12px 3px rgba(124, 58, 237, 0.7), 0 0 20px 6px rgba(124, 58, 237, 0.4), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-standard {
        animation: promotedFloat 2.6s ease-in-out infinite, promotedGlow 2.6s ease-in-out infinite;
        box-shadow: 0 0 8px 2px rgba(156, 163, 175, 0.6), 0 0 14px 4px rgba(156, 163, 175, 0.3), 0 1px 4px rgba(0,0,0,0.25) !important;
      }
      .promoted-marker-premium.marker-highlighted,
      .promoted-marker-highlight.marker-highlighted,
      .promoted-marker-featured.marker-highlighted,
      .promoted-marker-standard.marker-highlighted {
        animation: none !important;
        transform: scale(1.3) translateY(-4px) !important;
        z-index: 2000 !important;
      }
      .marker-highlighted {
        transform: scale(1.3) translateY(-4px) !important;
        box-shadow: 0 8px 20px rgba(0,0,0,0.4) !important;
        z-index: 2000 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Create clusterer once marker library is available
  const createClusterer = useCallback((mapInstance: google.maps.Map) => {
    const onClusterClick = (
      event: google.maps.MapMouseEvent,
      cluster: any,
      map: google.maps.Map
    ) => {
      // Use the actual click position for centering
      const clickLat = event.latLng?.lat();
      const clickLng = event.latLng?.lng();

      if (clickLat === undefined || clickLng === undefined) return;

      const currentZoom = map.getZoom() ?? 10;
      const targetZoom = Math.min(currentZoom + 4, 18);

      // Pan directly to click position with smooth animation
      map.panTo({ lat: clickLat, lng: clickLng });

      // Then zoom in smoothly
      setTimeout(() => {
        const zoomSteps = Math.abs(targetZoom - currentZoom);
        let currentZoomLevel = currentZoom;

        const zoomInterval = setInterval(() => {
          if (currentZoomLevel >= targetZoom) {
            clearInterval(zoomInterval);
            return;
          }
          currentZoomLevel++;
          map.setZoom(currentZoomLevel);
        }, 80);
      }, 400);
    };

    const clusterer = new MarkerClusterer({
      map: mapInstance,
      onClusterClick,
      algorithm: new SuperClusterAlgorithm({
        radius: 60,
        maxZoom: 15,
      }),
      renderer: {
        render: ({ count, position }) => {
          const div = document.createElement('div');
          div.className = 'cluster-marker';
          const size = count < 10 ? 28 : count < 50 ? 32 : count < 100 ? 36 : 40;
          div.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #0252CD 0%, #0066FF 100%);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${count < 100 ? 11 : 10}px;
            font-family: Inter, system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(2, 82, 205, 0.4), 0 1px 3px rgba(0,0,0,0.2);
            transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
          `;
          div.textContent = String(count);
          div.addEventListener('mouseenter', () => {
            div.style.transform = 'scale(1.15)';
            div.style.boxShadow = '0 4px 12px rgba(2, 82, 205, 0.5), 0 2px 4px rgba(0,0,0,0.3)';
          });
          div.addEventListener('mouseleave', () => {
            div.style.transform = 'scale(1)';
            div.style.boxShadow = '0 2px 8px rgba(2, 82, 205, 0.4), 0 1px 3px rgba(0,0,0,0.2)';
          });

          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: div,
          });
        },
      },
    });

    clustererRef.current = clusterer;
    setMarkersReady(true);
  }, []);

  // Handle map load
  const onLoad = useCallback(async (mapInstance: google.maps.Map) => {
    // Set ref synchronously first (avoids race condition with marker creation effect)
    mapInstanceRef.current = mapInstance;
    setMap(mapInstance);

    // Deliver initial bounds immediately so properties load on first render.
    // onIdle may fire before React processes setMap(), causing it to exit early.
    // This ensures the parent always gets bounds when the map first loads.
    const deliverInitialBounds = () => {
      const bounds = mapInstance.getBounds();
      const center = mapInstance.getCenter();
      if (bounds && center) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const leafletBounds = L.latLngBounds(
          [sw.lat(), sw.lng()],
          [ne.lat(), ne.lng()]
        );
        const leafletCenter = L.latLng(center.lat(), center.lng());
        onMapMove(leafletBounds, leafletCenter);
      }
    };

    // Try immediately (bounds may be available)
    deliverInitialBounds();
    // Also retry after a short delay in case bounds aren't ready yet
    setTimeout(deliverInitialBounds, 200);

    // Ensure the marker library is fully loaded before creating clusterer.
    // importLibrary is the official Google Maps API way to guarantee library availability.
    try {
      if (typeof google.maps.importLibrary === 'function') {
        await google.maps.importLibrary('marker');
      }
    } catch {
      // importLibrary failed — fall through to polling below
    }

    // If AdvancedMarkerElement is available, create clusterer immediately
    if (google.maps.marker?.AdvancedMarkerElement) {
      createClusterer(mapInstance);
      return;
    }

    // Final fallback: poll with timeout (marker library might still be loading)
    let retries = 0;
    const poll = () => {
      if (!mapInstanceRef.current) return; // Map was unmounted
      if (google.maps.marker?.AdvancedMarkerElement) {
        createClusterer(mapInstance);
      } else if (retries < 200) {
        retries++;
        setTimeout(poll, 50);
      }
    };
    poll();
  }, [createClusterer]);

  // Handle map unmount
  const onUnmount = useCallback(() => {
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.clear();
    markerDivsRef.current.clear();
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.map = null;
      userLocationMarkerRef.current = null;
    }
    mapInstanceRef.current = null;
    setMap(null);
  }, []);

  // Handle map idle (after pan/zoom)
  // Uses ref as fallback to avoid race condition where onIdle fires before
  // React has processed the setMap() state update from onLoad
  const onIdle = useCallback(() => {
    const mapToUse = map || mapInstanceRef.current;
    if (!mapToUse) return;

    const bounds = mapToUse.getBounds();
    const mapCenter = mapToUse.getCenter();
    const currentZoom = mapToUse.getZoom();

    if (bounds && mapCenter && currentZoom !== undefined) {
      setZoom(currentZoom);
      setCenter({ lat: mapCenter.lat(), lng: mapCenter.lng() });

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const leafletBounds = L.latLngBounds(
        [sw.lat(), sw.lng()],
        [ne.lat(), ne.lng()]
      );
      const leafletCenter = L.latLng(mapCenter.lat(), mapCenter.lng());

      onMapMove(leafletBounds, leafletCenter);
    }
  }, [map, onMapMove]);

  // Close the property popup on zoom in/out. Without this the popup stays open
  // and MapPopupOverlay re-projects + replays its open animation on every zoom
  // step, so the card visibly "refreshes" the whole time the user is zooming.
  // Dismissing it on zoom keeps the interaction clean.
  useEffect(() => {
    const mapToUse = map || mapInstanceRef.current;
    if (!mapToUse) return;
    const listener = mapToUse.addListener('zoom_changed', () => {
      setSelectedProperty(null);
    });
    return () => listener.remove();
  }, [map]);

  // Close the property popup when the user clicks anywhere on the map outside
  // the card (marker clicks stop propagation, so this only fires on empty map).
  // Skipped while measuring, where a map click adds a measurement point instead.
  useEffect(() => {
    const mapToUse = map || mapInstanceRef.current;
    if (!mapToUse || showMeasurement) return;
    const listener = mapToUse.addListener('click', () => {
      setSelectedProperty(null);
    });
    return () => listener.remove();
  }, [map, showMeasurement]);

  // Update map type when it changes (styles are controlled via mapId in Cloud Console)
  useEffect(() => {
    if (!map || !isLoaded) return;
    const newMapType = getMapTypeId();
    map.setMapTypeId(newMapType);
    lastMapTypeRef.current = newMapType;
  }, [map, mapStyle, isLoaded, getMapTypeId]);

  // Apply map styles + street view control when mapStyle changes
  // Note: When mapId is set, styles are controlled via Cloud Console — skip client-side styles
  useEffect(() => {
    if (!map || !isLoaded) return;
    const isSatellite = mapStyle === 'satellite' || mapStyle === 'hybrid';
    const isStreet = mapStyle === 'street';

    const opts: google.maps.MapOptions = {
      streetViewControl: isStreet,
    };
    if (!GOOGLE_MAPS_MAP_ID) {
      opts.styles = isSatellite ? [] : getMapStyles();
    }
    map.setOptions(opts);
  }, [map, mapStyle, isLoaded, getMapStyles, showLandmarks]);

  // Handle 3D buildings toggle - tilt the map for 3D view
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (show3DBuildings) {
      // Enable 3D view with tilt
      map.setTilt(45);
      // Zoom in if needed for buildings to show
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < 15) {
        map.setZoom(15);
      }
    } else {
      // Reset to flat view
      map.setTilt(0);
    }
  }, [show3DBuildings, map, isLoaded]);

  // Handle measurement mode - add click listener for drawing
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (showMeasurement) {
      // Switch to satellite for better visibility
      setMapStyle('satellite');

      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          setMeasurementPoints(prev => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }]);
        }
      });

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }
    // Note: We don't clear measurement points when disabled so saved measurements remain visible
  }, [showMeasurement, map, isLoaded]);

  // Calculate measurement values (must be before handlers that use them)
  const measurementDistance = useMemo(() => {
    if (measurementPoints.length < 2) return 0;
    return calculateTotalDistance(measurementPoints);
  }, [measurementPoints]);

  const measurementArea = useMemo(() => {
    if (measurementPoints.length < 3) return 0;
    return calculatePolygonArea(measurementPoints);
  }, [measurementPoints]);

  const measurementPerimeter = useMemo(() => {
    if (measurementPoints.length < 3) return 0;
    const perim = calculateTotalDistance(measurementPoints);
    // Add closing segment
    return perim + calculateDistance(measurementPoints[measurementPoints.length - 1], measurementPoints[0]);
  }, [measurementPoints]);

  // Open save modal for current measurement
  const handleOpenSaveModal = useCallback(() => {
    if (measurementPoints.length < 2) return;
    if (measurementMode === 'area' && measurementPoints.length < 3) return;

    const newMeasurement: LocalMeasurement = {
      id: `measurement-${Date.now()}`,
      points: [...measurementPoints],
      mode: measurementMode,
      distance: measurementDistance,
      area: measurementArea,
      perimeter: measurementPerimeter,
      createdAt: Date.now(),
    };

    setPendingMeasurement(newMeasurement);
    setMeasurementName('');
    setMeasurementAddress('');
    setMeasurementNotes('');
    setMeasurementSaveError(null); // Clear any previous error
    setShowSaveModal(true);
  }, [measurementPoints, measurementMode, measurementDistance, measurementArea, measurementPerimeter]);

  // Save measurement to backend with proper validation
  const handleSaveMeasurementToBackend = useCallback(async () => {
    if (!pendingMeasurement || !measurementName.trim()) return;

    // Clear any previous error
    setMeasurementSaveError(null);
    setSavingMeasurement(true);

    try {
      if (isAuthenticated) {
        // Check if at limit before attempting to save
        if (isAtMeasurementLimit) {
          throw new MeasurementLimitExceededError(measurementCount, measurementMaxAllowed, measurementIsPro);
        }

        // Use the domain use case for proper validation
        const saveMeasurementUseCase = new SaveMeasurementUseCase(measurementRepository);
        const result = await saveMeasurementUseCase.execute({
          name: measurementName.trim(),
          points: pendingMeasurement.points,
          type: pendingMeasurement.mode,
          distance: pendingMeasurement.distance,
          area: pendingMeasurement.area,
          perimeter: pendingMeasurement.perimeter,
          address: measurementAddress.trim() || undefined,
          notes: measurementNotes.trim() || undefined,
        });

        // Update the limit state after successful save
        setMeasurementCount(result.count);
        setIsAtMeasurementLimit(result.count >= result.maxAllowed);
      }

      // Clear all measurement lines from map after saving
      setLocalMeasurements([]);
      setMeasurementPoints([]);
      setShowSaveModal(false);
      setPendingMeasurement(null);
    } catch (error: any) {
      // Error removed

      // Handle specific error types
      if (error instanceof MeasurementLimitExceededError) {
        setMeasurementSaveError(
          error.isPro
            ? `You've reached the maximum limit of ${error.maxAllowed} measurements.`
            : `Free users can save up to ${error.maxAllowed} measurements. Upgrade to Pro for more!`
        );
        setIsAtMeasurementLimit(true);
        // Don't close modal - show the error
        return;
      } else if (error instanceof InvalidMeasurementError) {
        setMeasurementSaveError(error.message);
        return;
      } else {
        // Generic error - clear measurements and show error
        setMeasurementSaveError('Failed to save to your profile. Please try again.');
        setLocalMeasurements([]);
        setMeasurementPoints([]);
        // Close after a delay to show the message
        setTimeout(() => {
          setShowSaveModal(false);
          setPendingMeasurement(null);
          setMeasurementSaveError(null);
        }, 2000);
      }
    } finally {
      setSavingMeasurement(false);
    }
  }, [pendingMeasurement, measurementName, measurementAddress, measurementNotes, isAuthenticated, isAtMeasurementLimit, measurementCount, measurementMaxAllowed, measurementIsPro]);

  // Quick save/keep - just clears the current drawing (for non-authenticated users)
  const handleQuickSave = useCallback(() => {
    if (measurementPoints.length < 2) return;
    if (measurementMode === 'area' && measurementPoints.length < 3) return;

    // Clear all measurement lines from map
    setLocalMeasurements([]);
    setMeasurementPoints([]);
  }, [measurementPoints, measurementMode]);

  // Compute offsets for properties sharing the same coordinates
  const colocatedOffsets = useMemo(() => {
    const offsets = new Map<string, { lat: number; lng: number }>();
    const PRECISION = 5;
    const OFFSET_RADIUS = 0.00015;
    const groups = new Map<string, Property[]>();
    for (const prop of validProperties) {
      if (prop.lat == null || prop.lng == null) continue;
      const key = `${prop.lat.toFixed(PRECISION)},${prop.lng.toFixed(PRECISION)}`;
      const group = groups.get(key);
      if (group) group.push(prop);
      else groups.set(key, [prop]);
    }
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      const step = (2 * Math.PI) / group.length;
      for (let i = 0; i < group.length; i++) {
        const angle = i * step;
        offsets.set(group[i].id, {
          lat: OFFSET_RADIUS * Math.cos(angle),
          lng: OFFSET_RADIUS * Math.sin(angle),
        });
      }
    }
    return offsets;
  }, [validProperties]);

  // Build or update map markers. First call does a full clear + entrance animation.
  // Subsequent calls diff against existing markers to avoid the "all markers disappear"
  // flicker that was visible when zooming or panning triggered a property list refresh.
  const createAllMarkers = useCallback((props: Property[], mapToUse: google.maps.Map) => {
    if (!clustererRef.current) return;

    // Inner helper: build one marker div + AdvancedMarkerElement
    const makeMarker = (property: Property, animate: boolean, idx: number, total: number) => {
      const markerDiv = document.createElement('div');
      markerDiv.className = 'property-marker';
      markerDiv.dataset.propertyId = property.id;

      const price = formatMarkerPrice(property);
      const color = PROPERTY_TYPE_COLORS[property.propertyType || 'other'] || PROPERTY_TYPE_COLORS.other;
      const isActivelyPromoted = property.isPromoted && property.promotionEndDate && property.promotionEndDate > Date.now();
      let borderColor = 'white';
      let borderWidth = 2;
      if (isActivelyPromoted && property.promotionTier) {
        borderColor = PROMOTION_TIER_COLORS[property.promotionTier] || PROMOTION_TIER_COLORS.standard;
        borderWidth = 3;
      }

      if (isActivelyPromoted && property.promotionTier) {
        markerDiv.classList.add(`promoted-marker-${property.promotionTier}`);
      }

      markerDiv.style.cssText = `
        padding: 2px 6px;
        background: ${color};
        border: ${borderWidth}px solid ${borderColor};
        border-radius: 999px;
        color: white;
        font-weight: 700;
        font-size: 10px;
        font-family: Inter, system-ui, sans-serif;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        white-space: nowrap;
        user-select: none;
        transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
      `;

      if (animate) {
        const goldenAngle = 137.508 * (Math.PI / 180);
        const maxStagger = 2000;
        const angle = idx * goldenAngle;
        const distance = 400 + (idx % 7) * 80;
        const flyX = Math.round(Math.cos(angle) * distance);
        const flyY = Math.round(Math.sin(angle) * distance);
        const flyR = Math.round(Math.cos(angle * 2) * 25);
        const delay = total > 1 ? Math.round((idx / (total - 1)) * maxStagger) : 0;
        markerDiv.classList.add('gmarker-entrance-fly');
        markerDiv.style.setProperty('--fly-x', `${flyX}px`);
        markerDiv.style.setProperty('--fly-y', `${flyY}px`);
        markerDiv.style.setProperty('--fly-r', `${flyR}deg`);
        markerDiv.style.setProperty('--fly-delay', `${delay}ms`);
        setTimeout(() => {
          markerDiv.classList.remove('gmarker-entrance-fly');
          markerDiv.style.removeProperty('--fly-x');
          markerDiv.style.removeProperty('--fly-y');
          markerDiv.style.removeProperty('--fly-r');
          markerDiv.style.removeProperty('--fly-delay');
        }, delay + 900);
      }

      markerDiv.textContent = price;

      markerDiv.onmouseenter = () => {
        if (!markerDiv.classList.contains('marker-highlighted') && !markerDiv.classList.contains('gmarker-entrance-fly')) {
          markerDiv.style.transform = 'scale(1.25) translateY(-2px)';
          markerDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)';
          markerDiv.style.zIndex = '1000';
        }
      };
      markerDiv.onmouseleave = () => {
        if (!markerDiv.classList.contains('marker-highlighted') && !markerDiv.classList.contains('gmarker-entrance-fly')) {
          markerDiv.style.transform = '';
          markerDiv.style.boxShadow = '';
          markerDiv.style.zIndex = isActivelyPromoted ? '100' : '1';
        }
      };
      markerDiv.onclick = (e) => {
        e.stopPropagation();
        setSelectedProperty(property);
        mapToUse.panTo({ lat: property.lat, lng: property.lng });
      };

      const posOffset = colocatedOffsets.get(property.id);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: {
          lat: posOffset ? property.lat + posOffset.lat : property.lat,
          lng: posOffset ? property.lng + posOffset.lng : property.lng,
        },
        content: markerDiv,
        zIndex: isActivelyPromoted ? 100 : 1,
      });

      return { marker, markerDiv, isActivelyPromoted };
    };

    const isFirstLoad = !hasAnimatedEntranceRef.current;

    if (isFirstLoad) {
      // First load: full clear + recreate with entrance fly-in animation
      clustererRef.current.clearMarkers();
      markersRef.current.clear();
      markerDivsRef.current.clear();
      promotedMarkersRef.current.forEach(m => { m.map = null; });
      promotedMarkersRef.current = [];

      if (props.length === 0) return;
      hasAnimatedEntranceRef.current = true;

      const regularMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
      const promotedMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

      for (let i = 0; i < props.length; i++) {
        const { marker, markerDiv, isActivelyPromoted } = makeMarker(props[i], true, i, props.length);
        markersRef.current.set(props[i].id, marker);
        markerDivsRef.current.set(props[i].id, markerDiv);
        if (isActivelyPromoted) {
          marker.map = mapToUse;
          promotedMarkers.push(marker);
        } else {
          regularMarkers.push(marker);
        }
      }

      clustererRef.current.addMarkers(regularMarkers);
      promotedMarkersRef.current = promotedMarkers;

      if ((window as any).__balkanestateSplashDone) {
        setTimeout(() => { delete (window as any).__balkanestateSplashDone; }, 3500);
      }
      return;
    }

    // Subsequent updates: diff-based — keep markers that are still valid,
    // remove those that left the viewport, add newly visible ones.
    // This eliminates the "all markers gone for 150ms" flicker on zoom/pan.
    if (props.length === 0) {
      clustererRef.current.clearMarkers();
      markersRef.current.clear();
      markerDivsRef.current.clear();
      promotedMarkersRef.current.forEach(m => { m.map = null; });
      promotedMarkersRef.current = [];
      return;
    }

    const newPropIds = new Set(props.map(p => p.id));

    // Remove markers no longer in the incoming list
    const staleRegular: google.maps.marker.AdvancedMarkerElement[] = [];
    markersRef.current.forEach((marker, id) => {
      if (!newPropIds.has(id)) {
        staleRegular.push(marker);
        markersRef.current.delete(id);
        markerDivsRef.current.delete(id);
      }
    });
    promotedMarkersRef.current = promotedMarkersRef.current.filter(marker => {
      const div = marker.content as HTMLElement;
      const id = div?.dataset?.propertyId;
      if (id && !newPropIds.has(id)) { marker.map = null; return false; }
      return true;
    });
    if (staleRegular.length > 0) {
      clustererRef.current.removeMarkers(staleRegular, true); // noDraw — batch with add below
    }

    // Add markers for properties not yet on the map
    const toAdd = props.filter(p => !markersRef.current.has(p.id));
    const newRegular: google.maps.marker.AdvancedMarkerElement[] = [];
    for (const property of toAdd) {
      const { marker, markerDiv, isActivelyPromoted } = makeMarker(property, false, 0, 0);
      markersRef.current.set(property.id, marker);
      markerDivsRef.current.set(property.id, markerDiv);
      if (isActivelyPromoted) {
        marker.map = mapToUse;
        promotedMarkersRef.current.push(marker);
      } else {
        newRegular.push(marker);
      }
    }

    if (newRegular.length > 0) {
      clustererRef.current.addMarkers(newRegular, false); // triggers single cluster re-render
    } else if (staleRegular.length > 0) {
      clustererRef.current.render(); // only removals happened — force cluster refresh
    }
  }, [colocatedOffsets]);

  // Update markers when properties change — debounced to avoid rapid clear/recreate
  // cycles during initial load (API fetch + WebSocket updates can fire in quick succession)
  useEffect(() => {
    const mapToUse = map || mapInstanceRef.current;
    if (!mapToUse || !clustererRef.current || !isLoaded || !markersReady) return;

    // Debounce: wait 150ms for properties to settle before creating markers
    // This prevents the scenario where rapid property updates cause markers
    // to be cleared and never fully recreated
    if (markerCreationTimerRef.current) {
      clearTimeout(markerCreationTimerRef.current);
    }

    markerCreationTimerRef.current = setTimeout(() => {
      createAllMarkers(validProperties, mapToUse);
    }, 150);

    return () => {
      if (markerCreationTimerRef.current) {
        clearTimeout(markerCreationTimerRef.current);
      }
    };
  }, [validProperties, map, isLoaded, markersReady, createAllMarkers]);

  // Animated "you are here" marker — created once permission is granted and a
  // valid fix is available, removed the moment location becomes unavailable
  // again (e.g. permission revoked mid-session).
  useEffect(() => {
    const mapToUse = map || mapInstanceRef.current;
    if (!mapToUse || !isLoaded) return;

    if (!validUserLocation) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.map = null;
        userLocationMarkerRef.current = null;
      }
      return;
    }

    injectUserLocationMarkerStyles();
    const position = { lat: validUserLocation[0], lng: validUserLocation[1] };
    const label = t('search:map.myLocation', 'My Location');

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.position = position;
      return;
    }

    const content = createUserLocationMarkerElement(label);
    // Seed the initial zoom-proportional scale before it's on screen.
    content.style.setProperty('--ulm-zoom-scale', String(userLocationScaleForZoom(mapToUse.getZoom() ?? DEFAULT_ZOOM)));
    content.addEventListener('click', () => {
      mapToUse.panTo(position);
    });

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: mapToUse,
      position,
      content,
      zIndex: 500,
      title: label,
    });
    userLocationMarkerRef.current = marker;
  }, [map, isLoaded, validUserLocation, t]);

  // Keep the location marker proportionate to the zoom level: shrink it as the
  // user zooms out so it never blankets the map at country/continent scale.
  useEffect(() => {
    const mapToUse = map || mapInstanceRef.current;
    if (!mapToUse) return;

    const applyScale = () => {
      const el = userLocationMarkerRef.current?.content as HTMLElement | null;
      if (!el) return;
      const z = mapToUse.getZoom() ?? DEFAULT_ZOOM;
      el.style.setProperty('--ulm-zoom-scale', String(userLocationScaleForZoom(z)));
    };

    applyScale();
    const listener = mapToUse.addListener('zoom_changed', applyScale);
    return () => listener.remove();
  }, [map, validUserLocation]);

  // Distance from the user's location to the currently opened property popup —
  // gives a quick "how far is this" sense without leaving the map.
  const selectedPropertyDistanceLabel = useMemo(() => {
    if (!validUserLocation || !selectedProperty) return null;
    if (selectedProperty.lat == null || selectedProperty.lng == null) return null;

    const meters = calculateDistance(
      { lat: validUserLocation[0], lng: validUserLocation[1] },
      { lat: selectedProperty.lat, lng: selectedProperty.lng }
    );
    return formatMeasureDistance(meters);
  }, [validUserLocation, selectedProperty]);

  // Handle hover state changes from property list - use CSS classes for better performance
  useEffect(() => {
    markerDivsRef.current.forEach((div, id) => {
      const isHovered = id === hoveredPropertyId;
      const prop = validProperties.find(p => p.id === id);
      const isPromoted = prop?.isPromoted && prop?.promotionEndDate && prop.promotionEndDate > Date.now();

      if (isHovered) {
        div.classList.add('marker-highlighted');
        // Force styles for highlighted state
        div.style.transform = 'scale(1.3) translateY(-4px)';
        div.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
        div.style.zIndex = '2000';
      } else {
        div.classList.remove('marker-highlighted');
        // Reset to default styles
        div.style.transform = '';
        div.style.boxShadow = '';
        div.style.zIndex = isPromoted ? '100' : '1';
      }
    });
  }, [hoveredPropertyId, validProperties]);

  // Handle flyTo target - smooth cinematic animation
  useEffect(() => {
    if (!map || !flyToTarget) return;

    const targetLat = flyToTarget.center[0];
    const targetLng = flyToTarget.center[1];
    const targetZoom = flyToTarget.zoom;
    const currentZoom = map.getZoom() || 10;
    const currentCenter = map.getCenter();

    // Calculate distance to target (rough approximation)
    const distance = currentCenter
      ? Math.sqrt(
          Math.pow(currentCenter.lat() - targetLat, 2) +
          Math.pow(currentCenter.lng() - targetLng, 2)
        )
      : 1;

    // For short distances, just do a simple smooth pan
    if (distance < 0.1 && Math.abs(currentZoom - targetZoom) < 3) {
      map.panTo({ lat: targetLat, lng: targetLng });
      setTimeout(() => {
        if (map) map.setZoom(targetZoom);
        onFlyComplete();
      }, 500);
      return;
    }

    // Cinematic fly animation for longer distances:
    // 1. Zoom out to show context
    // 2. Pan to target
    // 3. Zoom in to target level

    // Calculate intermediate zoom (zoomed out view)
    const intermediateZoom = Math.max(8, Math.min(currentZoom, targetZoom) - 4);

    // Step 1: Zoom out
    map.setZoom(intermediateZoom);

    // Step 2: After zoom out, pan to target location
    setTimeout(() => {
      if (!map) return;
      map.panTo({ lat: targetLat, lng: targetLng });

      // Step 3: After pan, zoom in to target
      setTimeout(() => {
        if (!map) return;

        // Gradually zoom in for smooth effect
        const zoomSteps = 3;
        const zoomDiff = targetZoom - intermediateZoom;
        const stepDelay = 200;

        for (let i = 1; i <= zoomSteps; i++) {
          setTimeout(() => {
            if (map) {
              const stepZoom = intermediateZoom + (zoomDiff * (i / zoomSteps));
              map.setZoom(Math.round(stepZoom));
            }
          }, stepDelay * i);
        }

        // Complete after all animations
        setTimeout(onFlyComplete, stepDelay * zoomSteps + 200);
      }, 600);
    }, 400);
  }, [flyToTarget, map, onFlyComplete]);

  // Fit map to drawnBounds when they exist (for saved searches)
  useEffect(() => {
    if (!map || !drawnBounds) return;

    // Only fit bounds if there's no flyToTarget (which handles positioning)
    // and if drawnBounds changed
    try {
      const sw = drawnBounds.getSouthWest();
      const ne = drawnBounds.getNorthEast();

      const bounds = new google.maps.LatLngBounds(
        { lat: sw.lat, lng: sw.lng },
        { lat: ne.lat, lng: ne.lng }
      );

      // Fit the map to show the drawn bounds with some padding
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } catch (e) {
      // Error removed
    }
  }, [map, drawnBounds]);

  // Handle view details click
  const handleViewDetails = useCallback((propertyId: string) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
    window.history.pushState({}, '', buildLocalizedPath(`/property/${propertyId}`));
    window.dispatchEvent(new PopStateEvent('popstate'));
    setSelectedProperty(null);
  }, [dispatch]);

  // Handle recenter
  const handleRecenter = useCallback(() => {
    if (!map) return;

    if (validUserLocation) {
      map.panTo({ lat: validUserLocation[0], lng: validUserLocation[1] });
      map.setZoom(13);
    } else {
      map.panTo(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    }
    onRecenter();
  }, [map, validUserLocation, onRecenter]);

  // Cadastre layer overlay effect
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Helper to remove existing cadastre overlay
    const removeCadastreLayer = () => {
      if (cadastreLayerRef.current) {
        const overlays = map.overlayMapTypes;
        for (let i = overlays.getLength() - 1; i >= 0; i--) {
          if (overlays.getAt(i) === cadastreLayerRef.current) {
            overlays.removeAt(i);
          }
        }
        cadastreLayerRef.current = null;
      }
    };

    // Remove click listener and info window
    const removeClickListener = () => {
      if (cadastreClickListenerRef.current) {
        google.maps.event.removeListener(cadastreClickListenerRef.current);
        cadastreClickListenerRef.current = null;
      }
      if (cadastreInfoWindowRef.current) {
        cadastreInfoWindowRef.current.close();
      }
    };

    removeCadastreLayer();
    removeClickListener();

    if (!showCadastre) {
      return;
    }

    const mapCenter = map.getCenter();
    if (!mapCenter) return;

    const cadastreConfig = getCadastreLayerForLocation(mapCenter.lat(), mapCenter.lng());
    if (!cadastreConfig) return;

    const latLngToMercator = (lat: number, lng: number): { x: number; y: number } => {
      const x = lng * 20037508.34 / 180;
      let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
      y = y * 20037508.34 / 180;
      return { x, y };
    };

    // Lower REQUEST_SIZE relative to TILE_SIZE = bigger parcel numbers on screen
    // Server renders 256px image which displays at 256px = native size labels
    const TILE_SIZE = 256;
    const REQUEST_SIZE = 256;

    const getCrs = () => cadastreConfig.additionalParams?.CRS || 'EPSG:4326';

    const computeBbox = (sw: google.maps.LatLng, ne: google.maps.LatLng) => {
      const crs = getCrs();
      if (crs === 'EPSG:3857') {
        const swMerc = latLngToMercator(sw.lat(), sw.lng());
        const neMerc = latLngToMercator(ne.lat(), ne.lng());
        return `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;
      }
      return `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`;
    };

    const createWmsLayer = () => {
      return new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const minZoom = cadastreConfig.minZoom || CADASTRE_MIN_ZOOM;
          if (zoom < minZoom) return '';

          const proj = map.getProjection();
          if (!proj) return '';

          const zfactor = Math.pow(2, zoom);
          const topLeft = new google.maps.Point(
            (coord.x * TILE_SIZE) / zfactor,
            (coord.y * TILE_SIZE) / zfactor
          );
          const bottomRight = new google.maps.Point(
            ((coord.x + 1) * TILE_SIZE) / zfactor,
            ((coord.y + 1) * TILE_SIZE) / zfactor
          );

          const sw = proj.fromPointToLatLng(new google.maps.Point(topLeft.x, bottomRight.y));
          const ne = proj.fromPointToLatLng(new google.maps.Point(bottomRight.x, topLeft.y));
          if (!sw || !ne) return '';

          const params = new URLSearchParams({
            SERVICE: 'WMS',
            VERSION: cadastreConfig.version || '1.3.0',
            REQUEST: 'GetMap',
            LAYERS: cadastreConfig.layers,
            STYLES: '',
            FORMAT: cadastreConfig.format || 'image/png',
            TRANSPARENT: 'true',
            WIDTH: String(REQUEST_SIZE),
            HEIGHT: String(REQUEST_SIZE),
            CRS: getCrs(),
            BBOX: computeBbox(sw, ne),
          });

          return `${cadastreConfig.wmsUrl}?${params.toString()}`;
        },
        tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
        opacity: 0.7,
        name: 'Cadastre',
      });
    };

    const wmsLayer = createWmsLayer();
    map.overlayMapTypes.push(wmsLayer);
    cadastreLayerRef.current = wmsLayer;

    // Click handler - WMS GetFeatureInfo for parcel details
    if (!cadastreInfoWindowRef.current) {
      cadastreInfoWindowRef.current = new google.maps.InfoWindow();
    }
    const infoWindow = cadastreInfoWindowRef.current;

    const handleCadastreClick = async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const zoom = map.getZoom();
      const minZoom = cadastreConfig.minZoom || CADASTRE_MIN_ZOOM;
      if (!zoom || zoom < minZoom) return;

      const mapDiv = map.getDiv();
      if (!mapDiv) return;
      const mapWidth = mapDiv.offsetWidth;
      const mapHeight = mapDiv.offsetHeight;
      const bounds = map.getBounds();
      if (!bounds) return;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      if (!sw || !ne) return;

      // Calculate pixel position of click within the map viewport
      const lngRange = ne.lng() - sw.lng();
      const latRange = ne.lat() - sw.lat();
      const i = Math.round(((e.latLng.lng() - sw.lng()) / lngRange) * mapWidth);
      const j = Math.round(((ne.lat() - e.latLng.lat()) / latRange) * mapHeight);

      const crs = getCrs();
      let bbox: string;
      if (crs === 'EPSG:3857') {
        const swMerc = latLngToMercator(sw.lat(), sw.lng());
        const neMerc = latLngToMercator(ne.lat(), ne.lng());
        bbox = `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;
      } else {
        bbox = `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`;
      }

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: cadastreConfig.version || '1.3.0',
        REQUEST: 'GetFeatureInfo',
        LAYERS: cadastreConfig.layers,
        QUERY_LAYERS: cadastreConfig.layers,
        INFO_FORMAT: 'application/json',
        FEATURE_COUNT: '1',
        I: String(i),
        J: String(j),
        WIDTH: String(mapWidth),
        HEIGHT: String(mapHeight),
        CRS: crs,
        BBOX: bbox,
      });

      // Show loading state
      infoWindow.setContent('<div style="padding:8px;font-family:system-ui,sans-serif;font-size:13px;color:#666;">Loading parcel info...</div>');
      infoWindow.setPosition(e.latLng);
      infoWindow.open(map);

      try {
        // Use backend proxy to avoid CORS issues with government WMS servers
        const wmsUrl = `${cadastreConfig.wmsUrl}?${params.toString()}`;
        const proxyUrl = `/api/cadastre/feature-info?url=${encodeURIComponent(wmsUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        let features: any[] = [];

        if (contentType.includes('json')) {
          const data = await response.json();
          features = data.features || [];
        } else {
          const text = await response.text();
          if (text.includes('numberReturned="0"')) {
            features = [];
          } else {
            // Attempt basic extraction from GML/XML responses
            const idMatch = text.match(/(?:nationalCadastralReference|inspireId|gml:id|PARCEL_ID|fid)(?:>|=")([^<"]+)/);
            const areaMatch = text.match(/(?:areaValue|area|AREA|surface)>([^<]+)/);
            const labelMatch = text.match(/(?:label|LABEL|name|NAME)>([^<]+)/);
            const municMatch = text.match(/(?:administrativeUnit|municipality|MUNICIPALITY|KO_NAME)>([^<]+)/);
            if (idMatch || areaMatch) {
              features = [{
                properties: {
                  ...(idMatch ? { id: idMatch[1] } : {}),
                  ...(areaMatch ? { area: areaMatch[1] } : {}),
                  ...(labelMatch ? { label: labelMatch[1] } : {}),
                  ...(municMatch ? { municipality: municMatch[1] } : {}),
                }
              }];
            }
          }
        }

        if (features.length > 0) {
          const props = features[0].properties || {};
          const parcelId = props.nationalCadastralReference || props.inspireId || props.id || props.ID || props.gml_id || props.PARCEL_ID || props.parcel_id || props.fid || '';
          const area = props.areaValue || props.area || props.AREA || props.Area || props.surface || props.SURFACE || '';
          const label = props.label || props.LABEL || props.name || props.NAME || '';
          const municipality = props.administrativeUnit || props.municipality || props.MUNICIPALITY || props.KO_NAME || props.cadastralZoning || '';

          const areaStr = area ? `${Number(area).toLocaleString()} m²` : '';
          const rows = [
            parcelId && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Parcel ID</td><td style="font-weight:600;">${parcelId}</td></tr>`,
            areaStr && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Area</td><td style="font-weight:600;">${areaStr}</td></tr>`,
            label && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Label</td><td style="font-weight:600;">${label}</td></tr>`,
            municipality && `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;">Municipality</td><td style="font-weight:600;">${municipality}</td></tr>`,
          ].filter(Boolean);

          // Show all other properties the user might find useful
          const shownKeys = new Set(['nationalCadastralReference', 'inspireId', 'id', 'ID', 'gml_id', 'PARCEL_ID', 'parcel_id', 'fid', 'areaValue', 'area', 'AREA', 'Area', 'surface', 'SURFACE', 'label', 'LABEL', 'name', 'NAME', 'administrativeUnit', 'municipality', 'MUNICIPALITY', 'KO_NAME', 'cadastralZoning', 'bbox', 'geometry']);
          const extraRows = Object.entries(props)
            .filter(([key]) => !shownKeys.has(key))
            .slice(0, 6)
            .map(([key, val]) => `<tr><td style="color:#888;padding:2px 8px 2px 0;white-space:nowrap;text-transform:capitalize;">${key.replace(/_/g, ' ')}</td><td style="font-weight:600;">${val}</td></tr>`);

          const allRows = [...rows, ...extraRows];

          const html = `
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;min-width:200px;">
              <div style="font-weight:700;font-size:15px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #e5720e;color:#333;">
                📋 Cadastre Parcel
              </div>
              ${allRows.length > 0 ? `<table style="border-collapse:collapse;">${allRows.join('')}</table>` : '<div style="color:#888;">No details available for this location</div>'}
              <div style="margin-top:8px;font-size:11px;color:#999;">${cadastreConfig.attribution}</div>
            </div>`;
          infoWindow.setContent(html);
        } else {
          infoWindow.close();
        }
      } catch {
        infoWindow.close();
      }
    };

    cadastreClickListenerRef.current = map.addListener('click', handleCadastreClick);

    // Refresh on zoom changes - only update visibility, don't recreate the layer
    // Google Maps ImageMapType handles tile loading/caching natively per zoom level.
    // Recreating the layer on every zoom kills performance because it forces all
    // tiles to be re-fetched from slow government WMS servers.

    // Update when map moves to a different country
    const cadastreCountryRef = { current: cadastreConfig.countryCode };
    const handleIdle = () => {
      const newCenter = map.getCenter();
      if (!newCenter) return;
      const newConfig = getCadastreLayerForLocation(newCenter.lat(), newCenter.lng());
      if (newConfig?.countryCode !== cadastreCountryRef.current) {
        cadastreCountryRef.current = newConfig?.countryCode || '';
        // Country changed - remove old layer and add new one for the new country's WMS
        removeCadastreLayer();
        removeClickListener();
        if (newConfig) {
          const newLayer = createWmsLayer();
          map.overlayMapTypes.push(newLayer);
          cadastreLayerRef.current = newLayer;
        }
      }
    };

    const idleListener = map.addListener('idle', handleIdle);

    return () => {
      google.maps.event.removeListener(idleListener);
      removeClickListener();
      removeCadastreLayer();
    };
  }, [map, isLoaded, showCadastre]);

  // Climate risk layer overlay effect
  // Data sources:
  //   - Flood: RainViewer precipitation radar (free, no API key)
  //   - Fire:  EFFIS Copernicus VIIRS fires via WMS (free, no API key)
  //   - Wind:  OWM tiles if key set, else Open-Meteo canvas overlay (free)
  //   - Air:   AQICN EPA AQI tiles (free, no API key)
  //   - Heat:  OWM tiles if key set, else Open-Meteo canvas overlay (free)
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove existing climate overlay
    if (climateLayerRef.current) {
      map.overlayMapTypes.forEach((overlay, index) => {
        if (overlay === climateLayerRef.current) {
          map.overlayMapTypes.removeAt(index);
        }
      });
      climateLayerRef.current = null;
    }

    if (selectedClimateRisk === 'none') return;

    // Resolve tile URL and layer config based on risk type
    let tileUrl: string | null = null;
    let layerOpacity = 0.6;
    let layerName = '';
    let isWms = false;

    switch (selectedClimateRisk) {
      case 'flood':
        // RainViewer: free precipitation radar, no API key needed
        tileUrl = rainViewerTileUrl;
        layerOpacity = 0.7;
        layerName = 'Precipitation Radar (RainViewer)';
        break;
      case 'fire':
        isWms = true;
        layerOpacity = 0.7;
        layerName = 'Fire Danger (EFFIS Copernicus)';
        break;
      case 'wind':
        if (mapServices.owm) {
          tileUrl = weatherTileProxyUrl('wind_new');
        }
        layerOpacity = 0.5;
        layerName = 'Wind Speed';
        break;
      case 'air':
        tileUrl = 'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png';
        layerOpacity = 0.6;
        layerName = 'Air Quality (AQICN)';
        break;
      case 'heat':
        if (mapServices.owm) {
          tileUrl = weatherTileProxyUrl('temp_new');
        }
        layerOpacity = 0.5;
        layerName = 'Temperature';
        break;
    }

    // Skip if no tile URL available (missing proxy service or RainViewer not loaded yet)
    if (!tileUrl && !isWms) return;

    let climateLayer: google.maps.ImageMapType;

    if (isWms) {
      // Fire WMS - compute bounding box per tile
      climateLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          const proj = map.getProjection();
          if (!proj) return '';

          const tileSize = 256;
          const scale = Math.pow(2, zoom);

          const worldCoordinate = (coord.x * tileSize) / scale;
          const worldCoordinate2 = ((coord.x + 1) * tileSize) / scale;
          const worldCoordinateY = (coord.y * tileSize) / scale;
          const worldCoordinateY2 = ((coord.y + 1) * tileSize) / scale;

          const sw = proj.fromPointToLatLng(new google.maps.Point(worldCoordinate, worldCoordinateY2));
          const ne = proj.fromPointToLatLng(new google.maps.Point(worldCoordinate2, worldCoordinateY));
          if (!sw || !ne) return '';

          const swMerc = latLngToWebMercator(sw.lat(), sw.lng());
          const neMerc = latLngToWebMercator(ne.lat(), ne.lng());
          const bbox = `${swMerc.x},${swMerc.y},${neMerc.x},${neMerc.y}`;

          if (mapServices.firms) {
            return firmsWmsProxyUrl(bbox);
          }
          const today = new Date().toISOString().split('T')[0];
          return `https://maps.effis.emergency.copernicus.eu/effis?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=ecmwf007.fwi&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256&TIME=${today}`;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: layerOpacity,
        name: layerName,
      });
    } else {
      // Standard XYZ tile layers (RainViewer, AQICN, OWM)
      const url = tileUrl!;
      climateLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          return url
            .replace('{z}', zoom.toString())
            .replace('{x}', coord.x.toString())
            .replace('{y}', coord.y.toString());
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: layerOpacity,
        name: layerName,
      });
    }

    map.overlayMapTypes.push(climateLayer);
    climateLayerRef.current = climateLayer;

    return () => {
      if (climateLayerRef.current) {
        map.overlayMapTypes.forEach((overlay, index) => {
          if (overlay === climateLayerRef.current) {
            map.overlayMapTypes.removeAt(index);
          }
        });
        climateLayerRef.current = null;
      }
    };
  }, [map, isLoaded, selectedClimateRisk, rainViewerTileUrl, mapServices]);

  // Track Google Maps bounds for Open-Meteo grid data fetching
  useEffect(() => {
    if (!map || !isLoaded) return;
    const update = () => {
      const b = map.getBounds();
      if (!b) return;
      setGmapBounds({
        north: b.getNorthEast().lat(),
        south: b.getSouthWest().lat(),
        east: b.getNorthEast().lng(),
        west: b.getSouthWest().lng(),
      });
    };
    update();
    const listener = map.addListener('idle', update);
    return () => { google.maps.event.removeListener(listener); };
  }, [map, isLoaded]);

  // Open-Meteo overlay for wind/heat on Google Maps (native Circle/Marker primitives)
  const openMeteoMarkersRef = useRef<(google.maps.Circle | google.maps.marker.AdvancedMarkerElement)[]>([]);

  useEffect(() => {
    if (!map || !isLoaded || !markersReady) return;

    // Remove previous markers/circles
    openMeteoMarkersRef.current.forEach(m => {
      if (m instanceof google.maps.Circle) m.setMap(null);
      else if ('map' in m) m.map = null;
    });
    openMeteoMarkersRef.current = [];

    if (!openMeteoData.length || !openMeteoDataType) return;

    if (openMeteoDataType === 'temperature') {
      // Heat: colored circles at each grid point
      openMeteoData.forEach(point => {
        if (point.temperature == null) return;
        const t = point.temperature;

        // Temperature to color
        let color: string;
        if (t <= -10) color = '#313695';
        else if (t <= 0) color = '#4575b4';
        else if (t <= 10) color = '#74add1';
        else if (t <= 18) color = '#fee090';
        else if (t <= 28) color = '#f46d43';
        else if (t <= 36) color = '#d73027';
        else color = '#a50026';

        const circle = new google.maps.Circle({
          center: { lat: point.lat, lng: point.lng },
          radius: 15000, // 15km radius
          fillColor: color,
          fillOpacity: 0.4,
          strokeColor: color,
          strokeOpacity: 0.6,
          strokeWeight: 1,
          map,
          clickable: false,
        });
        openMeteoMarkersRef.current.push(circle);
      });
    } else {
      // Wind: SVG arrow markers at each grid point
      openMeteoData.forEach(point => {
        if (point.windSpeed == null || point.windDirection == null) return;
        const speed = point.windSpeed;
        const dir = point.windDirection;

        let color: string;
        if (speed < 5) color = '#b3e0ff';
        else if (speed < 15) color = '#66c2ff';
        else if (speed < 30) color = '#3399ff';
        else if (speed < 50) color = '#0066cc';
        else color = '#003366';

        const size = Math.min(28, Math.max(14, 12 + speed * 0.35));
        // Sanitize color to prevent injection via CSS/HTML
        const safeColor = /^(#[0-9a-f]{3,8}|rgba?\(\d+,\s*\d+,\s*\d+(,\s*[\d.]+)?\))$/i.test(color) ? color : '#3b82f6';
        const safeDir = Number(dir) || 0;
        const el = document.createElement('div');
        el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
          style="transform:rotate(${safeDir}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
          xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2 L8 14 L12 11 L16 14 Z"
            fill="${safeColor}" stroke="rgba(255,255,255,0.7)" stroke-width="1"/>
        </svg>`;
        el.style.pointerEvents = 'none';

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: point.lat, lng: point.lng },
          map,
          content: el,
        });
        openMeteoMarkersRef.current.push(marker);
      });
    }

    return () => {
      openMeteoMarkersRef.current.forEach(m => {
        if (m instanceof google.maps.Circle) m.setMap(null);
        else if ('map' in m) m.map = null;
      });
      openMeteoMarkersRef.current = [];
    };
  }, [map, isLoaded, markersReady, openMeteoData, openMeteoDataType]);

  // Memoize map options - MUST be before any early returns to maintain hooks order
  // Check if google is defined before accessing google.maps
  const mapOptions = useMemo<google.maps.MapOptions | undefined>(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;

    const opts: google.maps.MapOptions = {
      restriction: {
        latLngBounds: BALKAN_BOUNDS,
        strictBounds: false,
      },
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      rotateControl: false,
      scaleControl: false,
      panControl: false,
      keyboardShortcuts: false,
      gestureHandling: 'greedy',
      minZoom: 6,
      maxZoom: 21,
      tilt: 0,
      heading: 0,
    };
    // Only set mapId if a valid one is configured (invalid mapId breaks AdvancedMarkerElement)
    if (GOOGLE_MAPS_MAP_ID) {
      opts.mapId = GOOGLE_MAPS_MAP_ID;
    }
    return opts;
  }, [isLoaded]);

  // Convert Leaflet bounds to Google bounds for drawn rectangle
  const googleDrawnBounds = useMemo(() => {
    if (!drawnBounds) return null;
    try {
      const sw = drawnBounds.getSouthWest();
      const ne = drawnBounds.getNorthEast();
      return {
        north: ne.lat,
        south: sw.lat,
        east: ne.lng,
        west: sw.lng,
      };
    } catch (e) {
      // Error removed
      return null;
    }
  }, [drawnBounds]);

  return {
    // Loading
    isLoaded,
    loadError,

    // Map
    map,
    mapOptions,
    onLoad,
    onUnmount,
    onIdle,

    // Position
    initialCenter,
    initialZoom,
    zoom,
    center,

    // Properties
    validProperties,
    promotedCount,

    // Selection
    selectedProperty,
    setSelectedProperty,
    handleViewDetails,
    selectedPropertyDistanceLabel,

    // Drawing
    drawingRect,
    googleDrawnBounds,

    // Map style
    mapStyle,
    setMapStyle,

    // Legend
    isLegendOpen,
    setIsLegendOpen,

    // Layers
    showLandmarks,
    setShowLandmarks,
    show3DBuildings,
    setShow3DBuildings,
    showCadastre,
    setShowCadastre,

    // Measurement
    showMeasurement,
    setShowMeasurement,
    measurementPoints,
    setMeasurementPoints,
    measurementMode,
    setMeasurementMode,
    measurementDistance,
    measurementArea,
    measurementPerimeter,
    localMeasurements,
    setLocalMeasurements,

    // Measurement save
    showSaveModal,
    setShowSaveModal,
    savingMeasurement,
    measurementName,
    setMeasurementName,
    measurementAddress,
    setMeasurementAddress,
    measurementNotes,
    setMeasurementNotes,
    pendingMeasurement,
    setPendingMeasurement,
    measurementSaveError,
    setMeasurementSaveError,
    measurementCount,
    measurementMaxAllowed,
    measurementIsPro,
    isAtMeasurementLimit,
    handleOpenSaveModal,
    handleSaveMeasurementToBackend,
    handleQuickSave,

    // Climate
    selectedClimateRisk,
    setSelectedClimateRisk,
    isClimateMenuOpen,
    setIsClimateMenuOpen,

    // Mobile
    isLayerMenuOpen,
    setIsLayerMenuOpen,

    // Promoted
    showOnlyPromoted,
    setShowOnlyPromoted,

    // Handlers
    handleRecenter,
  };
}
