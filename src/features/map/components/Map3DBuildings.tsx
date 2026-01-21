// Map3DBuildings Component
// 3D map with extruded buildings using MapLibre GL JS
// Inspired by OneGeo's 3D visualization

import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';
import { useShadowTimelapse, type TimePeriod } from '../hooks/useShadowTimelapse';

/**
 * Props for Map3DBuildings component
 */
interface Map3DBuildingsProps {
  /** Property latitude */
  lat: number;
  /** Property longitude */
  lng: number;
  /** Property address */
  address?: string;
  /** Property title */
  title?: string;
  /** Initial zoom level */
  zoom?: number;
  /** Initial pitch (tilt) angle in degrees */
  pitch?: number;
  /** Initial bearing (rotation) in degrees */
  bearing?: number;
  /** Map container height */
  height?: string;
  /** Enable shadow timelapse */
  enableShadowTimelapse?: boolean;
  /** Callback when navigating to full map */
  onNavigateToMap?: () => void;
}

/**
 * Lighting configurations for different time periods
 */
const TIME_LIGHTING: Record<TimePeriod, {
  sunAzimuth: number;    // Sun direction (0-360)
  sunAltitude: number;   // Sun height (0-90)
  ambientIntensity: number;
  directionalIntensity: number;
  ambientColor: string;
  directionalColor: string;
  skyColor: string;
  fogColor: string;
}> = {
  night: {
    sunAzimuth: 0,
    sunAltitude: -30,
    ambientIntensity: 0.3,
    directionalIntensity: 0.1,
    ambientColor: '#1a1a2e',
    directionalColor: '#2a2a4e',
    skyColor: '#0a0a1a',
    fogColor: '#0a0a1a',
  },
  dawn: {
    sunAzimuth: 90,
    sunAltitude: 5,
    ambientIntensity: 0.5,
    directionalIntensity: 0.6,
    ambientColor: '#ffcc99',
    directionalColor: '#ff9966',
    skyColor: '#ffaa77',
    fogColor: '#ffd4aa',
  },
  morning: {
    sunAzimuth: 120,
    sunAltitude: 30,
    ambientIntensity: 0.7,
    directionalIntensity: 0.8,
    ambientColor: '#ffffee',
    directionalColor: '#ffffd0',
    skyColor: '#87ceeb',
    fogColor: '#e8f4fc',
  },
  noon: {
    sunAzimuth: 180,
    sunAltitude: 70,
    ambientIntensity: 0.9,
    directionalIntensity: 1.0,
    ambientColor: '#ffffff',
    directionalColor: '#fffef0',
    skyColor: '#4a90d9',
    fogColor: '#e0f0ff',
  },
  afternoon: {
    sunAzimuth: 240,
    sunAltitude: 45,
    ambientIntensity: 0.8,
    directionalIntensity: 0.85,
    ambientColor: '#fff8e0',
    directionalColor: '#ffeecc',
    skyColor: '#6ba3d9',
    fogColor: '#f0e8d8',
  },
  sunset: {
    sunAzimuth: 270,
    sunAltitude: 10,
    ambientIntensity: 0.5,
    directionalIntensity: 0.7,
    ambientColor: '#ffaa77',
    directionalColor: '#ff6633',
    skyColor: '#ff7744',
    fogColor: '#ffccaa',
  },
  dusk: {
    sunAzimuth: 280,
    sunAltitude: -5,
    ambientIntensity: 0.35,
    directionalIntensity: 0.3,
    ambientColor: '#9977aa',
    directionalColor: '#6644aa',
    skyColor: '#443366',
    fogColor: '#554477',
  },
};

/**
 * Time period icons
 */
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
 * Map3DBuildings Component
 *
 * Creates a stunning 3D map visualization with extruded buildings,
 * dynamic lighting based on time of day, and smooth animations.
 */
