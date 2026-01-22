// Map3DBuildings Component
// 3D map with extruded buildings using MapLibre GL JS
// OneGeo-inspired 3D visualization with proper building extrusion

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';
import { useShadowTimelapse, type TimePeriod } from '../hooks/useShadowTimelapse';

/**
 * Props for Map3DBuildings component
 */
interface Map3DBuildingsProps {
  lat: number;
  lng: number;
  address?: string;
  title?: string;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  height?: string;
  enableShadowTimelapse?: boolean;
  onNavigateToMap?: () => void;
  // Floor highlighting for apartments
  floorNumber?: number;
  totalFloors?: number;
  propertyType?: 'house' | 'apartment' | 'villa' | 'land' | 'other';
  // 360 Virtual Tour
  virtualTour360Url?: string;
}

/**
 * Lighting configurations for different time periods
 */
const TIME_LIGHTING: Record<TimePeriod, {
  sunAzimuth: number;
  sunAltitude: number;
  ambientIntensity: number;
  directionalIntensity: number;
  buildingColor: string;
  buildingHighlight: string;
  skyColor: string;
  fogColor: string;
}> = {
  night: {
    sunAzimuth: 0,
    sunAltitude: -30,
    ambientIntensity: 0.3,
    directionalIntensity: 0.1,
    buildingColor: '#1a2030',
    buildingHighlight: '#2a3040',
    skyColor: '#0a0a1a',
    fogColor: '#0a0a1a',
  },
  dawn: {
    sunAzimuth: 90,
    sunAltitude: 5,
    ambientIntensity: 0.5,
    directionalIntensity: 0.6,
    buildingColor: '#8a7a6a',
    buildingHighlight: '#9a8a7a',
    skyColor: '#ffaa77',
    fogColor: '#ffd4aa',
  },
  morning: {
    sunAzimuth: 120,
    sunAltitude: 30,
    ambientIntensity: 0.7,
    directionalIntensity: 0.8,
    buildingColor: '#a0a0a0',
    buildingHighlight: '#b8b8b8',
    skyColor: '#87ceeb',
    fogColor: '#e8f4fc',
  },
  noon: {
    sunAzimuth: 180,
    sunAltitude: 70,
    ambientIntensity: 0.9,
    directionalIntensity: 1.0,
    buildingColor: '#b0b0b0',
    buildingHighlight: '#d0d0d0',
    skyColor: '#4a90d9',
    fogColor: '#e0f0ff',
  },
  afternoon: {
    sunAzimuth: 240,
    sunAltitude: 45,
    ambientIntensity: 0.8,
    directionalIntensity: 0.85,
    buildingColor: '#a8a090',
    buildingHighlight: '#c0b8a8',
    skyColor: '#6ba3d9',
    fogColor: '#f0e8d8',
  },
  sunset: {
    sunAzimuth: 270,
    sunAltitude: 10,
    ambientIntensity: 0.5,
    directionalIntensity: 0.7,
    buildingColor: '#907060',
    buildingHighlight: '#a08070',
    skyColor: '#ff7744',
    fogColor: '#ffccaa',
  },
  dusk: {
    sunAzimuth: 280,
    sunAltitude: -5,
    ambientIntensity: 0.35,
    directionalIntensity: 0.3,
    buildingColor: '#504858',
    buildingHighlight: '#605868',
    skyColor: '#443366',
    fogColor: '#554477',
  },
};

const PERIOD_ICONS: Record<TimePeriod, string> = {
  night: '🌙',
  dawn: '🌅',
  morning: '🌤️',
  noon: '☀️',
  afternoon: '🌤️',
  sunset: '🌇',
  dusk: '🌆',
};

/**
 * Map3DBuildings Component - OneGeo-style 3D map
 */
