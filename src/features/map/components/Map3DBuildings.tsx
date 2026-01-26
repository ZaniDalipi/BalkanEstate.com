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
 * Calculate shadow polygon for a building based on sun position
 * @param buildingCoords - The building footprint coordinates [lng, lat][]
 * @param height - Building height in meters
 * @param sunAzimuth - Sun azimuth angle in degrees (0 = North, clockwise)
 * @param sunAltitude - Sun altitude angle in degrees above horizon
 * @returns Shadow polygon coordinates
 */
const calculateBuildingShadow = (
  buildingCoords: number[][],
  height: number,
  sunAzimuth: number,
  sunAltitude: number
): number[][] => {
  // If sun is below horizon, no shadow
  if (sunAltitude <= 0) return [];

  // Convert angles to radians
  const azimuthRad = ((sunAzimuth + 180) * Math.PI) / 180; // Shadow direction is opposite to sun
  const altitudeRad = (sunAltitude * Math.PI) / 180;

  // Calculate shadow length factor based on sun altitude
  // Higher sun = shorter shadows
  const shadowLength = height / Math.tan(altitudeRad);

  // Convert shadow length to approximate degrees (at equator ~111km per degree)
  const metersPerDegree = 111320;
  const shadowOffsetLat = (shadowLength * Math.cos(azimuthRad)) / metersPerDegree;
  const shadowOffsetLng = (shadowLength * Math.sin(azimuthRad)) / metersPerDegree;

  // Create shadow polygon by extending building footprint in shadow direction
  const shadowPolygon: number[][] = [];

  // Add original building footprint points
  buildingCoords.forEach(coord => {
    shadowPolygon.push([coord[0], coord[1]]);
  });

  // Add shadow-extended points in reverse order to create proper polygon
  for (let i = buildingCoords.length - 1; i >= 0; i--) {
    shadowPolygon.push([
      buildingCoords[i][0] + shadowOffsetLng,
      buildingCoords[i][1] + shadowOffsetLat
    ]);
  }

  return shadowPolygon;
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
  const doorMarkerRef = useRef<maplibregl.Marker | null>(null);
  const floorLabelsRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [showFloorIndicator, setShowFloorIndicator] = useState(true);
  const [showFloorLabels, setShowFloorLabels] = useState(false);
  const [showShadows, setShowShadows] = useState(true);
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
  // For apartments with floor info, we skip this marker and use the 3D building visualization instead
  const addPropertyMarker = useCallback((
    mapInstance: maplibregl.Map,
    latitude: number,
    longitude: number,
    floorNum?: number,
    totalFlrs?: number,
    propType?: string
  ) => {
    // Skip marker for apartments - we use 3D building visualization instead
    const isApartmentWithFloors = propType === 'apartment' && floorNum != null && totalFlrs != null && totalFlrs > 0;

    if (isApartmentWithFloors) {
      // Don't add the blue pole marker for apartments - 3D building handles this
      return;
    }

    if (false) {
      // Dead code - keeping structure for non-apartment types
      const markerEl = document.createElement('div');
      const poleHeight = 0;
      const indicatorPosition = 0;

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
              <span style="color: white; font-size: 9px; font-weight: bold;">0</span>
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
              Floor 0
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
    totalFlrs: number,
    tourUrl?: string,
    onEnterTour?: () => void
  ) => {
    const floorHeightM = 3; // 3m per floor
    const totalHeightM = totalFlrs * floorHeightM;

    // Query the actual building at this location from the map's building layer
    const point = mapInstance.project([longitude, latitude]);
    console.log(`[Map3D] Querying building at ${latitude}, ${longitude}, point: ${point.x}, ${point.y}`);

    let buildingCoords: number[][][] | null = null;
    let buildingFeature: maplibregl.MapGeoJSONFeature | null = null;

    // Check if 3d-buildings layer exists
    if (!mapInstance.getLayer('3d-buildings')) {
      console.warn('[Map3D] 3d-buildings layer not found!');
    }

    // Helper function to calculate building centroid
    const getBuildingCentroid = (feature: maplibregl.MapGeoJSONFeature): { lng: number; lat: number } | null => {
      let coords: number[][] = [];
      if (feature.geometry.type === 'Polygon') {
        coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
      } else if (feature.geometry.type === 'MultiPolygon') {
        coords = (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
      }
      if (coords.length === 0) return null;

      let sumLng = 0, sumLat = 0;
      const numPoints = coords.length - 1; // Exclude closing point
      for (let i = 0; i < numPoints; i++) {
        sumLng += coords[i][0];
        sumLat += coords[i][1];
      }
      return { lng: sumLng / numPoints, lat: sumLat / numPoints };
    };

    // Helper function to calculate distance between two points (in degrees, approximate)
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const dLat = lat2 - lat1;
      const dLng = lng2 - lng1;
      return Math.sqrt(dLat * dLat + dLng * dLng);
    };

    // Try multiple query approaches to find the building
    // 1. First try exact point query on the 3d-buildings layer
    const exactFeatures = mapInstance.queryRenderedFeatures(point, {
      layers: ['3d-buildings']
    });
    console.log(`[Map3D] Exact query found ${exactFeatures.length} features`);

    if (exactFeatures.length > 0) {
      // If we hit multiple buildings at exact point, pick the one closest to our coordinates
      if (exactFeatures.length === 1) {
        buildingFeature = exactFeatures[0];
      } else {
        let minDist = Infinity;
        for (const feature of exactFeatures) {
          const centroid = getBuildingCentroid(feature);
          if (centroid) {
            const dist = getDistance(latitude, longitude, centroid.lat, centroid.lng);
            if (dist < minDist) {
              minDist = dist;
              buildingFeature = feature;
            }
          }
        }
      }
      console.log('[Map3D] Using exact query result', buildingFeature?.properties);
    } else {
      // 2. Try a larger bounding box query
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - 150, point.y - 150],
        [point.x + 150, point.y + 150]
      ];
      const nearbyFeatures = mapInstance.queryRenderedFeatures(bbox, {
        layers: ['3d-buildings']
      });
      console.log(`[Map3D] Bbox query found ${nearbyFeatures.length} features`);

      // Find the building CLOSEST to our coordinates that is tall enough
      // Filter out small auxiliary structures (garages, sheds, etc.)
      if (nearbyFeatures.length > 0) {
        let minDistance = Infinity;
        let closestFeature: maplibregl.MapGeoJSONFeature | null = null;

        // Minimum height requirement: building must have at least as many floors as target floor
        // or be at least 10 meters tall (roughly 3 floors)
        const minRequiredHeight = Math.max(10, floorNum * floorHeightM);

        for (const feature of nearbyFeatures) {
          const props = feature.properties;

          // Get building height
          let buildingHeight = 10; // Default
          if (props?.render_height) {
            buildingHeight = props.render_height;
          } else if (props?.['building:levels']) {
            buildingHeight = props['building:levels'] * 3.5;
          }

          // Skip buildings that are too small (likely auxiliary structures)
          if (buildingHeight < minRequiredHeight) {
            console.log(`[Map3D] Skipping building with height ${buildingHeight}m (min required: ${minRequiredHeight}m)`);
            continue;
          }

          const centroid = getBuildingCentroid(feature);
          if (centroid) {
            const distance = getDistance(latitude, longitude, centroid.lat, centroid.lng);
            console.log(`[Map3D] Building at (${centroid.lat.toFixed(5)}, ${centroid.lng.toFixed(5)}) distance: ${distance.toFixed(6)}, height: ${buildingHeight}m`);

            if (distance < minDistance) {
              minDistance = distance;
              closestFeature = feature;
            }
          }
        }

        if (closestFeature) {
          buildingFeature = closestFeature;
          const height = closestFeature.properties?.render_height ||
                        (closestFeature.properties?.['building:levels'] || 1) * 3.5;
          console.log(`[Map3D] Using closest tall building, distance: ${minDistance.toFixed(6)}, height: ${height}m`);
        } else {
          console.warn(`[Map3D] No building found meeting minimum height requirement of ${minRequiredHeight}m`);
        }
      }
    }

    // Extract coordinates from the building feature
    if (buildingFeature) {
      console.log('[Map3D] Building feature found, geometry type:', buildingFeature.geometry.type);
      if (buildingFeature.geometry.type === 'Polygon') {
        buildingCoords = (buildingFeature.geometry as GeoJSON.Polygon).coordinates;
      } else if (buildingFeature.geometry.type === 'MultiPolygon') {
        // For MultiPolygon, use the first polygon
        buildingCoords = (buildingFeature.geometry as GeoJSON.MultiPolygon).coordinates[0];
      }
      console.log('[Map3D] Extracted building coords, points:', buildingCoords?.[0]?.length || 0);
    }

    // If we still don't have building coords, create a fallback based on the building's floor count
    if (!buildingCoords) {
      console.warn('[Map3D] No building found! Creating fallback building');
      const metersToDegrees = 1 / 111320;
      // For a tall building, use a larger footprint (proportional to floors)
      const buildingSize = Math.max(25, totalFlrs * 1.5); // At least 25m, scales with floors
      const halfSize = buildingSize * metersToDegrees;
      const lonAdjust = halfSize / Math.cos(latitude * Math.PI / 180);
      buildingCoords = [[
        [longitude - lonAdjust, latitude - halfSize],
        [longitude + lonAdjust, latitude - halfSize],
        [longitude + lonAdjust, latitude + halfSize],
        [longitude - lonAdjust, latitude + halfSize],
        [longitude - lonAdjust, latitude - halfSize],
      ]];
    }

    // Get actual building height from map data if available
    let actualBuildingHeight = totalHeightM;
    if (buildingFeature && buildingFeature.properties) {
      const props = buildingFeature.properties;
      if (props.render_height) {
        actualBuildingHeight = props.render_height;
      } else if (props['building:levels']) {
        actualBuildingHeight = props['building:levels'] * 3.5;
      }
    }
    // Use the larger of our calculated height or the map's height
    const finalBuildingHeight = Math.max(totalHeightM, actualBuildingHeight);
    // Recalculate floor height based on actual building
    const adjustedFloorHeight = finalBuildingHeight / totalFlrs;

    // Scale up the building coordinates to fully cover the original and prevent z-fighting
    const scaleFactor = 1.05; // 5% larger to fully cover original building

    // Calculate centroid for scaling and label positioning
    const outerRing = buildingCoords[0];
    let centroidLng = 0;
    let centroidLat = 0;
    const numPoints = outerRing.length - 1; // Exclude closing point
    for (let i = 0; i < numPoints; i++) {
      centroidLng += outerRing[i][0];
      centroidLat += outerRing[i][1];
    }
    centroidLng /= numPoints;
    centroidLat /= numPoints;

    // Scale coordinates from centroid to prevent z-fighting with original building
    const scaledCoords = buildingCoords.map(ring =>
      ring.map(coord => [
        centroidLng + (coord[0] - centroidLng) * scaleFactor,
        centroidLat + (coord[1] - centroidLat) * scaleFactor
      ])
    );

    // First, try to hide the original building by setting a filter that excludes buildings at this location
    // We'll do this by creating a small exclusion zone around the property
    if (mapInstance.getLayer('3d-buildings')) {
      // Get the current filter and add exclusion for this building's area
      const latTolerance = 0.0003; // ~30m tolerance
      const lngTolerance = 0.0003;

      // Apply filter to exclude the original building (by checking if building is within our area)
      // This uses a bounding box check
      mapInstance.setFilter('3d-buildings', [
        'any',
        ['<', ['get', 'render_height'], 5], // Keep short buildings
        ['all',
          ['any',
            ['<', ['geometry-type'], 'Polygon'], // Keep non-polygons
            ['any',
              // Keep buildings outside our exclusion zone
              // We can't easily filter by geometry center, so use a workaround
              // by relying on the custom building to cover the original
            ]
          ]
        ]
      ]);

      // Alternative: Just let the custom building cover the original
      // Remove the filter and rely on proper z-ordering
      mapInstance.setFilter('3d-buildings', null);
    }

    // Add source for the custom building using actual geometry
    if (!mapInstance.getSource('custom-building')) {
      mapInstance.addSource('custom-building', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { height: totalHeightM, totalFloors: totalFlrs },
          geometry: {
            type: 'Polygon',
            coordinates: scaledCoords,
          },
        },
      });
    } else {
      // Update existing source
      (mapInstance.getSource('custom-building') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { height: totalHeightM, totalFloors: totalFlrs },
        geometry: {
          type: 'Polygon',
          coordinates: scaledCoords,
        },
      });
    }

    // Remove existing floor layers if any
    for (let floor = 1; floor <= 100; floor++) {
      const layerId = `building-floor-${floor}`;
      if (mapInstance.getLayer(layerId)) {
        mapInstance.removeLayer(layerId);
      }
    }

    // Add floor slice layers - each floor is a separate layer for the striped effect
    // Add them on top of the 3d-buildings layer
    for (let floor = 1; floor <= totalFlrs; floor++) {
      const floorBase = (floor - 1) * adjustedFloorHeight;
      const floorTop = floor * adjustedFloorHeight;
      const isApartmentFloor = floor === floorNum;
      const layerId = `building-floor-${floor}`;

      mapInstance.addLayer({
        id: layerId,
        type: 'fill-extrusion',
        source: 'custom-building',
        paint: {
          'fill-extrusion-color': isApartmentFloor
            ? '#22c55e' // Bright green for apartment floor
            : floor % 2 === 0 ? '#4b5563' : '#6b7280', // Alternating grey for other floors
          'fill-extrusion-height': floorTop - 0.15, // Gap between floors for visual separation
          'fill-extrusion-base': floorBase + 0.05,
          'fill-extrusion-opacity': isApartmentFloor ? 1 : 0.92,
        },
      });
    }

    // Add floor number labels on the building
    // Show: floor 1, every 5th floor, the target floor, and top floor
    const floorsToLabel: number[] = [];

    // Add floor 1
    if (!floorsToLabel.includes(1)) floorsToLabel.push(1);

    // Add every 5th floor
    for (let f = 5; f <= totalFlrs; f += 5) {
      if (!floorsToLabel.includes(f)) floorsToLabel.push(f);
    }

    // Add the target floor (apartment)
    if (!floorsToLabel.includes(floorNum)) floorsToLabel.push(floorNum);

    // Add top floor
    if (!floorsToLabel.includes(totalFlrs)) floorsToLabel.push(totalFlrs);

    // Sort floors
    floorsToLabel.sort((a, b) => a - b);

    // Find the south-facing edge of the building for label placement
    const ring = scaledCoords[0];
    let southEdgeStart = 0;
    let minLat = Infinity;

    // Find the vertex that is most south (lowest lat)
    for (let i = 0; i < ring.length - 1; i++) {
      if (ring[i][1] < minLat) {
        minLat = ring[i][1];
        southEdgeStart = i;
      }
    }

    // Get the midpoint of the south edge
    const nextIdx = (southEdgeStart + 1) % (ring.length - 1);
    const labelLng = (ring[southEdgeStart][0] + ring[nextIdx][0]) / 2;
    const labelLat = (ring[southEdgeStart][1] + ring[nextIdx][1]) / 2;

    // Offset slightly outward from the building face
    const labelOffset = 0.00006; // ~6m outward
    const baseLabelLng = labelLng;
    const baseLabelLat = labelLat - labelOffset;

    // Remove existing floor labels
    document.querySelectorAll('.floor-number-label').forEach(el => el.remove());

    // Create floor number labels
    floorsToLabel.forEach(floor => {
      const isTargetFloor = floor === floorNum;
      const floorCenter = (floor - 0.5) * adjustedFloorHeight;

      const labelEl = document.createElement('div');
      labelEl.className = 'floor-number-label';
      labelEl.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 22px;
          padding: 0 6px;
          background: ${isTargetFloor ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(30, 41, 59, 0.95)'};
          color: white;
          font-size: 11px;
          font-weight: bold;
          border-radius: 6px;
          border: 2px solid ${isTargetFloor ? '#86efac' : 'rgba(148, 163, 184, 0.5)'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          white-space: nowrap;
          ${isTargetFloor ? 'animation: floorLabelPulse 2s ease-in-out infinite;' : ''}
        ">${floor}${isTargetFloor ? ' ←' : ''}</div>
      `;

      // Calculate vertical offset based on zoom level and floor height
      const calculateFloorLabelOffset = (currentZoom: number) => {
        const basePixelsPerMeter = 0.15;
        const zoomFactor = Math.pow(2, currentZoom - 16);
        const pixelsPerMeter = basePixelsPerMeter * zoomFactor;
        return -(floorCenter * pixelsPerMeter);
      };

      const initialOffset = calculateFloorLabelOffset(mapInstance.getZoom());
      const floorLabel = new maplibregl.Marker({
        element: labelEl,
        anchor: 'right',
        offset: [-8, initialOffset],
      })
        .setLngLat([baseLabelLng, baseLabelLat])
        .addTo(mapInstance);

      // Update marker offset when zoom changes
      const updateLabelOffset = () => {
        const newOffset = calculateFloorLabelOffset(mapInstance.getZoom());
        floorLabel.setOffset([-8, newOffset]);
      };

      mapInstance.on('zoom', updateLabelOffset);
      mapInstance.on('pitch', updateLabelOffset);
    });

    // Add door icon directly on the highlighted floor for 360 tour
    if (floorNum > 0 && floorNum <= totalFlrs) {
      // Show door icon if 360 tour is available
      const hasTour = !!tourUrl;

      if (hasTour) {
        // Find the southwest-facing edge of the building (viewing direction with pitch 60)
        // This edge will appear as the "front" face from the default camera angle
        const ring = scaledCoords[0];
        let swEdgeStart = 0;
        let minSum = Infinity;

        // Find the vertex that is most southwest (lowest lng + lat sum)
        for (let i = 0; i < ring.length - 1; i++) {
          const sum = ring[i][0] + ring[i][1]; // lng + lat
          if (sum < minSum) {
            minSum = sum;
            swEdgeStart = i;
          }
        }

        // Get the midpoint of the edge starting from the southwest vertex
        const nextIdx = (swEdgeStart + 1) % (ring.length - 1);
        const edgeMidLng = (ring[swEdgeStart][0] + ring[nextIdx][0]) / 2;
        const edgeMidLat = (ring[swEdgeStart][1] + ring[nextIdx][1]) / 2;

        // Offset slightly outward from the building face so icon is visible
        const outwardOffset = 0.00003; // ~3m outward
        const doorLng = edgeMidLng - outwardOffset;
        const doorLat = edgeMidLat - outwardOffset;

        // Create door marker with 360° indicator and floor label
        const doorEl = document.createElement('div');
        doorEl.className = 'apartment-door-marker';
        doorEl.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            cursor: pointer;
          ">
            <div style="
              background: rgba(34,197,94,0.95);
              color: white;
              padding: 2px 8px;
              border-radius: 8px 8px 0 0;
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              border: 2px solid white;
              border-bottom: none;
            ">Floor ${floorNum}/${totalFlrs}</div>
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #22c55e, #16a34a);
              border-radius: 8px;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 15px rgba(34,197,94,0.6);
              font-size: 20px;
              animation: doorPulse 2s ease-in-out infinite;
            ">🚪</div>
            <div style="
              background: rgba(0,0,0,0.85);
              color: white;
              padding: 2px 8px;
              border-radius: 0 0 8px 8px;
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              border: 2px solid white;
              border-top: none;
            ">360° Tour</div>
          </div>
        `;

        // Add click handler for 360 tour
        if (onEnterTour) {
          doorEl.addEventListener('click', onEnterTour);
        }

        // Function to calculate vertical offset based on zoom level
        // The offset needs to scale with zoom to keep marker at correct floor level
        const calculateFloorOffset = (currentZoom: number) => {
          // Base pixels per floor at zoom 16, scales exponentially with zoom
          const basePixelsPerFloor = 2.5;
          const zoomFactor = Math.pow(2, currentZoom - 16);
          const pixelsPerFloor = basePixelsPerFloor * zoomFactor;
          const floorsFromBottom = floorNum - 1;
          return -(floorsFromBottom * pixelsPerFloor);
        };

        // Position door on the southwest building face at the correct floor level
        const initialOffset = calculateFloorOffset(mapInstance.getZoom());
        const doorMarker = new maplibregl.Marker({
          element: doorEl,
          anchor: 'bottom',
          offset: [0, initialOffset],
        })
          .setLngLat([doorLng, doorLat])
          .addTo(mapInstance);

        // Update marker offset when zoom changes to keep it at correct floor level
        const updateMarkerOffset = () => {
          const newOffset = calculateFloorOffset(mapInstance.getZoom());
          doorMarker.setOffset([0, newOffset]);
        };

        // Listen for zoom changes
        mapInstance.on('zoom', updateMarkerOffset);
        mapInstance.on('pitch', updateMarkerOffset);

        // Store marker reference for later removal
        doorMarkerRef.current = doorMarker;
      }
    }
  }, []);

  // Hide/show door marker when 360 tour is opened/closed
  useEffect(() => {
    if (doorMarkerRef.current) {
      const markerEl = doorMarkerRef.current.getElement();
      if (markerEl) {
        markerEl.style.display = show360Tour ? 'none' : 'block';
      }
    }
  }, [show360Tour]);

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
      minZoom: 14, // Prevent zooming out too far - keep building visible
      maxZoom: 20,
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

      // Show POIs (Points of Interest) for neighborhood context
      // Only hide very minor labels that would clutter the 3D view
      const layersToHide = [
        'natural_label', // Natural features less relevant for property context
        'landuse_label', // Landuse labels not useful
      ];

      for (const layerId of layersToHide) {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }

      // Enhance POI visibility for neighborhood context
      const allLayers = mapInstance.getStyle().layers || [];
      for (const layer of allLayers) {
        // Keep and enhance POI layers for neighborhood info (restaurants, shops, schools, etc.)
        if (layer.id.includes('poi') && layer.type === 'symbol') {
          mapInstance.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        // Keep road labels for orientation
        if ((layer.id.includes('road') && layer.id.includes('label')) || layer.id === 'road_label') {
          mapInstance.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        // Keep place names (cities, towns) for context
        if (layer.id.includes('place')) {
          mapInstance.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        // Keep transit labels (metro, bus stops)
        if (layer.id.includes('transit')) {
          mapInstance.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        // Keep water labels (rivers, lakes)
        if (layer.id.includes('water') && layer.id.includes('label')) {
          mapInstance.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
      }

      // Add custom 3D building with floor slices for apartments
      // Wait for tiles to fully load before querying building geometry
      if (propertyType === 'apartment' && floorNumber != null && totalFloors != null && totalFloors > 0) {
        // Retry mechanism to ensure building tiles are loaded
        let retryCount = 0;
        const maxRetries = 5;

        const tryAddCustomBuilding = () => {
          // First zoom to the building location to ensure tiles load
          mapInstance.flyTo({
            center: [lng, lat],
            zoom: Math.max(mapInstance.getZoom(), 17),
            duration: 1500,
          });

          // Wait for the fly animation and tiles to load
          setTimeout(() => {
            addCustomBuilding3D(
              mapInstance,
              lat,
              lng,
              floorNumber,
              totalFloors,
              virtualTour360Url,
              virtualTour360Url ? handleEnterBuilding : undefined
            );

            // Check if source was added successfully - if not, retry
            if (!mapInstance.getSource('custom-building') && retryCount < maxRetries) {
              retryCount++;
              console.log(`[Map3D] Retrying custom building creation, attempt ${retryCount}`);
              setTimeout(tryAddCustomBuilding, 1000);
            }
          }, 2000);
        };

        // Start the process after initial load
        const addBuildingOnIdle = () => {
          tryAddCustomBuilding();
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
      // Clean up floor labels
      floorLabelsRef.current.forEach(marker => marker.remove());
      floorLabelsRef.current = [];
      mapInstance.remove();
      map.current = null;
    };
  }, [lat, lng, zoom, pitch, bearing, addPropertyMarker, addCustomBuilding3D, floorNumber, totalFloors, propertyType, virtualTour360Url, handleEnterBuilding]);

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

  // Update floor labels for all visible buildings with building:levels
  const updateFloorLabels = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing labels
    floorLabelsRef.current.forEach(marker => marker.remove());
    floorLabelsRef.current = [];

    if (!showFloorLabels) return;

    // Query all rendered buildings
    const features = map.current.queryRenderedFeatures(undefined, {
      layers: ['3d-buildings']
    });

    // Track building centroids to avoid duplicate labels
    const labeledBuildings = new Set<string>();

    features.forEach(feature => {
      const props = feature.properties;
      const levels = props?.['building:levels'];

      if (!levels || levels <= 0) return;

      // Get building centroid for label positioning
      let centroidLng = 0;
      let centroidLat = 0;
      let coords: number[][] = [];

      if (feature.geometry.type === 'Polygon') {
        coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
      } else if (feature.geometry.type === 'MultiPolygon') {
        coords = (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
      }

      if (coords.length === 0) return;

      // Calculate centroid
      const numPoints = coords.length - 1;
      for (let i = 0; i < numPoints; i++) {
        centroidLng += coords[i][0];
        centroidLat += coords[i][1];
      }
      centroidLng /= numPoints;
      centroidLat /= numPoints;

      // Create unique key for building to avoid duplicates
      const key = `${centroidLng.toFixed(5)},${centroidLat.toFixed(5)}`;
      if (labeledBuildings.has(key)) return;
      labeledBuildings.add(key);

      // Create floor label marker
      const labelEl = document.createElement('div');
      labelEl.className = 'building-floor-label';
      labelEl.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        ">
          <div style="
            background: rgba(30, 41, 59, 0.95);
            color: white;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            border: 2px solid rgba(148, 163, 184, 0.5);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="font-size: 12px;">🏢</span>
            <span>${levels}F</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid rgba(30, 41, 59, 0.95);
            margin-top: -1px;
          "></div>
        </div>
      `;

      // Calculate vertical offset based on building height
      const buildingHeight = props?.render_height || (levels * 3.5);
      const zoomFactor = Math.pow(2, map.current!.getZoom() - 16);
      const heightOffset = -buildingHeight * zoomFactor * 0.8;

      const marker = new maplibregl.Marker({
        element: labelEl,
        anchor: 'bottom',
        offset: [0, heightOffset],
      })
        .setLngLat([centroidLng, centroidLat])
        .addTo(map.current!);

      floorLabelsRef.current.push(marker);
    });
  }, [mapLoaded, showFloorLabels]);

  // Update floor labels when toggle changes or map moves (debounced)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    updateFloorLabels();

    if (showFloorLabels) {
      // Debounce floor label updates for smoother performance
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const debouncedUpdate = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updateFloorLabels(), 200);
      };

      map.current.on('moveend', debouncedUpdate);

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (map.current) {
          map.current.off('moveend', debouncedUpdate);
        }
      };
    }
  }, [mapLoaded, showFloorLabels, updateFloorLabels]);

  // Update building shadows based on sun position
  const updateBuildingShadows = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    const lighting = TIME_LIGHTING[timelapse.timePeriod];

    // Only show shadows if sun is above horizon and shadows are enabled
    if (!showShadows || lighting.sunAltitude <= 0) {
      // Remove shadow layers if they exist
      ['building-shadows', 'building-shadows-soft', 'building-shadows-ambient'].forEach(layerId => {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId);
        }
      });
      ['shadow-data', 'shadow-data-soft', 'shadow-data-ambient'].forEach(sourceId => {
        if (mapInstance.getSource(sourceId)) {
          mapInstance.removeSource(sourceId);
        }
      });
      return;
    }

    // Query visible buildings - limit to improve performance
    const features = mapInstance.queryRenderedFeatures(undefined, {
      layers: ['3d-buildings']
    }).slice(0, 100); // Limit to 100 buildings for performance

    const shadowFeatures: GeoJSON.Feature[] = [];
    const softShadowFeatures: GeoJSON.Feature[] = [];
    const ambientFeatures: GeoJSON.Feature[] = [];
    const processedBuildings = new Set<string>();

    features.forEach(feature => {
      const props = feature.properties;
      let height = 10; // Default height

      if (props?.render_height) {
        height = props.render_height;
      } else if (props?.['building:levels']) {
        height = props['building:levels'] * 3.5;
      }

      let coords: number[][] = [];
      if (feature.geometry.type === 'Polygon') {
        coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
      } else if (feature.geometry.type === 'MultiPolygon') {
        coords = (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
      }

      if (coords.length < 3) return;

      // Create unique key for building
      const key = coords.slice(0, 3).map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join('|');
      if (processedBuildings.has(key)) return;
      processedBuildings.add(key);

      // Calculate main shadow polygon
      const shadowCoords = calculateBuildingShadow(
        coords,
        height,
        lighting.sunAzimuth,
        lighting.sunAltitude
      );

      // Calculate soft/extended shadow (1.3x longer for soft edge)
      const softShadowCoords = calculateBuildingShadow(
        coords,
        height * 1.4,
        lighting.sunAzimuth,
        lighting.sunAltitude
      );

      if (shadowCoords.length > 0) {
        shadowFeatures.push({
          type: 'Feature',
          properties: { height },
          geometry: {
            type: 'Polygon',
            coordinates: [shadowCoords]
          }
        });
      }

      if (softShadowCoords.length > 0) {
        softShadowFeatures.push({
          type: 'Feature',
          properties: { height },
          geometry: {
            type: 'Polygon',
            coordinates: [softShadowCoords]
          }
        });
      }

      // Add ambient occlusion around building base (small dark ring)
      const ambientCoords = coords.map(coord => [...coord]);
      ambientFeatures.push({
        type: 'Feature',
        properties: { height },
        geometry: {
          type: 'Polygon',
          coordinates: [ambientCoords]
        }
      });
    });

    // Shadow color based on time of day - cooler blue tint
    const getShadowColor = () => {
      switch (timelapse.timePeriod) {
        case 'dawn':
        case 'sunset':
          return '#1a1a3d'; // Purple tint for golden hour
        case 'noon':
          return '#0a1628'; // Deep blue for harsh midday
        default:
          return '#0f172a'; // Standard dark blue
      }
    };

    const shadowColor = getShadowColor();

    // Helper to update or create source/layer
    const updateOrCreateShadowLayer = (
      sourceId: string,
      layerId: string,
      features: GeoJSON.Feature[],
      layerConfig: Omit<maplibregl.LayerSpecification, 'id' | 'source'>
    ) => {
      if (features.length === 0) return;

      const featureCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features
      };

      // Update existing source or create new one
      const existingSource = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(featureCollection);
      } else {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: featureCollection
        });
      }

      // Add layer if it doesn't exist
      if (!mapInstance.getLayer(layerId)) {
        mapInstance.addLayer({
          id: layerId,
          source: sourceId,
          ...layerConfig
        } as maplibregl.LayerSpecification, '3d-buildings');
      }
    };

    // Update soft shadow layer
    updateOrCreateShadowLayer('shadow-data-soft', 'building-shadows-soft', softShadowFeatures, {
      type: 'fill',
      paint: {
        'fill-color': shadowColor,
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          5, 0.12,
          20, 0.18,
          50, 0.22,
          100, 0.25
        ]
      }
    });

    // Update main shadow layer
    updateOrCreateShadowLayer('shadow-data', 'building-shadows', shadowFeatures, {
      type: 'fill',
      paint: {
        'fill-color': shadowColor,
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          5, 0.25,
          20, 0.40,
          50, 0.50,
          100, 0.55
        ]
      }
    });

    // Update ambient occlusion layer
    updateOrCreateShadowLayer('shadow-data-ambient', 'building-shadows-ambient', ambientFeatures, {
      type: 'line',
      paint: {
        'line-color': '#000000',
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          5, 2,
          20, 4,
          50, 6,
          100, 8
        ],
        'line-blur': [
          'interpolate',
          ['linear'],
          ['get', 'height'],
          5, 3,
          20, 5,
          50, 8,
          100, 10
        ],
        'line-opacity': 0.4
      }
    });
  }, [mapLoaded, timelapse.timePeriod, showShadows]);

  // Update shadows when timelapse changes or showShadows toggles
  // Use debounced updates to prevent performance issues
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Initial shadow render (delayed to let map settle)
    const initialTimeout = setTimeout(() => {
      updateBuildingShadows();
    }, 500);

    // Debounced shadow update - only update after map stops moving for 300ms
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateBuildingShadows();
      }, 300);
    };

    // Only update on moveend (not idle) to reduce frequency
    map.current.on('moveend', debouncedUpdate);

    return () => {
      clearTimeout(initialTimeout);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (map.current) {
        map.current.off('moveend', debouncedUpdate);
      }
    };
  }, [mapLoaded, timelapse.timePeriod, showShadows, updateBuildingShadows]);

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
      {(title || address) && !show360Tour && (
        <div className="absolute top-3 sm:top-4 left-2 sm:left-4 z-10">
          <div className="bg-slate-900/90 backdrop-blur-sm px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg shadow-lg max-w-[160px] sm:max-w-[240px] border border-slate-700/50">
            {title && <p className="font-semibold text-white text-xs sm:text-sm truncate">{title}</p>}
            {address && <p className="text-[10px] sm:text-sm text-slate-300 truncate">{address}</p>}
          </div>
        </div>
      )}

      {/* Floor Level Indicator - for apartments */}
      {hasFloorInfo && showFloorIndicator && is3DMode && !show360Tour && (
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20">
          <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden w-16 sm:w-20">
            {/* Header */}
            <div className="px-2 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-center">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {t('property:floorIndicator.title', 'Floor')}
              </span>
            </div>

            {/* Building visualization */}
            <div className="relative px-2 sm:px-3 py-3 sm:py-4">
              {/* Building outline */}
              <div className="relative mx-auto w-8 sm:w-10 rounded-t-sm overflow-hidden border-2 border-slate-600 bg-slate-800/80" style={{ height: '100px' }}>
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
              <div className="w-10 sm:w-14 h-1 mx-auto bg-slate-600 rounded-b" />
            </div>

            {/* Floor info */}
            <div className="px-1 sm:px-2 py-1.5 sm:py-2 border-t border-slate-700/50 text-center">
              <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {floorNumber}
              </div>
              <div className="text-[8px] sm:text-[10px] text-slate-400">
                {t('property:floorIndicator.ofFloors', 'of {{total}} floors', { total: totalFloors })}
              </div>
            </div>

            {/* Enter Building button - only show if 360 tour available */}
            {virtualTour360Url && (
              <button
                onClick={handleEnterBuilding}
                disabled={isEnteringBuilding}
                className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-[10px] sm:text-xs font-bold transition-all border-t border-slate-700/50 flex items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-70"
              >
                {isEnteringBuilding ? (
                  <>
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Entering...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm sm:text-base">🚪</span>
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
      {hasFloorInfo && !showFloorIndicator && is3DMode && !show360Tour && (
        <button
          onClick={() => setShowFloorIndicator(true)}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg shadow-lg border border-slate-700/50 transition-all"
        >
          <span className="text-sm sm:text-lg">🏢</span>
          <span className="text-xs sm:text-sm font-medium">{floorNumber}/{totalFloors}</span>
        </button>
      )}

      {/* 2D/3D Toggle, Floor Labels Toggle, and Shadow Toggle - top right, OneGeo style */}
      {!show360Tour && (
        <div className="absolute top-3 sm:top-4 right-2 sm:right-4 z-10 flex flex-col gap-2">
          <button
            onClick={toggle3DMode}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg transition-all ${
              is3DMode
                ? 'bg-slate-900/90 text-white border border-slate-600'
                : 'bg-white/90 text-slate-800'
            }`}
          >
            {is3DMode ? '2D' : '3D'}
          </button>
          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1 ${
              showShadows
                ? 'bg-amber-500 text-white border border-amber-400'
                : 'bg-slate-900/90 text-white border border-slate-600'
            }`}
            title={t('property:map3d.shadows', 'Show Building Shadows')}
          >
            <span className="text-sm">☀️</span>
            <span className="hidden sm:inline text-xs">
              {showShadows ? t('property:map3d.shadowsOn', 'Shadows') : t('property:map3d.shadowsOff', 'Shadows')}
            </span>
          </button>
          <button
            onClick={() => setShowFloorLabels(!showFloorLabels)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1 ${
              showFloorLabels
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-slate-900/90 text-white border border-slate-600'
            }`}
            title={t('property:map3d.floorLabels', 'Show Floor Levels')}
          >
            <span className="text-sm">🏢</span>
            <span className="hidden sm:inline text-xs">
              {showFloorLabels ? t('property:map3d.hideFloors', 'Hide') : t('property:map3d.showFloors', 'Floors')}
            </span>
          </button>
        </div>
      )}

      {/* Shadow Timelapse Panel - Right side, positioned below the control buttons */}
      {enableShadowTimelapse && !show360Tour && (
        <div className="absolute top-36 sm:top-40 right-2 sm:right-4 z-10 w-44 sm:w-52">
          {!showTimelapse ? (
            <button
              onClick={() => setShowTimelapse(true)}
              className="w-full flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/90 text-white font-medium rounded-lg shadow-lg hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <span className="text-sm sm:text-base">☀️</span>
              <span className="text-xs sm:text-sm">{t('property:shadowTimelapse.title', 'Sun & Shadows')}</span>
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
      {!show360Tour && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={flyToProperty}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm rounded-lg shadow-lg transition-all"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
            </svg>
            <span className="hidden sm:inline">{t('property:cinematicMap.controls.play', 'Fly to Property')}</span>
            <span className="sm:hidden">{t('property:cinematicMap.controls.flyShort', 'Fly')}</span>
          </button>
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/90 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm rounded-lg shadow-lg transition-all border border-slate-700/50"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="hidden sm:inline">{t('property:cinematicMap.controls.exploreMap', 'Full Map')}</span>
              <span className="sm:hidden">{t('property:cinematicMap.controls.mapShort', 'Map')}</span>
            </button>
          )}
        </div>
      )}

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
        @keyframes doorPulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 15px rgba(34,197,94,0.6);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 25px rgba(34,197,94,0.8);
            transform: scale(1.1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .apartment-door-marker {
          z-index: 100;
        }
        .floor-number-label {
          z-index: 90;
          pointer-events: none;
        }
        @keyframes floorLabelPulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 2px 12px rgba(34,197,94,0.6), 0 0 20px rgba(34,197,94,0.4);
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default Map3DBuildings;