const Map3DBuildings: React.FC<Map3DBuildingsProps> = ({
  lat,
  lng,
  address,
  title,
  zoom = 16,
  pitch = 60,
  bearing = -20,
  height = '500px',
  enableShadowTimelapse = true,
  onNavigateToMap,
}) => {
  const { t } = useTranslation(['property']);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);

  // Shadow timelapse hook
  const timelapse = useShadowTimelapse(lat);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Create MapLibre map with 3D terrain style
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      // Using OpenFreeMap tiles which include building data
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
          'openmaptiles': {
            type: 'vector',
            url: 'https://api.maptiler.com/tiles/v3/tiles.json?key=get_your_own_key',
            // Fallback to OSM buildings API
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [lng, lat],
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      maxPitch: 85,
      antialias: true,
    });

    const currentMap = map.current;

    currentMap.on('load', () => {
      setMapLoaded(true);

      // Add 3D buildings from OpenStreetMap Buildings
      // Using Overpass API for building data
      addBuildingsLayer(currentMap, lat, lng);

      // Add property marker
      addPropertyMarker(currentMap, lat, lng);
    });

    // Add navigation controls
    currentMap.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
    }), 'bottom-right');

    return () => {
      currentMap.remove();
      map.current = null;
    };
  }, [lat, lng, zoom, pitch, bearing]);

  // Add 3D buildings layer
  const addBuildingsLayer = async (mapInstance: maplibregl.Map, latitude: number, longitude: number) => {
    try {
      // Fetch building footprints from Overpass API
      const bbox = `${latitude - 0.01},${longitude - 0.01},${latitude + 0.01},${longitude + 0.01}`;
      const query = `
        [out:json][timeout:25];
        (
          way["building"](${bbox});
          relation["building"](${bbox});
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch building data, using fallback');
        addFallback3DEffect(mapInstance);
        return;
      }

      const data = await response.json();
      const geojson = osmToGeoJSON(data);

      if (geojson.features.length === 0) {
        addFallback3DEffect(mapInstance);
        return;
      }

      // Add source
      mapInstance.addSource('buildings', {
        type: 'geojson',
        data: geojson,
      });

      // Add 3D extrusion layer
      mapInstance.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'buildings',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'height'],
            [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0, '#e8e4e0',
              10, '#d4d0cc',
              30, '#c0bcb8',
              50, '#acabab',
            ],
            '#d4d0cc',
          ],
          'fill-extrusion-height': [
            'case',
            ['has', 'height'],
            ['get', 'height'],
            ['has', 'building:levels'],
            ['*', ['to-number', ['get', 'building:levels']], 3],
            12, // Default height
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
          // Shadow simulation via vertical gradient
          'fill-extrusion-vertical-gradient': true,
        },
      });

      // Add building outlines for definition
      mapInstance.addLayer({
        id: 'buildings-outline',
        type: 'line',
        source: 'buildings',
        paint: {
          'line-color': '#888888',
          'line-width': 0.5,
          'line-opacity': 0.5,
        },
      });

    } catch (error) {
      console.warn('Error loading buildings:', error);
      addFallback3DEffect(mapInstance);
    }
  };

  // Fallback 3D effect using simple shapes
  const addFallback3DEffect = (mapInstance: maplibregl.Map) => {
    // Create simple 3D blocks around the property
    const blocks: GeoJSON.Feature[] = [];
    const baseSize = 0.0002;

    for (let i = 0; i < 30; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.008;
      const offsetLng = (Math.random() - 0.5) * 0.008;
      const size = baseSize * (0.5 + Math.random());
      const height = 5 + Math.random() * 40;

      blocks.push({
        type: 'Feature',
        properties: { height },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng + offsetLng - size, lat + offsetLat - size],
            [lng + offsetLng + size, lat + offsetLat - size],
            [lng + offsetLng + size, lat + offsetLat + size],
            [lng + offsetLng - size, lat + offsetLat + size],
            [lng + offsetLng - size, lat + offsetLat - size],
          ]],
        },
      });
    }

    mapInstance.addSource('fallback-buildings', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: blocks,
      },
    });

    mapInstance.addLayer({
      id: 'fallback-buildings-3d',
      type: 'fill-extrusion',
      source: 'fallback-buildings',
      paint: {
        'fill-extrusion-color': '#c8c4c0',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.85,
        'fill-extrusion-vertical-gradient': true,
      },
    });
  };

  // Convert OSM data to GeoJSON
  const osmToGeoJSON = (osmData: any): GeoJSON.FeatureCollection => {
    const nodes: Record<string, [number, number]> = {};
    const features: GeoJSON.Feature[] = [];

    // Index nodes
    osmData.elements.forEach((el: any) => {
      if (el.type === 'node') {
        nodes[el.id] = [el.lon, el.lat];
      }
    });

    // Process ways
    osmData.elements.forEach((el: any) => {
      if (el.type === 'way' && el.nodes && el.tags?.building) {
        const coords = el.nodes.map((nodeId: number) => nodes[nodeId]).filter(Boolean);
        if (coords.length >= 4) {
          // Close the polygon if not closed
          if (coords[0][0] !== coords[coords.length - 1][0] ||
              coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push(coords[0]);
          }

          const height = parseFloat(el.tags.height) ||
                        (parseFloat(el.tags['building:levels']) || 4) * 3;

          features.push({
            type: 'Feature',
            properties: {
              height,
              building: el.tags.building,
              levels: el.tags['building:levels'],
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
          });
        }
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  };

  // Add property marker
  const addPropertyMarker = (mapInstance: maplibregl.Map, latitude: number, longitude: number) => {
    // Create custom marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'property-marker-3d';
    markerEl.innerHTML = `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 50%;
          animation: pulse3d 2s ease-in-out infinite;
          opacity: 0.4;
        "></div>
        <div style="
          position: absolute;
          inset: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `;

    new maplibregl.Marker({ element: markerEl })
      .setLngLat([longitude, latitude])
      .addTo(mapInstance);
  };

  // Update lighting based on time
  useEffect(() => {
    if (!map.current || !mapLoaded || !showTimelapse) return;

    const lighting = TIME_LIGHTING[timelapse.timePeriod];

    // Apply lighting via layer opacity and colors
    if (map.current.getLayer('buildings-3d')) {
      map.current.setPaintProperty('buildings-3d', 'fill-extrusion-opacity',
        0.6 + lighting.ambientIntensity * 0.35
      );
    }
    if (map.current.getLayer('fallback-buildings-3d')) {
      map.current.setPaintProperty('fallback-buildings-3d', 'fill-extrusion-opacity',
        0.6 + lighting.ambientIntensity * 0.35
      );
    }
  }, [timelapse.timePeriod, mapLoaded, showTimelapse]);

  // Toggle 2D/3D mode
  const toggle3DMode = useCallback(() => {
    if (!map.current) return;

    if (is3DMode) {
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    } else {
      map.current.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
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
      bearing: Math.random() * 60 - 30,
      duration: 3000,
      essential: true,
    });
  }, [lat, lng]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-xl" style={{ height }}>
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Lighting overlay for time simulation */}
      {showTimelapse && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{
            background: `linear-gradient(180deg,
              ${TIME_LIGHTING[timelapse.timePeriod].skyColor}40 0%,
              transparent 30%,
              transparent 70%,
              ${TIME_LIGHTING[timelapse.timePeriod].fogColor}30 100%
            )`,
          }}
        />
      )}

      {/* Property info card */}
      {(title || address) && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg max-w-[220px]">
            {title && <p className="font-semibold text-neutral-800 truncate">{title}</p>}
            {address && <p className="text-sm text-neutral-600 truncate">{address}</p>}
          </div>
        </div>
      )}

      {/* 2D/3D Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggle3DMode}
          className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg font-bold text-sm hover:bg-white transition-all"
        >
          {is3DMode ? '2D' : '3D'}
        </button>
      </div>

      {/* Shadow Timelapse Panel - Right side */}
      {enableShadowTimelapse && (
        <div className="absolute top-20 right-4 z-10 w-56">
          {!showTimelapse ? (
            <button
              onClick={() => setShowTimelapse(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              <span>☀️</span>
              <span>{t('property:shadowTimelapse.title', 'Shadow Time-Lapse')}</span>
            </button>
          ) : (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden">
              {/* Header */}
              <div
                className="p-3 transition-all duration-500"
                style={{
                  background: `linear-gradient(135deg, ${TIME_LIGHTING[timelapse.timePeriod].skyColor}, ${TIME_LIGHTING[timelapse.timePeriod].directionalColor})`
                }}
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <div className="text-xl font-bold">{timelapse.formattedTime}</div>
                    <div className="text-sm opacity-90">
                      {PERIOD_ICONS[timelapse.timePeriod]} {t(`property:shadowTimelapse.periods.${timelapse.timePeriod}`, timelapse.timePeriod)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTimelapse(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="p-3 space-y-3">
                {/* Play/Pause */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={timelapse.goToSunrise}
                    className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-lg"
                    title="Sunrise"
                  >
                    🌅
                  </button>
                  <button
                    onClick={timelapse.toggle}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {timelapse.isPlaying ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={timelapse.goToSunset}
                    className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-lg"
                    title="Sunset"
                  >
                    🌇
                  </button>
                </div>

                {/* Progress bar */}
                <div
                  className="relative h-2 bg-neutral-200 rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                    timelapse.seekToProgress(Math.max(0, Math.min(100, percent)));
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                    style={{
                      width: `${timelapse.progress}%`,
                      background: `linear-gradient(90deg, ${TIME_LIGHTING[timelapse.timePeriod].directionalColor}, ${TIME_LIGHTING[timelapse.timePeriod].skyColor})`,
                    }}
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
                          ? 'bg-amber-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
          </svg>
          {t('property:cinematicMap.controls.play', 'Fly to Property')}
        </button>
        {onNavigateToMap && (
          <button
            onClick={onNavigateToMap}
            className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm text-neutral-700 font-medium rounded-full shadow-lg hover:bg-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {t('property:cinematicMap.controls.exploreMap', 'Explore Map')}
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-neutral-600">Loading 3D Map...</p>
          </div>
        </div>
      )}

      {/* Marker pulse animation */}
      <style>{`
        @keyframes pulse3d {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Map3DBuildings;
