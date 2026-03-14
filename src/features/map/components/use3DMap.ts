// use3DMap Hook
// Custom hook extracted from Map3DBuildings.tsx
// Contains all state, refs, callbacks, and effects for the 3D map

import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as maplibregl from 'maplibre-gl';
import { useShadowTimelapse } from '../hooks/useShadowTimelapse';
import { mapLogger } from '@/src/shared/utils/logger';
import type { Map3DBuildingsProps } from './Map3DConstants';
import { TIME_LIGHTING, calculateBuildingShadow, calculateSunPosition, getCurrentDayOfYear } from './Map3DConstants';

/** Escape HTML special characters to prevent XSS in innerHTML templates */
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

  const { t, i18n } = useTranslation(['property']);

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
  const facingArrowRef = useRef<HTMLElement | null>(null);
  const facingBearingRef = useRef<number>(0);
  const facingLabelRef = useRef<HTMLElement | null>(null);
  const facingCardinalRef = useRef<HTMLElement | null>(null);
  const facingDirectionLabelRef = useRef<HTMLElement | null>(null);

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
      [out:json][timeout:25];
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return;
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

        const name = el.tags?.name ? escapeHtml(String(el.tags.name)) : '';
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
                ${escapeHtml(name)}
              </div>
              <div style="font-size: 9px; color: #94a3b8;">${escapeHtml(String(dist))}m</div>
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
    const keys = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const key = keys[Math.round(bearing / 45) % 8];
    return t(`property:map3d.cardinalDirections.${key}`, key);
  };

  const getCardinalShort = (bearing: number): string => {
    const keys = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const key = keys[Math.round(bearing / 45) % 8];
    return t(`property:map3d.cardinalDirections.${key}`, key);
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

      // Store the absolute facing bearing for dynamic rotation
      facingBearingRef.current = facing;

      const cardinal = getCardinalShort(facing);
      const cardinalFull = getCardinalLabel(facing);
      // Adjust arrow rotation by current map bearing so it always points geographically correct
      const mapBearing = mapInstance.getBearing();
      const arrowRotation = facing - mapBearing;

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
            <div class="facing-label" style="font-size: 10px; color: #94a3b8; font-weight: 500;">${t('property:map3d.facing', 'Facing')}</div>
            <div style="display: flex; align-items: center; gap: 4px; justify-content: center;">
              <div class="facing-arrow" style="
                width: 20px; height: 20px;
                display: flex; align-items: center; justify-content: center;
                transform: rotate(${arrowRotation}deg);
                transition: transform 0.15s ease-out;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
              </div>
              <span class="facing-cardinal" style="font-size: 14px; font-weight: 700; color: #60a5fa;">${cardinal}</span>
            </div>
            <div class="facing-direction-label" style="font-size: 9px; color: #64748b;">${t('property:map3d.facingDirection', '{{direction}}-facing', { direction: cardinalFull })}</div>
          </div>
        </div>
      `;

      // Store refs to text elements for language updates
      facingArrowRef.current = facingEl.querySelector('.facing-arrow') as HTMLElement;
      facingLabelRef.current = facingEl.querySelector('.facing-label') as HTMLElement;
      facingCardinalRef.current = facingEl.querySelector('.facing-cardinal') as HTMLElement;
      facingDirectionLabelRef.current = facingEl.querySelector('.facing-direction-label') as HTMLElement;

      // Position the facing indicator slightly below the property
      const offset = 0.00015; // ~15m south
      new maplibregl.Marker({ element: facingEl, anchor: 'top' })
        .setLngLat([longitude, latitude - offset])
        .addTo(mapInstance);

      // Listen for map rotation and update arrow direction dynamically
      const updateFacingArrow = () => {
        if (!facingArrowRef.current) return;
        const currentMapBearing = mapInstance.getBearing();
        const adjustedRotation = facingBearingRef.current - currentMapBearing;
        facingArrowRef.current.style.transform = `rotate(${adjustedRotation}deg)`;
      };
      mapInstance.on('rotate', updateFacingArrow);
    }, 1500);
  }, [getBuildingFacing]);

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
    const floorHeightM = 2; // 3m per floor
    const totalHeightM = totalFlrs * floorHeightM;

    // Query the actual building at this location from the map's building layer
    const point = mapInstance.project([longitude, latitude]);

    let buildingCoords: number[][][] | null = null;
    let buildingFeature: maplibregl.MapGeoJSONFeature | null = null;

    // Check if 3d-buildings layer exists
    if (!mapInstance.getLayer('3d-buildings')) {
      mapLogger.warn('3D buildings layer not found in the map style. Custom building will be a simple box.');
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
      // 2. Try a small bounding box query (~30px, roughly one building width)
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - 30, point.y - 30],
        [point.x + 30, point.y + 30]
      ];
      const nearbyFeatures = mapInstance.queryRenderedFeatures(bbox, {
        layers: ['3d-buildings']
      });

      // Find the building CLOSEST to our coordinates that is tall enough
      // Only accept buildings very close to the property (max ~30m)
      if (nearbyFeatures.length > 0) {
        let minDistance = Infinity;
        let closestFeature: maplibregl.MapGeoJSONFeature | null = null;

        // Maximum distance threshold: ~30m in degrees (~0.0003)
        const maxDistanceThreshold = 0.0003;

        for (const feature of nearbyFeatures) {
          const centroid = getBuildingCentroid(feature);
          if (centroid) {
            const distance = getDistance(latitude, longitude, centroid.lat, centroid.lng);

            // Only consider buildings within the distance threshold
            if (distance < maxDistanceThreshold && distance < minDistance) {
              minDistance = distance;
              closestFeature = feature;
            }
          }
        }

        // Only accept the building if it's close enough to the property coordinates
        // ~0.0005 degrees ≈ 55 meters - beyond this the building is likely not the right one
        const maxAcceptableDistance = 0.0005;
        if (closestFeature && minDistance < maxAcceptableDistance) {
          buildingFeature = closestFeature;
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

    // If no building was found at the property coordinates, skip the custom building overlay
    // Don't create a fake building box that would mark the wrong location
    if (!buildingCoords) {
      return;
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
    if (mapInstance.getLayer('building-floor-highlight-glow')) {
      mapInstance.removeLayer('building-floor-highlight-glow');
    }

    // Add floor slice layers - each floor is a separate "box" stacked on top of each other
    // The gap between floors makes each box clearly distinct
    const gapSize = Math.max(0.3, adjustedFloorHeight * 0.12); // 12% of floor height as gap, minimum 0.3m
    for (let floor = 1; floor <= totalFlrs; floor++) {
      const floorBase = (floor - 1) * adjustedFloorHeight;
      const floorTop = floor * adjustedFloorHeight;
      const isHighlightedFloor = floor === floorNum;
      const layerId = `building-floor-${floor}`;

      mapInstance.addLayer({
        id: layerId,
        type: 'fill-extrusion',
        source: 'custom-building',
        paint: {
          'fill-extrusion-color': isHighlightedFloor
            ? '#13e861' // Bright green for the property's floor
            : floor % 2 === 0 ? '#4b5563' : '#6b7280', // Alternating grey for other floors
          'fill-extrusion-height': floorTop - gapSize, // Gap at top of each floor slab
          'fill-extrusion-base': floorBase + (gapSize * 0.25), // Small gap at bottom too
          'fill-extrusion-opacity': isHighlightedFloor ? 1 : 0.75,
        },
      });
    }

    // Add a brighter outline layer for the highlighted floor to make it pop
    const highlightBase = (floorNum - 1) * adjustedFloorHeight;
    const highlightTop = floorNum * adjustedFloorHeight;
    const glowLayerId = 'building-floor-highlight-glow';
    if (mapInstance.getLayer(glowLayerId)) {
      mapInstance.removeLayer(glowLayerId);
    }
    mapInstance.addLayer({
      id: glowLayerId,
      type: 'fill-extrusion',
      source: 'custom-building',
      paint: {
        'fill-extrusion-color': '#4ade80', // Lighter green glow
        'fill-extrusion-height': highlightTop - (gapSize * 0.5),
        'fill-extrusion-base': highlightBase + (gapSize * 0.5),
        'fill-extrusion-opacity': 0.35,
      },
    });

    // Add floating "Floor X/Y" label above the building at the highlighted floor level
    if (floorNum > 0 && floorNum <= totalFlrs) {
      // Create a floating floor label marker positioned above the building
      const floorLabelEl = document.createElement('div');
      floorLabelEl.style.cssText = 'pointer-events: none; z-index: 50;';
      floorLabelEl.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
        ">
          <div style="
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 4px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 800;
            white-space: nowrap;
            border: 2px solid rgba(255,255,255,0.9);
            letter-spacing: 0.5px;
            font-family: system-ui, -apple-system, sans-serif;
          ">Floor ${floorNum}/${totalFlrs}</div>
          <div style="
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 7px solid #10b981;
            margin-top: -1px;
          "></div>
        </div>
      `;

      // Position the label at the building centroid, offset upward based on floor position
      const calculateFloorLabelOffset = (currentZoom: number) => {
        const basePixelsPerFloor = 2.8;
        const zoomFactor = Math.pow(2, currentZoom - 16);
        const pixelsPerFloor = basePixelsPerFloor * zoomFactor;
        // Position at the highlighted floor level plus some headroom
        const floorsFromBottom = floorNum - 0.5;
        return -(floorsFromBottom * pixelsPerFloor) - 20;
      };

      const initialLabelOffset = calculateFloorLabelOffset(mapInstance.getZoom());
      const floorLabelMarker = new maplibregl.Marker({
        element: floorLabelEl,
        anchor: 'bottom',
        offset: [0, initialLabelOffset],
      })
        .setLngLat([centroidLng, centroidLat])
        .addTo(mapInstance);

      // Update label position on zoom/pitch changes
      const updateLabelOffset = () => {
        const newOffset = calculateFloorLabelOffset(mapInstance.getZoom());
        floorLabelMarker.setOffset([0, newOffset]);
      };
      mapInstance.on('zoom', updateLabelOffset);
      mapInstance.on('pitch', updateLabelOffset);

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
            gap: 3px;
            cursor: pointer;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              background: linear-gradient(135deg, #059669, #10b981);
              color: white;
              padding: 6px 14px;
              border-radius: 12px;
              border: 2px solid rgba(255,255,255,0.9);
              box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.4);
              font-family: system-ui, -apple-system, sans-serif;
              animation: doorPulse 2s ease-in-out infinite;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              <span style="font-size: 12px; font-weight: 800; letter-spacing: 0.3px;">360\u00B0 Tour</span>
            </div>
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

  // Update facing indicator text when language changes
  useEffect(() => {
    if (facingBearingRef.current === 0 && !facingLabelRef.current) return;
    const cardinal = getCardinalShort(facingBearingRef.current);
    const cardinalFull = getCardinalLabel(facingBearingRef.current);
    if (facingLabelRef.current) facingLabelRef.current.textContent = t('property:map3d.facing', 'Facing');
    if (facingCardinalRef.current) facingCardinalRef.current.textContent = cardinal;
    if (facingDirectionLabelRef.current) facingDirectionLabelRef.current.textContent = t('property:map3d.facingDirection', '{{direction}}-facing', { direction: cardinalFull });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);



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
      antialias: true, // Enable antialiasing for smoother 3D buildings
      attributionControl: false,
    } as maplibregl.MapOptions);

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
      // (properties with floor data get the door marker via addCustomBuilding3D instead)
      const willHaveFloorViz = floorNumber != null && totalFloors != null && totalFloors > 0;
      if (!willHaveFloorViz && virtualTour360Url) {
        const doorEl = document.createElement('div');
        doorEl.className = 'apartment-door-marker';
        doorEl.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            cursor: pointer;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              background: linear-gradient(135deg, #059669, #10b981);
              color: white;
              padding: 8px 16px;
              border-radius: 12px;
              border: 2px solid rgba(255,255,255,0.9);
              box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.4);
              font-family: system-ui, -apple-system, sans-serif;
              animation: doorPulse 2s ease-in-out infinite;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.3px;">360\u00B0 Tour</span>
            </div>
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

      // Add custom 3D building with floor slices for properties with floor data
      // Wait for tiles to fully load before querying building geometry
      if (floorNumber != null && totalFloors != null && totalFloors > 0) {
        // Retry mechanism to ensure building tiles are loaded
        let retryCount = 0;
        const maxRetries = 5;

        const tryAddCustomBuilding = () => {
          // First zoom to the building location to ensure tiles load
          mapInstance.flyTo({
            center: [lng, lat],
            zoom: Math.max(mapInstance.getZoom(), 17),
            padding: { top: 0, bottom: 120, left: 0, right: 0 },
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