const Map3DBuildings: React.FC<Map3DBuildingsProps> = ({
  lat,
  lng,
  address,
  title,
  zoom = 16,
  pitch = 60,
  bearing = -17,
  height = '500px',
  enableShadowTimelapse = true,
  onNavigateToMap,
  floorNumber,
  totalFloors,
  propertyType,
  virtualTour360Url,
}) => {
  const { t } = useTranslation(['property']);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [showFloorIndicator, setShowFloorIndicator] = useState(true);
  const [show360Tour, setShow360Tour] = useState(false);
  const [isEnteringBuilding, setIsEnteringBuilding] = useState(false);

  // Calculate floor visualization data
  const isApartment = propertyType === 'apartment';
  const hasFloorInfo = isApartment && floorNumber != null && totalFloors != null && totalFloors > 0;
  const floorHeightMeters = 3; // Average floor height
  const buildingHeightMeters = hasFloorInfo ? totalFloors * floorHeightMeters : 0;
  const floorPositionPercent = hasFloorInfo ? ((floorNumber - 0.5) / totalFloors) * 100 : 0;

  // Shadow timelapse hook
  const timelapse = useShadowTimelapse(lat);

  // Add property marker with optional floor indicator
  const addPropertyMarker = useCallback((
    mapInstance: maplibregl.Map,
    latitude: number,
    longitude: number,
    floorNum?: number,
    totalFlrs?: number,
    propType?: string
  ) => {
    const showFloorMarker = propType === 'apartment' && floorNum != null && totalFlrs != null && totalFlrs > 0;

    if (showFloorMarker) {
      // Create a vertical pole with floor indicator for apartments
      const markerEl = document.createElement('div');
      const poleHeight = Math.min(totalFlrs! * 8, 120); // Scale height, max 120px
      const indicatorPosition = ((floorNum - 0.5) / totalFlrs!) * poleHeight;

      markerEl.innerHTML = `
        <div style="position: relative; width: 60px; display: flex; flex-direction: column; align-items: center;">
          <!-- Vertical pole representing building -->
          <div style="
            position: relative;
            width: 8px;
            height: ${poleHeight}px;
            background: linear-gradient(180deg, rgba(100,116,139,0.6), rgba(100,116,139,0.9));
            border-radius: 2px;
            box-shadow: 2px 4px 8px rgba(0,0,0,0.3);
          ">
            <!-- Floor indicator -->
            <div style="
              position: absolute;
              left: 50%;
              bottom: ${indicatorPosition}px;
              transform: translateX(-50%);
              width: 28px;
              height: 14px;
              background: linear-gradient(135deg, #3b82f6, #8b5cf6);
              border-radius: 3px;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(59,130,246,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              animation: floorPulse 2s ease-in-out infinite;
            ">
              <span style="color: white; font-size: 9px; font-weight: bold;">${floorNum}</span>
            </div>
            <!-- Floor label -->
            <div style="
              position: absolute;
              left: 16px;
              bottom: ${indicatorPosition - 2}px;
              white-space: nowrap;
              background: rgba(15,23,42,0.9);
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              color: white;
              font-weight: 500;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              Floor ${floorNum}
            </div>
          </div>
          <!-- Base marker -->
          <div style="
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            margin-top: -2px;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
          <!-- Pulse ring -->
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.3);
            animation: pulse3d 2s ease-in-out infinite;
          "></div>
        </div>
      `;

      new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat([longitude, latitude])
        .addTo(mapInstance);
    } else {
      // Standard marker for houses/villas/land
      const markerEl = document.createElement('div');
      markerEl.innerHTML = `
        <div style="position: relative; width: 48px; height: 48px;">
          <div style="
            position: absolute;
            inset: 0;
            background: rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            animation: pulse3d 2s ease-in-out infinite;
          "></div>
          <div style="
            position: absolute;
            inset: 8px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `;

      new maplibregl.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat([longitude, latitude])
        .addTo(mapInstance);
    }
  }, []);

  // Add custom 3D building cube with floor slices for apartments
  // Uses the actual building geometry from the map data
  const addCustomBuilding3D = useCallback((
    mapInstance: maplibregl.Map,
    latitude: number,
    longitude: number,
    floorNum: number,
    totalFlrs: number
  ) => {
    const floorHeightM = 3; // 3m per floor
    const totalHeightM = totalFlrs * floorHeightM;

    // Query the actual building at this location from the map's building layer
    const point = mapInstance.project([longitude, latitude]);

    let buildingCoords: number[][][] | null = null;
    let buildingFeature: maplibregl.MapGeoJSONFeature | null = null;

    // Try multiple query approaches to find the building
    // 1. First try exact point query on the 3d-buildings layer
    const exactFeatures = mapInstance.queryRenderedFeatures(point, {
      layers: ['3d-buildings']
    });

    if (exactFeatures.length > 0) {
      buildingFeature = exactFeatures[0];
    } else {
      // 2. Try a larger bounding box query
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - 100, point.y - 100],
        [point.x + 100, point.y + 100]
      ];
      const nearbyFeatures = mapInstance.queryRenderedFeatures(bbox, {
        layers: ['3d-buildings']
      });

      // Find the building closest to our point
      if (nearbyFeatures.length > 0) {
        buildingFeature = nearbyFeatures[0];
      }
    }

    // Extract coordinates from the building feature
    if (buildingFeature) {
      if (buildingFeature.geometry.type === 'Polygon') {
        buildingCoords = (buildingFeature.geometry as GeoJSON.Polygon).coordinates;
      } else if (buildingFeature.geometry.type === 'MultiPolygon') {
        // For MultiPolygon, use the first polygon
        buildingCoords = (buildingFeature.geometry as GeoJSON.MultiPolygon).coordinates[0];
      }
    }

    // If we still don't have building coords, create a fallback based on typical building size
    if (!buildingCoords) {
      const metersToDegrees = 1 / 111320;
      const halfSize = 20 * metersToDegrees; // 20m fallback
      const lonAdjust = halfSize / Math.cos(latitude * Math.PI / 180);
      buildingCoords = [[
        [longitude - lonAdjust, latitude - halfSize],
        [longitude + lonAdjust, latitude - halfSize],
        [longitude + lonAdjust, latitude + halfSize],
        [longitude - lonAdjust, latitude + halfSize],
        [longitude - lonAdjust, latitude - halfSize],
      ]];
    }

    // Hide the original 3D buildings layer in this area by adding our custom one on top
    // Add source for the custom building using actual geometry
    if (!mapInstance.getSource('custom-building')) {
      mapInstance.addSource('custom-building', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { height: totalHeightM, totalFloors: totalFlrs },
          geometry: {
            type: 'Polygon',
            coordinates: buildingCoords,
          },
        },
      });
    }

    // Add floor slice layers
    for (let floor = 1; floor <= totalFlrs; floor++) {
      const floorBase = (floor - 1) * floorHeightM;
      const floorTop = floor * floorHeightM;
      const isApartmentFloor = floor === floorNum;
      const layerId = `building-floor-${floor}`;

      if (!mapInstance.getLayer(layerId)) {
        mapInstance.addLayer({
          id: layerId,
          type: 'fill-extrusion',
          source: 'custom-building',
          paint: {
            'fill-extrusion-color': isApartmentFloor
              ? '#22c55e' // Green for apartment floor
              : floor % 2 === 0 ? '#4b5563' : '#6b7280', // Alternating grey for other floors
            'fill-extrusion-height': floorTop - 0.1, // Small gap between floors
            'fill-extrusion-base': floorBase,
            'fill-extrusion-opacity': isApartmentFloor ? 0.95 : 0.85,
          },
        });
      }
    }

    // Add floor label marker
    if (floorNum > 0 && floorNum <= totalFlrs) {
      const labelEl = document.createElement('div');
      labelEl.className = 'apartment-floor-label';
      labelEl.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(34,197,94,0.5);
          border: 2px solid white;
          animation: labelPulse 2s ease-in-out infinite;
        ">
          Floor ${floorNum} / ${totalFlrs}
        </div>
      `;

      // Calculate offset position (slightly to the east of building)
      const metersToDegrees = 1 / 111320;
      const offsetLng = longitude + (20 * metersToDegrees / Math.cos(latitude * Math.PI / 180));

      new maplibregl.Marker({
        element: labelEl,
        anchor: 'left',
        offset: [10, 0]
      })
        .setLngLat([offsetLng, latitude])
        .addTo(mapInstance);
    }
  }, []);

  // Handle entering the building - animate and show 360 tour
  const handleEnterBuilding = useCallback(() => {
    if (!map.current || !virtualTour360Url) return;

    setIsEnteringBuilding(true);

    // Animate camera flying into the building
    map.current.flyTo({
      center: [lng, lat],
      zoom: 19,
      pitch: 75,
      bearing: map.current.getBearing() + 45,
      duration: 2000,
      essential: true,
    });

    // After animation completes, show the 360 tour
    setTimeout(() => {
      setShow360Tour(true);
      setIsEnteringBuilding(false);
    }, 2000);
  }, [lng, lat, virtualTour360Url]);

  // Close 360 tour and reset view
  const handleClose360Tour = useCallback(() => {
    setShow360Tour(false);

    // Animate back to original view
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: zoom,
        pitch: pitch,
        bearing: bearing,
        duration: 1500,
        essential: true,
      });
    }
  }, [lng, lat, zoom, pitch, bearing]);

  // Initialize map with OpenFreeMap style (free, includes 3D buildings)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Use OpenFreeMap's free vector tiles with 3D buildings
    // Alternative: MapTiler free tier or self-hosted tiles
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lng, lat],
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      maxPitch: 85,
      antialias: true, // Enable antialiasing for smoother 3D buildings
      attributionControl: false,
    } as maplibregl.MapOptions);

    map.current = mapInstance;

    mapInstance.on('load', () => {
      setMapLoaded(true);

      // Add 3D building extrusion layer if not already present
      if (!mapInstance.getLayer('3d-buildings')) {
        // Find the first symbol layer for proper ordering
        const layers = mapInstance.getStyle().layers;
        let labelLayerId: string | undefined;
        for (const layer of layers || []) {
          if (layer.type === 'symbol' && (layer as any).layout?.['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }

        // Add 3D buildings layer - OneGeo style dark grey buildings
        mapInstance.addLayer(
          {
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'render_height'], 10],
                0, '#6b7280',  // Shorter buildings - medium grey
                20, '#4b5563', // Medium buildings - darker grey
                50, '#374151', // Tall buildings - dark grey
                100, '#1f2937', // Very tall - very dark
              ],
              'fill-extrusion-height': [
                'coalesce',
                ['get', 'render_height'],
                ['*', ['coalesce', ['get', 'building:levels'], 3], 3.5],
                10,
              ],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.92,
              'fill-extrusion-vertical-gradient': true,
            },
          },
          labelLayerId
        );
      }

      // Add property marker with floor info
      addPropertyMarker(mapInstance, lat, lng, floorNumber, totalFloors, propertyType);

      // Hide unnecessary map details (POIs, labels, etc.) for cleaner look
      const layersToHide = [
        'poi', 'poi_label', 'poi-level-1', 'poi-level-2', 'poi-level-3',
        'place_label', 'place-city', 'place-town', 'place-village',
        'road_label', 'road-label', 'transit_label',
        'water_label', 'waterway_label', 'airport_label',
        'natural_label', 'landuse_label'
      ];

      for (const layerId of layersToHide) {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }

      // Also reduce visibility of minor roads and small details
      const layersToReduce = mapInstance.getStyle().layers || [];
      for (const layer of layersToReduce) {
        // Hide POI icons and minor labels
        if (layer.id.includes('poi') || layer.id.includes('label') || layer.id.includes('icon')) {
          if (layer.type === 'symbol') {
            mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
      }

      // Add custom 3D building with floor slices for apartments
      // Wait for tiles to fully load before querying building geometry
      if (propertyType === 'apartment' && floorNumber != null && totalFloors != null && totalFloors > 0) {
        // Use 'idle' event to ensure all tiles are loaded
        const addBuildingOnIdle = () => {
          addCustomBuilding3D(mapInstance, lat, lng, floorNumber, totalFloors);
          mapInstance.off('idle', addBuildingOnIdle);
        };
        mapInstance.on('idle', addBuildingOnIdle);
      }

      // Add attribution
      mapInstance.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-left'
      );
    });

    // Add navigation controls
    mapInstance.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right'
    );

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, [lat, lng, zoom, pitch, bearing, addPropertyMarker, addCustomBuilding3D, floorNumber, totalFloors, propertyType]);

  // Update building colors based on time
  useEffect(() => {
    if (!map.current || !mapLoaded || !showTimelapse) return;

    const lighting = TIME_LIGHTING[timelapse.timePeriod];

    if (map.current.getLayer('3d-buildings')) {
      map.current.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'render_height'], 10],
        0, lighting.buildingColor,
        30, lighting.buildingHighlight,
        80, '#ffffff',
      ]);
      map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity',
        0.7 + lighting.ambientIntensity * 0.25
      );
    }

    // Subtle bearing rotation for sun movement
    const targetBearing = (lighting.sunAzimuth - 180) * 0.1;
    map.current.easeTo({ bearing: targetBearing, duration: 800 });

  }, [timelapse.timePeriod, timelapse.currentTime, mapLoaded, showTimelapse]);

  // Toggle 2D/3D mode
  const toggle3DMode = useCallback(() => {
    if (!map.current) return;
    if (is3DMode) {
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    } else {
      map.current.easeTo({ pitch: 60, bearing: -17, duration: 1000 });
    }
    setIs3DMode(!is3DMode);
  }, [is3DMode]);

  // Fly to property
  const flyToProperty = useCallback(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: [lng, lat],
      zoom: 17,
      pitch: 65,
      bearing: Math.random() * 40 - 20,
      duration: 2500,
      essential: true,
    });
  }, [lat, lng]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-xl" style={{ height }}>
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Time-based lighting overlay */}
      {showTimelapse && (
        <>
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background: `linear-gradient(180deg,
                ${TIME_LIGHTING[timelapse.timePeriod].skyColor}40 0%,
                transparent 35%,
                transparent 65%,
                ${TIME_LIGHTING[timelapse.timePeriod].fogColor}30 100%
              )`,
            }}
          />
          {/* Sun indicator */}
          {TIME_LIGHTING[timelapse.timePeriod].sunAltitude > 0 && (
            <div
              className="absolute w-12 h-12 pointer-events-none transition-all duration-700"
              style={{
                left: `${50 + Math.cos((TIME_LIGHTING[timelapse.timePeriod].sunAzimuth - 90) * Math.PI / 180) * 35}%`,
                top: `${8 + (90 - TIME_LIGHTING[timelapse.timePeriod].sunAltitude) * 0.25}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `radial-gradient(circle, #fff8e0 0%, ${TIME_LIGHTING[timelapse.timePeriod].skyColor}00 70%)`,
                  boxShadow: `0 0 40px 20px rgba(255,248,200,0.3)`,
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Property info card - top left */}
      {(title || address) && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-slate-900/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg max-w-[240px] border border-slate-700/50">
            {title && <p className="font-semibold text-white truncate">{title}</p>}
            {address && <p className="text-sm text-slate-300 truncate">{address}</p>}
          </div>
        </div>
      )}

      {/* Floor Level Indicator - for apartments */}
      {hasFloorInfo && showFloorIndicator && is3DMode && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden w-20">
            {/* Header */}
            <div className="px-2 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-center">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {t('property:floorIndicator.title', 'Floor')}
              </span>
            </div>

            {/* Building visualization */}
            <div className="relative px-3 py-4">
              {/* Building outline */}
              <div className="relative mx-auto w-10 rounded-t-sm overflow-hidden border-2 border-slate-600 bg-slate-800/80" style={{ height: '140px' }}>
                {/* Floor segments */}
                {Array.from({ length: totalFloors! }).map((_, i) => {
                  const floor = totalFloors! - i;
                  const isCurrentFloor = floor === floorNumber;
                  return (
                    <div
                      key={floor}
                      className={`absolute left-0 right-0 border-b border-slate-600/50 transition-all duration-500 ${
                        isCurrentFloor ? 'z-10' : ''
                      }`}
                      style={{
                        height: `${100 / totalFloors!}%`,
                        top: `${(i / totalFloors!) * 100}%`,
                        background: isCurrentFloor
                          ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))'
                          : 'transparent',
                      }}
                    >
                      {isCurrentFloor && (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-400/30 to-purple-400/30" />
                      )}
                    </div>
                  );
                })}

                {/* Floor number labels on the side */}
                {totalFloors! <= 10 && Array.from({ length: totalFloors! }).map((_, i) => {
                  const floor = totalFloors! - i;
                  const isCurrentFloor = floor === floorNumber;
                  return (
                    <div
                      key={`label-${floor}`}
                      className={`absolute -right-5 text-[9px] font-medium transition-all ${
                        isCurrentFloor ? 'text-blue-400 font-bold' : 'text-slate-500'
                      }`}
                      style={{
                        top: `${((i + 0.5) / totalFloors!) * 100}%`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {floor}
                    </div>
                  );
                })}
              </div>

              {/* Ground indicator */}
              <div className="w-14 h-1 mx-auto bg-slate-600 rounded-b" />
            </div>

            {/* Floor info */}
            <div className="px-2 py-2 border-t border-slate-700/50 text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {floorNumber}
              </div>
              <div className="text-[10px] text-slate-400">
                {t('property:floorIndicator.ofFloors', 'of {{total}} floors', { total: totalFloors })}
              </div>
            </div>

            {/* Enter Building button - only show if 360 tour available */}
            {virtualTour360Url && (
              <button
                onClick={handleEnterBuilding}
                disabled={isEnteringBuilding}
                className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold transition-all border-t border-slate-700/50 flex items-center justify-center gap-1.5 disabled:opacity-70"
              >
                {isEnteringBuilding ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Entering...</span>
                  </>
                ) : (
                  <>
                    <span>🚪</span>
                    <span>{t('property:floorIndicator.enterBuilding', 'Enter')}</span>
                  </>
                )}
              </button>
            )}

            {/* Toggle button */}
            <button
              onClick={() => setShowFloorIndicator(false)}
              className="w-full py-1.5 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all border-t border-slate-700/50"
            >
              {t('property:floorIndicator.hide', 'Hide')}
            </button>
          </div>
        </div>
      )}

      {/* Collapsed floor indicator button */}
      {hasFloorInfo && !showFloorIndicator && is3DMode && (
        <button
          onClick={() => setShowFloorIndicator(true)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700/50 transition-all"
        >
          <span className="text-lg">🏢</span>
          <span className="text-sm font-medium">{floorNumber}/{totalFloors}</span>
        </button>
      )}

      {/* 2D/3D Toggle - top right, OneGeo style */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggle3DMode}
          className={`px-3 py-2 rounded-lg font-bold text-sm shadow-lg transition-all ${
            is3DMode
              ? 'bg-slate-900/90 text-white border border-slate-600'
              : 'bg-white/90 text-slate-800'
          }`}
        >
          {is3DMode ? '2D' : '3D'}
        </button>
      </div>

      {/* Shadow Timelapse Panel - Right side */}
      {enableShadowTimelapse && (
        <div className="absolute top-16 right-4 z-10 w-52">
          {!showTimelapse ? (
            <button
              onClick={() => setShowTimelapse(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-slate-900/90 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <span>☀️</span>
              <span className="text-sm">{t('property:shadowTimelapse.title', 'Sun & Shadows')}</span>
            </button>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-slate-700/50">
              {/* Header with time */}
              <div
                className="p-3 transition-all duration-500"
                style={{
                  background: `linear-gradient(135deg, ${TIME_LIGHTING[timelapse.timePeriod].skyColor}cc, ${TIME_LIGHTING[timelapse.timePeriod].fogColor}99)`
                }}
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-2xl font-bold">{timelapse.formattedTime}</div>
                    <div className="text-sm opacity-90">
                      {PERIOD_ICONS[timelapse.timePeriod]} {t(`property:shadowTimelapse.periods.${timelapse.timePeriod}`, timelapse.timePeriod)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTimelapse(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="p-3 space-y-3">
                {/* Play/Pause and quick jumps */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={timelapse.goToSunrise}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg transition-all"
                    title="Sunrise"
                  >
                    🌅
                  </button>
                  <button
                    onClick={timelapse.toggle}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all"
                  >
                    {timelapse.isPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={timelapse.goToSunset}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-lg transition-all"
                    title="Sunset"
                  >
                    🌇
                  </button>
                </div>

                {/* Progress bar */}
                <div
                  className="relative h-2 bg-slate-700 rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                    timelapse.seekToProgress(Math.max(0, Math.min(100, percent)));
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${timelapse.progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"
                    style={{ left: `calc(${timelapse.progress}% - 6px)` }}
                  />
                </div>

                {/* Speed controls */}
                <div className="flex items-center justify-center gap-1">
                  {(['slow', 'normal', 'fast', 'ultra'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => timelapse.setSpeed(s)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                        timelapse.speed === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {s === 'slow' ? '0.5x' : s === 'normal' ? '1x' : s === 'fast' ? '2x' : '4x'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <button
          onClick={flyToProperty}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
          </svg>
          {t('property:cinematicMap.controls.play', 'Fly to Property')}
        </button>
        {onNavigateToMap && (
          <button
            onClick={onNavigateToMap}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-white font-medium rounded-lg shadow-lg transition-all border border-slate-700/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {t('property:cinematicMap.controls.exploreMap', 'Full Map')}
          </button>
        )}
      </div>

      {/* 360 Virtual Tour Overlay */}
      {show360Tour && virtualTour360Url && (
        <div className="absolute inset-0 z-50 bg-black animate-fadeIn">
          {/* Close button */}
          <button
            onClick={handleClose360Tour}
            className="absolute top-4 right-4 z-60 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium rounded-lg shadow-lg transition-all border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('property:virtualTour.exit', 'Exit Tour')}
          </button>

          {/* Floor indicator badge */}
          <div className="absolute top-4 left-4 z-60 flex items-center gap-2 px-4 py-2 bg-green-500/90 backdrop-blur-sm text-white font-bold rounded-lg shadow-lg">
            <span>🏢</span>
            <span>{t('property:virtualTour.floor', 'Floor {{floor}}', { floor: floorNumber })}</span>
          </div>

          {/* 360 Tour iframe */}
          <iframe
            src={virtualTour360Url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking"
            title="360 Virtual Tour"
          />

          {/* Instructions hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
            {t('property:virtualTour.hint', 'Drag to look around • Scroll to zoom')}
          </div>
        </div>
      )}

      {/* Entering building animation overlay */}
      {isEnteringBuilding && (
        <div className="absolute inset-0 z-40 bg-gradient-to-b from-transparent via-black/30 to-black/60 pointer-events-none flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="text-4xl mb-2">🚪</div>
            <p className="text-white font-bold text-lg">{t('property:virtualTour.entering', 'Entering building...')}</p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading 3D Map...</p>
          </div>
        </div>
      )}

      {/* Marker pulse animation */}
      <style>{`
        @keyframes pulse3d {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes floorPulse {
          0%, 100% { box-shadow: 0 2px 8px rgba(59,130,246,0.6); }
          50% { box-shadow: 0 2px 16px rgba(59,130,246,0.9), 0 0 20px rgba(139,92,246,0.5); }
        }
        @keyframes labelPulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(34,197,94,0.5);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 30px rgba(34,197,94,0.7);
            transform: scale(1.02);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .apartment-floor-label {
          z-index: 100;
        }
      `}</style>
    </div>
  );
};

export default Map3DBuildings;
