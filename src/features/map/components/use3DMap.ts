// use3DMap Hook
// Custom hook extracted from Map3DBuildings.tsx
// Contains all state, refs, callbacks, and effects for the 3D map

import { useRef, useEffect, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useShadowTimelapse } from '../hooks/useShadowTimelapse';
import type { Map3DBuildingsProps } from './Map3DConstants';
import { TIME_LIGHTING, calculateBuildingShadow, calculateSunPosition, getCurrentDayOfYear } from './Map3DConstants';

export function use3DMap(props: Map3DBuildingsProps) {
  const {
    lat,
    lng,
    zoom = 16,
    pitch = 60,
    bearing: bearingProp = -17,
    enableShadowTimelapse = true,
    floorNumber,
    totalFloors,
    propertyType,
    virtualTour360Url,
    orientation,
  } = props;

  // Calculate effective bearing from orientation
  // Camera should face TOWARD the building's oriented face (opposite direction)
  const orientationBearingMap: Record<string, number> = {
    north: 0, northEast: 45, east: 90, southEast: 135,
    south: 180, southWest: 225, west: 270, northWest: 315,
  };
  const bearing = (orientation && orientation !== 'any' && orientationBearingMap[orientation] !== undefined)
    ? (orientationBearingMap[orientation] + 180) % 360
    : bearingProp;

  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const doorMarkerRef = useRef<maplibregl.Marker | null>(null);
  const floorLabelsRef = useRef<maplibregl.Marker[]>([]);

  // State
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentBearing, setCurrentBearing] = useState(bearing);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [showFloorIndicator, setShowFloorIndicator] = useState(true);
  const [showFloorLabels, setShowFloorLabels] = useState(false);
  const [showShadows, setShowShadows] = useState(true);
  const [show360Tour, setShow360Tour] = useState(false);
  const [isEnteringBuilding, setIsEnteringBuilding] = useState(false);

  // Calculate floor visualization data
  // Show floor levels for any property with more than 3 floors (not just apartments)
  const hasFloorInfo = floorNumber != null && totalFloors != null && totalFloors > 0;
  const has360Tour = !!virtualTour360Url;
  const floorHeightMeters = 3; // Average floor height
  const buildingHeightMeters = hasFloorInfo ? totalFloors * floorHeightMeters : 0;
  const floorPositionPercent = hasFloorInfo ? ((floorNumber - 0.5) / totalFloors) * 100 : 0;

  // Shadow timelapse hook
  const timelapse = useShadowTimelapse(lat);

  // POI markers reference for cleanup
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [showPOI, setShowPOI] = useState(true);

  // POI category styling
  const POI_CATEGORIES: Record<string, { icon: string; color: string; label: string }> = {
    university: { icon: '🎓', color: '#7c3aed', label: 'University' },
    school: { icon: '🏫', color: '#2563eb', label: 'School' },
    hospital: { icon: '🏥', color: '#dc2626', label: 'Hospital' },
    clinic: { icon: '⚕️', color: '#ef4444', label: 'Clinic' },
    pharmacy: { icon: '💊', color: '#10b981', label: 'Pharmacy' },
    supermarket: { icon: '🛒', color: '#f59e0b', label: 'Supermarket' },
    mall: { icon: '🏬', color: '#ec4899', label: 'Shopping Mall' },
    marketplace: { icon: '🏪', color: '#f97316', label: 'Market' },
    restaurant: { icon: '🍽️', color: '#ea580c', label: 'Restaurant' },
    cafe: { icon: '☕', color: '#92400e', label: 'Café' },
    bank: { icon: '🏦', color: '#1d4ed8', label: 'Bank' },
    atm: { icon: '💳', color: '#3b82f6', label: 'ATM' },
    bus_station: { icon: '🚌', color: '#059669', label: 'Bus Station' },
    train_station: { icon: '🚂', color: '#0891b2', label: 'Train Station' },
    parking: { icon: '🅿️', color: '#6366f1', label: 'Parking' },
    park: { icon: '🌳', color: '#16a34a', label: 'Park' },
    gym: { icon: '🏋️', color: '#9333ea', label: 'Gym' },
    place_of_worship: { icon: '⛪', color: '#78716c', label: 'Place of Worship' },
    kindergarten: { icon: '💒', color: '#f472b6', label: 'Kindergarten' },
    police: { icon: '👮', color: '#1e3a5f', label: 'Police' },
  };

  // Fetch nearby POIs from Overpass API
  const fetchAndDisplayPOI = useCallback(async (mapInstance: maplibregl.Map, latitude: number, longitude: number) => {
    const radius = 800; // 800m radius
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"~"university|school|hospital|clinic|pharmacy|restaurant|cafe|bank|place_of_worship|kindergarten|police"](around:${radius},${latitude},${longitude});
        node["shop"~"supermarket|mall|marketplace"](around:${radius},${latitude},${longitude});
        node["leisure"~"park|fitness_centre"](around:${radius},${latitude},${longitude});
        node["public_transport"~"station|stop_position"](around:${radius},${latitude},${longitude});
        node["railway"="station"](around:${radius},${latitude},${longitude});
        node["amenity"="bus_station"](around:${radius},${latitude},${longitude});
        node["amenity"="parking"](around:${radius},${latitude},${longitude});
        way["amenity"~"university|school|hospital"](around:${radius},${latitude},${longitude});
        way["shop"~"supermarket|mall"](around:${radius},${latitude},${longitude});
        way["leisure"="park"](around:${radius},${latitude},${longitude});
      );
      out center 50;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!response.ok) {
        console.warn(`Failed to fetch POI data: HTTP ${response.status}`);
        return;
      }
      const data = await response.json();

      // Clear existing POI markers
      poiMarkersRef.current.forEach(m => m.remove());
      poiMarkersRef.current = [];

      const elements = data.elements || [];
      const seen = new Set<string>(); // Avoid duplicates

      for (const el of elements) {
        const elLat = el.lat || el.center?.lat;
        const elLng = el.lon || el.center?.lon;
        if (!elLat || !elLng) continue;

        const name = el.tags?.name;
        if (!name) continue; // Skip unnamed POIs

        // Deduplicate by name+approximate location
        const key = `${name}-${Math.round(elLat * 1000)}-${Math.round(elLng * 1000)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Determine category
        let category = '';
        const amenity = el.tags?.amenity;
        const shop = el.tags?.shop;
        const leisure = el.tags?.leisure;
        const transport = el.tags?.public_transport;
        const railway = el.tags?.railway;

        if (amenity === 'university') category = 'university';
        else if (amenity === 'school') category = 'school';
        else if (amenity === 'hospital') category = 'hospital';
        else if (amenity === 'clinic' || amenity === 'doctors') category = 'clinic';
        else if (amenity === 'pharmacy') category = 'pharmacy';
        else if (amenity === 'restaurant') category = 'restaurant';
        else if (amenity === 'cafe') category = 'cafe';
        else if (amenity === 'bank') category = 'bank';
        else if (amenity === 'bus_station') category = 'bus_station';
        else if (amenity === 'parking') category = 'parking';
        else if (amenity === 'place_of_worship') category = 'place_of_worship';
        else if (amenity === 'kindergarten') category = 'kindergarten';
        else if (amenity === 'police') category = 'police';
        else if (shop === 'supermarket') category = 'supermarket';
        else if (shop === 'mall') category = 'mall';
        else if (shop === 'marketplace') category = 'marketplace';
        else if (leisure === 'park') category = 'park';
        else if (leisure === 'fitness_centre') category = 'gym';
        else if (transport === 'station' || railway === 'station') category = 'train_station';
        else if (transport === 'stop_position') category = 'bus_station';

        if (!category || !POI_CATEGORIES[category]) continue;

        const cat = POI_CATEGORIES[category];

        // Calculate distance
        const dLat = (elLat - latitude) * 111320;
        const dLng = (elLng - longitude) * 111320 * Math.cos(latitude * Math.PI / 180);
        const dist = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

        const markerEl = document.createElement('div');
        markerEl.style.cssText = 'cursor: pointer;';
        markerEl.innerHTML = `
          <div class="poi-inner" style="
            display: flex;
            align-items: center;
            gap: 4px;
            background: white;
            padding: 3px 8px 3px 4px;
            border-radius: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            border: 2px solid ${cat.color}30;
            font-size: 11px;
            white-space: nowrap;
            max-width: 180px;
            transition: transform 0.2s, box-shadow 0.2s;
          ">
            <span style="font-size: 14px;">${cat.icon}</span>
            <div style="overflow: hidden;">
              <div style="font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; font-size: 10px;">
                ${name}
              </div>
              <div style="font-size: 9px; color: #94a3b8;">${dist}m</div>
            </div>
          </div>
        `;
        const innerEl = markerEl.querySelector('.poi-inner') as HTMLElement;
        markerEl.addEventListener('mouseenter', () => { if (innerEl) { innerEl.style.transform = 'scale(1.15)'; innerEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'; } markerEl.style.zIndex = '100'; });
        markerEl.addEventListener('mouseleave', () => { if (innerEl) { innerEl.style.transform = 'scale(1)'; innerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; } markerEl.style.zIndex = '1'; });

        const marker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
          .setLngLat([elLng, elLat])
          .addTo(mapInstance);

        poiMarkersRef.current.push(marker);
      }
    } catch {
      // Overpass API error - silently fail
    }
  }, []);

  // Determine the facing direction of a building from its footprint
  // Returns the compass bearing (0-360) of the longest edge (building front)
  const getBuildingFacing = useCallback((mapInstance: maplibregl.Map, latitude: number, longitude: number): number | null => {
    if (!mapInstance.getLayer('3d-buildings')) return null;

    const point = mapInstance.project([longitude, latitude]);
    const buffer = 30;
    const features = mapInstance.queryRenderedFeatures(
      [
        [point.x - buffer, point.y - buffer],
        [point.x + buffer, point.y + buffer]
      ],
      { layers: ['3d-buildings'] }
    );

    if (features.length === 0) return null;

    let coords: number[][] = [];
    const geom = features[0].geometry;
    if (geom.type === 'Polygon') {
      coords = (geom as GeoJSON.Polygon).coordinates[0];
    } else if (geom.type === 'MultiPolygon') {
      coords = (geom as GeoJSON.MultiPolygon).coordinates[0][0];
    }
    if (coords.length < 3) return null;

    // Find the longest edge - that's typically the building's front face
    let maxLen = 0;
    let facingBearing = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const dx = coords[i + 1][0] - coords[i][0];
      const dy = coords[i + 1][1] - coords[i][1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > maxLen) {
        maxLen = len;
        // Bearing perpendicular to the edge = the direction the wall faces outward
        const edgeBearing = Math.atan2(dx, dy) * (180 / Math.PI);
        // Perpendicular (outward-facing normal)
        facingBearing = (edgeBearing + 90 + 360) % 360;
      }
    }
    return facingBearing;
  }, []);

  // Get cardinal direction label from bearing
  const getCardinalLabel = (bearing: number): string => {
    const dirs = ['North', 'NE', 'East', 'SE', 'South', 'SW', 'West', 'NW'];
    return dirs[Math.round(bearing / 45) % 8];
  };

  const getCardinalShort = (bearing: number): string => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(bearing / 45) % 8];
  };

  // Convert orientation key to compass bearing (degrees)
  const orientationToBearing = (orient: string): number => {
    const map: Record<string, number> = {
      north: 0, northEast: 45, east: 90, southEast: 135,
      south: 180, southWest: 225, west: 270, northWest: 315,
    };
    return map[orient] ?? 0;
  };

  // Add property marker - always shows a blue dot at the property location
  // Also adds a facing direction compass indicator
  const addPropertyMarker = useCallback((
    mapInstance: maplibregl.Map,
    latitude: number,
    longitude: number,
    userOrientation?: string,
  ) => {
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

    // Add facing direction indicator
    // Use user-defined orientation if available, otherwise auto-detect from building geometry
    setTimeout(() => {
      const facing = userOrientation && userOrientation !== 'any'
        ? orientationToBearing(userOrientation)
        : getBuildingFacing(mapInstance, latitude, longitude);
      if (facing === null) return;

      const cardinal = getCardinalShort(facing);
      const cardinalFull = getCardinalLabel(facing);
      const arrowRotation = facing; // CSS rotation matches compass bearing

      const facingEl = document.createElement('div');
      facingEl.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          pointer-events: none;
        ">
          <div style="
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(8px);
            color: white;
            padding: 4px 10px;
            border-radius: 10px;
            border: 2px solid rgba(59, 130, 246, 0.6);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            font-family: system-ui, sans-serif;
            text-align: center;
            white-space: nowrap;
          ">
            <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">Facing</div>
            <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
              <div style="
                width: 20px; height: 20px;
                display: flex; align-items: center; justify-content: center;
                transform: rotate(${arrowRotation}deg);
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </div>
              <span style="font-size: 14px; font-weight: 700; color: #60a5fa;">${cardinal}</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">${cardinalFull}-facing</div>
          </div>
        </div>
      `;

      // Position the facing indicator slightly below the property
      const offset = 0.00015; // ~15m south
      new maplibregl.Marker({ element: facingEl, anchor: 'top' })
        .setLngLat([longitude, latitude - offset])
        .addTo(mapInstance);
    }, 1500);
  }, [getBuildingFacing]);

  // Add custom 3D building cube with floor slices
  // Uses the actual building geometry from the map data
  // For apartments: highlights the specific floor in green
  // For houses/villas: highlights ALL floors in green (entire building)
  const addCustomBuilding3D = useCallback((
    mapInstance: maplibregl.Map,
    latitude: number,
    longitude: number,
    floorNum: number,
    totalFlrs: number,
    tourUrl?: string,
    onEnterTour?: () => void,
    propType?: string
  ) => {
    const floorHeightM = 3; // 3m per floor
    const totalHeightM = totalFlrs * floorHeightM;

    // Query the actual building at this location from the map's building layer
    const point = mapInstance.project([longitude, latitude]);

    let buildingCoords: number[][][] | null = null;
    let buildingFeature: maplibregl.MapGeoJSONFeature | null = null;

    // Check if 3d-buildings layer exists
    if (!mapInstance.getLayer('3d-buildings')) {
      // Warning removed
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
    } else {
      // 2. Try a larger bounding box query
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - 300, point.y - 300],
        [point.x + 300, point.y + 300]
      ];
      const nearbyFeatures = mapInstance.queryRenderedFeatures(bbox, {
        layers: ['3d-buildings']
      });

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
            continue;
          }

          const centroid = getBuildingCentroid(feature);
          if (centroid) {
            const distance = getDistance(latitude, longitude, centroid.lat, centroid.lng);

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
        } else {
          // Warning removed
        }
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

    // If we still don't have building coords, create a fallback based on the building's floor count
    if (!buildingCoords) {
      // Warning removed
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
    const scaleFactor = 1.3; // 30% larger to fully cover original building and prevent z-fighting at all angles

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

    // Hide the original building from 3d-buildings layer to prevent z-fighting
    // Strategy: try multiple approaches since vector tile features may lack IDs
    let originalHidden = false;
    if (buildingFeature && mapInstance.getLayer('3d-buildings')) {
      const style = mapInstance.getStyle();
      const layerSpec = style.layers?.find(l => l.id === '3d-buildings');
      const layerSource = (layerSpec as any)?.source;

      // Approach 1: Use feature-state if feature has an ID
      if (buildingFeature.id !== undefined && layerSource) {
        try {
          mapInstance.setFeatureState(
            { source: layerSource, sourceLayer: 'building', id: buildingFeature.id },
            { hidden: true }
          );
          mapInstance.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', [
            'case',
            ['boolean', ['feature-state', 'hidden'], false],
            0,
            0.92
          ]);
          originalHidden = true;
        } catch {
          // Feature state not supported - try next approach
        }
      }

      // Approach 2: Collapse the original building to 0 height so our custom building is the only one visible
      // We match by render_height (exact match) which is unique enough to target just this building
      if (!originalHidden) {
        try {
          const targetHeight = buildingFeature.properties?.render_height;
          const targetLevels = buildingFeature.properties?.['building:levels'];

          // Build a condition that precisely identifies THIS building
          // Using exact render_height match (precise to the building) or exact building:levels match
          let matchCondition: any;
          if (targetHeight) {
            matchCondition = ['==', ['get', 'render_height'], targetHeight];
          } else if (targetLevels) {
            matchCondition = ['==', ['get', 'building:levels'], targetLevels];
          } else {
            // Fallback: match any building with similar height to our calculated height
            matchCondition = ['all',
              ['>=', ['coalesce', ['get', 'render_height'], 10], finalBuildingHeight - 1],
              ['<=', ['coalesce', ['get', 'render_height'], 10], finalBuildingHeight + 1],
            ];
          }

          // Collapse matching building(s) to 0 height - they disappear completely
          const originalHeightExpr = [
            'coalesce',
            ['get', 'render_height'],
            ['*', ['coalesce', ['get', 'building:levels'], 3], 3.5],
            10,
          ];
          mapInstance.setPaintProperty('3d-buildings', 'fill-extrusion-height', [
            'case',
            matchCondition,
            0,
            originalHeightExpr,
          ] as any);

          // Also collapse the base to 0
          mapInstance.setPaintProperty('3d-buildings', 'fill-extrusion-base', [
            'case',
            matchCondition,
            0,
            ['coalesce', ['get', 'render_min_height'], 0],
          ] as any);

          originalHidden = true;
        } catch {
          // Expression approach failed - rely on scale covering
        }
      }
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
    // For houses/villas: ALL floors are green (entire building highlighted)
    // For apartments: only the specific floor is green
    const isWholeBuilding = propType === 'house' || propType === 'villa';

    for (let floor = 1; floor <= totalFlrs; floor++) {
      const floorBase = (floor - 1) * adjustedFloorHeight;
      const floorTop = floor * adjustedFloorHeight;
      const isHighlightedFloor = isWholeBuilding || floor === floorNum;
      const layerId = `building-floor-${floor}`;

      mapInstance.addLayer({
        id: layerId,
        type: 'fill-extrusion',
        source: 'custom-building',
        paint: {
          'fill-extrusion-color': isHighlightedFloor
            ? '#22c55e' // Bright green for highlighted floor(s)
            : floor % 2 === 0 ? '#4b5563' : '#6b7280', // Alternating grey for other floors
          'fill-extrusion-height': floorTop - 0.15 + 1.5, // Gap between floors + offset above original
          'fill-extrusion-base': floorBase + 0.05 + 1.5,
          'fill-extrusion-opacity': 1,
        },
      });
    }

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

        // Create door marker with 360 indicator and floor label
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
            ">\u{1F6AA}</div>
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
            ">360\u00B0 Tour</div>
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
        padding: { top: 0, bottom: 120, left: 0, right: 0 },
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
      canvasContextAttributes: { antialias: true }, // v5 API for smoother 3D buildings
      attributionControl: false,
    });

    map.current = mapInstance;

    // Track bearing changes for compass overlay
    mapInstance.on('rotate', () => {
      setCurrentBearing(mapInstance.getBearing());
    });

    // After map loads, immediately fly to property with padding to compensate for pitch perspective
    // With high pitch, the geographic center appears in the lower part of the viewport
    mapInstance.once('load', () => {
      mapInstance.flyTo({
        center: [lng, lat],
        zoom: zoom,
        pitch: pitch,
        bearing: bearing,
        padding: { top: 0, bottom: 120, left: 0, right: 0 },
        duration: 0, // Instant — no animation on initial load
      });
    });

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

        // Detect the correct source name from the style
        // OpenFreeMap uses 'openmaptiles', but we check dynamically to be safe
        const style = mapInstance.getStyle();
        const sources = style?.sources || {};
        let buildingSource = 'openmaptiles'; // Default

        // Look for vector source with building data
        const sourceNames = Object.keys(sources);

        // Check common source names used by different tile providers
        const possibleSources = ['openmaptiles', 'composite', 'mapbox', 'osm', 'vectorTiles'];
        for (const sourceName of possibleSources) {
          if (sources[sourceName] && (sources[sourceName] as any).type === 'vector') {
            buildingSource = sourceName;
            break;
          }
        }

        // If no known source found, use the first vector source
        if (!sources[buildingSource]) {
          for (const [name, source] of Object.entries(sources)) {
            if ((source as any).type === 'vector') {
              buildingSource = name;
              break;
            }
          }
        }

        // Verify the source exists before adding layer
        if (!mapInstance.getSource(buildingSource)) {
          // Error removed
          return;
        }

        try {
          // Add 3D buildings layer - OneGeo style dark grey buildings
          mapInstance.addLayer(
            {
              id: '3d-buildings',
              source: buildingSource,
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
        } catch (error) {
          // Error removed
        }
      }

      // Always add the blue dot property marker
      addPropertyMarker(mapInstance, lat, lng, orientation);

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

      // Fetch and display nearby POIs (universities, shops, etc.)
      fetchAndDisplayPOI(mapInstance, lat, lng);

      // Add 360 tour door marker for properties without floor visualization
      // Houses/villas get floor viz with any floor count; apartments need >3 floors
      const isHouseOrVilla = propertyType === 'house' || propertyType === 'villa';
      const willHaveFloorViz = floorNumber != null && totalFloors != null && (isHouseOrVilla ? totalFloors > 0 : totalFloors > 1);
      if (!willHaveFloorViz && virtualTour360Url) {
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
              display: flex;
              align-items: center;
              justify-content: center;
              width: 44px;
              height: 44px;
              background: linear-gradient(135deg, #22c55e, #16a34a);
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 15px rgba(34,197,94,0.6);
              font-size: 22px;
              animation: doorPulse 2s ease-in-out infinite;
            ">\u{1F6AA}</div>
            <div style="
              background: rgba(0,0,0,0.85);
              color: white;
              padding: 3px 10px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: bold;
              white-space: nowrap;
              border: 2px solid white;
            ">360\u00B0 Tour</div>
          </div>
        `;

        doorEl.addEventListener('click', handleEnterBuilding);

        const doorMarker = new maplibregl.Marker({
          element: doorEl,
          anchor: 'bottom',
          offset: [0, -10],
        })
          .setLngLat([lng, lat])
          .addTo(mapInstance);

        doorMarkerRef.current = doorMarker;
      }

      // Add custom 3D building with floor slices
      // Houses/villas: show with any floor count (entire building green)
      // Apartments: show only for buildings with >3 floors (specific floor green)
      if (floorNumber != null && totalFloors != null && (isHouseOrVilla ? totalFloors > 0 : totalFloors > 1)) {
        // Retry mechanism using idle events to ensure building tiles are loaded
        let retryCount = 0;
        const maxRetries = 5;

        const tryAddCustomBuilding = () => {
          addCustomBuilding3D(
            mapInstance,
            lat,
            lng,
            floorNumber,
            totalFloors,
            virtualTour360Url,
            virtualTour360Url ? handleEnterBuilding : undefined,
            propertyType
          );

          // Check if any floor layers were actually rendered (not just fallback source)
          const hasFloorLayers = mapInstance.getLayer('building-floor-1');
          if (!hasFloorLayers && retryCount < maxRetries) {
            retryCount++;
            // Wait for next idle (tiles loaded) before retrying
            const retryOnIdle = () => {
              mapInstance.off('idle', retryOnIdle);
              tryAddCustomBuilding();
            };
            mapInstance.on('idle', retryOnIdle);
          }
        };

        // Start the process: fly to building location, then wait for idle (tiles loaded)
        const addBuildingOnIdle = () => {
          mapInstance.off('idle', addBuildingOnIdle);

          // Zoom to building location to ensure tiles load
          mapInstance.flyTo({
            center: [lng, lat],
            zoom: Math.max(mapInstance.getZoom(), 17),
            padding: { top: 0, bottom: 120, left: 0, right: 0 },
            duration: 1500,
          });

          // Wait for idle after flyTo (tiles are loaded) before adding building
          const addAfterFly = () => {
            mapInstance.off('idle', addAfterFly);
            tryAddCustomBuilding();
          };
          mapInstance.on('idle', addAfterFly);
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
      // Clean up POI markers
      poiMarkersRef.current.forEach(marker => marker.remove());
      poiMarkersRef.current = [];
      mapInstance.remove();
      map.current = null;
    };
  }, [lat, lng, zoom, pitch, bearing, addPropertyMarker, addCustomBuilding3D, fetchAndDisplayPOI, floorNumber, totalFloors, propertyType, virtualTour360Url, handleEnterBuilding, orientation]);

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
      map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', [
        'case',
        ['boolean', ['feature-state', 'hidden'], false],
        0,
        0.7 + lighting.ambientIntensity * 0.25
      ]);
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

  // Fly to property — centers the marker on screen with pitch-compensating padding
  const flyToProperty = useCallback(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: [lng, lat],
      zoom: 17,
      pitch: 65,
      bearing: Math.random() * 40 - 20,
      padding: { top: 0, bottom: 120, left: 0, right: 0 },
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
            <span style="font-size: 12px;">\u{1F3E2}</span>
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
    const dayOfYear = getCurrentDayOfYear();
    // Use timelapse time when active, otherwise use current real time
    const now = new Date();
    const realHour = now.getHours() + now.getMinutes() / 60;
    const shadowHour = showTimelapse ? timelapse.currentTime : realHour;
    const sunPos = calculateSunPosition(shadowHour, lat, dayOfYear);
    const lighting = TIME_LIGHTING[timelapse.timePeriod];

    // Only show shadows if sun is above horizon and shadows are enabled
    if (!showShadows || sunPos.altitude <= 0) {
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

      // Calculate main shadow polygon using dynamic sun position
      const shadowCoords = calculateBuildingShadow(
        coords,
        height,
        sunPos.azimuth,
        sunPos.altitude,
        lat
      );

      // Calculate soft/extended shadow (1.4x longer for soft edge)
      const softShadowCoords = calculateBuildingShadow(
        coords,
        height * 1.4,
        sunPos.azimuth,
        sunPos.altitude,
        lat
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
  }, [mapLoaded, timelapse.timePeriod, timelapse.currentTime, showShadows, showTimelapse, lat]);

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
  }, [mapLoaded, timelapse.timePeriod, timelapse.currentTime, showShadows, showTimelapse, updateBuildingShadows]);

  // Toggle POI visibility
  useEffect(() => {
    poiMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = showPOI ? 'block' : 'none';
    });
  }, [showPOI]);

  return {
    // Refs
    mapContainer,
    // State
    mapLoaded,
    showTimelapse,
    setShowTimelapse,
    is3DMode,
    showFloorIndicator,
    setShowFloorIndicator,
    showFloorLabels,
    setShowFloorLabels,
    showShadows,
    setShowShadows,
    show360Tour,
    isEnteringBuilding,
    showPOI,
    setShowPOI,
    // Computed
    hasFloorInfo,
    has360Tour,
    currentBearing,
    // Timelapse
    timelapse,
    // Handlers
    handleEnterBuilding,
    handleClose360Tour,
    toggle3DMode,
    flyToProperty,
  };
}
