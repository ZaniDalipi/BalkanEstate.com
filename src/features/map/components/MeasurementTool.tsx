import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap, Polyline, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../../../../context/AppContext';
import * as api from '../../../../services/apiService';

interface MeasurementPoint {
  lat: number;
  lng: number;
}

interface SavedMeasurement {
  id: string;
  name?: string;
  points: MeasurementPoint[];
  type: 'distance' | 'area';
  distance?: number; // meters
  area?: number; // square meters
  perimeter?: number; // meters
  address?: string;
  notes?: string;
  createdAt: Date;
}

interface MeasurementToolProps {
  enabled: boolean;
  onSave?: (measurement: SavedMeasurement) => void;
  onClose?: () => void;
  viewMeasurement?: SavedMeasurement | null; // Pre-loaded measurement to display
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (point1: MeasurementPoint, point2: MeasurementPoint): number => {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Calculate total distance of a path
const calculateTotalDistance = (points: MeasurementPoint[]): number => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
};

// Calculate area of a polygon using Shoelace formula (in square meters)
const calculatePolygonArea = (points: MeasurementPoint[]): number => {
  if (points.length < 3) return 0;

  // Convert to UTM-like projection for accurate area calculation
  const R = 6371000; // Earth's radius in meters
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  // Calculate centroid for projection
  const centLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const centLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

  // Project points to local Cartesian coordinates (meters)
  const projected = points.map((p) => ({
    x: R * toRadians(p.lng - centLng) * Math.cos(toRadians(centLat)),
    y: R * toRadians(p.lat - centLat),
  }));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y;
    area -= projected[j].x * projected[i].y;
  }

  return Math.abs(area / 2);
};

// Format distance for display
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

// Format area for display
const formatArea = (sqMeters: number): string => {
  if (sqMeters < 10000) {
    return `${sqMeters.toFixed(1)} m²`;
  }
  const hectares = sqMeters / 10000;
  if (hectares < 100) {
    return `${hectares.toFixed(2)} ha`;
  }
  return `${(sqMeters / 1000000).toFixed(2)} km²`;
};

// Custom marker icon for measurement points
const measurementIcon = L.divIcon({
  className: 'measurement-point-marker',
  html: `<div style="
    width: 12px;
    height: 12px;
    background: #0252CD;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// First point marker - larger and green to indicate "click to close"
const firstPointIcon = L.divIcon({
  className: 'measurement-first-point-marker',
  html: `<div style="
    width: 16px;
    height: 16px;
    background: #10B981;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// First point marker when cursor is near - pulsing effect
const firstPointActiveIcon = L.divIcon({
  className: 'measurement-first-point-active',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #10B981;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0,0,0,0.4);
    animation: pulse 1s ease-in-out infinite;
  "></div>
  <style>
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  </style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const MeasurementTool: React.FC<MeasurementToolProps> = ({ enabled, onSave, onClose, viewMeasurement }) => {
  const map = useMap();
  const { state } = useAppContext();
  const isLoggedIn = !!state.currentUser;

  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewMeasurementData, setViewMeasurementData] = useState<SavedMeasurement | null>(null);
  const [measurementName, setMeasurementName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<MeasurementPoint | null>(null);
  const [isNearFirstPoint, setIsNearFirstPoint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate close threshold based on zoom level (smaller at higher zoom)
  const getCloseThreshold = useCallback(() => {
    const zoom = map.getZoom();
    // At zoom 21, threshold is ~5m; at zoom 15, threshold is ~50m
    return Math.max(5, 100 / Math.pow(1.5, zoom - 15));
  }, [map]);

  // Load measurement from backend if measurementId is in URL
  useEffect(() => {
    if (enabled) {
      const searchParams = new URLSearchParams(window.location.search);
      const measurementId = searchParams.get('measurementId');

      if (measurementId) {
        // Fetch measurement from backend
        api.getMeasurementById(measurementId)
          .then((response) => {
            if (response.measurement) {
              const measurement = response.measurement;
              setPoints(measurement.points);
              setIsPolygonClosed(measurement.type === 'area');
              setIsViewMode(true);
              setViewMeasurementData(measurement as SavedMeasurement);

              // Clean up URL
              const url = new URL(window.location.href);
              url.searchParams.delete('measurementId');
              window.history.replaceState({}, '', url.toString());
            }
          })
          .catch((err) => {
            console.error('Failed to fetch measurement from backend:', err);
          });
      }
    }
  }, [enabled]);

  // Also handle viewMeasurement prop if passed directly
  useEffect(() => {
    if (enabled && viewMeasurement) {
      setPoints(viewMeasurement.points);
      setIsPolygonClosed(viewMeasurement.type === 'area');
      setIsViewMode(true);
      setViewMeasurementData(viewMeasurement);
    }
  }, [enabled, viewMeasurement]);

  // Handle map clicks to add points
  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      setIsPolygonClosed(false);
      setShowSaveDialog(false);
      setIsNearFirstPoint(false);
      setIsViewMode(false);
      setViewMeasurementData(null);
      return;
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      // Don't add points in view mode
      if (isPolygonClosed || isViewMode) return;

      const newPoint: MeasurementPoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };

      // Check if clicking near first point to close polygon (if we have 3+ points)
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = calculateDistance(newPoint, firstPoint);
        const threshold = getCloseThreshold();
        if (distance < threshold) {
          // Close the polygon - don't add the point, just close
          setIsPolygonClosed(true);
          setIsNearFirstPoint(false);
          return;
        }
      }

      setPoints((prev) => [...prev, newPoint]);
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isPolygonClosed) {
        const currentPos = { lat: e.latlng.lat, lng: e.latlng.lng };
        setCursorPosition(currentPos);

        // Check if near first point (for visual feedback)
        if (points.length >= 3) {
          const firstPoint = points[0];
          const distance = calculateDistance(currentPos, firstPoint);
          const threshold = getCloseThreshold();
          setIsNearFirstPoint(distance < threshold);
        }
      }
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);

    // Change cursor style
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      map.getContainer().style.cursor = '';
    };
  }, [enabled, map, points, isPolygonClosed, getCloseThreshold]);

  // Handle closing polygon manually
  const handleClosePolygon = useCallback(() => {
    if (points.length >= 3) {
      setIsPolygonClosed(true);
      setIsNearFirstPoint(false);
    }
  }, [points.length]);

  // Calculate measurements
  const totalDistance = calculateTotalDistance(points);
  const perimeter = isPolygonClosed
    ? totalDistance + (points.length > 1 ? calculateDistance(points[points.length - 1], points[0]) : 0)
    : totalDistance;
  const area = isPolygonClosed ? calculatePolygonArea(points) : 0;

  // Preview distance (to cursor position)
  const previewDistance =
    !isPolygonClosed && points.length > 0 && cursorPosition
      ? calculateDistance(points[points.length - 1], cursorPosition)
      : 0;

  // Handle undo
  const handleUndo = useCallback(() => {
    if (isPolygonClosed) {
      setIsPolygonClosed(false);
    } else {
      setPoints((prev) => prev.slice(0, -1));
    }
  }, [isPolygonClosed]);

  // Handle clear
  const handleClear = useCallback(() => {
    setPoints([]);
    setIsPolygonClosed(false);
    setShowSaveDialog(false);
    setMeasurementName('');
    setAddress('');
    setNotes('');
    setSaveError(null);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (points.length < 2) return;

    const name = measurementName.trim() || address.trim() || `Measurement ${new Date().toLocaleDateString()}`;

    const measurement: SavedMeasurement = {
      id: `measurement-${Date.now()}`,
      name,
      points,
      type: isPolygonClosed ? 'area' : 'distance',
      distance: totalDistance,
      area: isPolygonClosed ? area : undefined,
      perimeter: isPolygonClosed ? perimeter : undefined,
      address: address || undefined,
      notes: notes || undefined,
      createdAt: new Date(),
    };

    // If logged in, save to backend
    if (isLoggedIn) {
      setIsSaving(true);
      setSaveError(null);
      try {
        await api.saveMeasurement({
          name,
          points,
          type: isPolygonClosed ? 'area' : 'distance',
          distance: totalDistance,
          area: isPolygonClosed ? area : undefined,
          perimeter: isPolygonClosed ? perimeter : undefined,
          address: address || undefined,
          notes: notes || undefined,
        });
        onSave?.(measurement);
        setShowSaveDialog(false);
        setMeasurementName('');
        setAddress('');
        setNotes('');
      } catch (error: any) {
        console.error('Failed to save measurement:', error);
        setSaveError(error.message || 'Failed to save measurement');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Save to localStorage for non-logged-in users
      onSave?.(measurement);
      setShowSaveDialog(false);
      const saved = JSON.parse(localStorage.getItem('savedMeasurements') || '[]');
      saved.push(measurement);
      localStorage.setItem('savedMeasurements', JSON.stringify(saved));
      setMeasurementName('');
      setAddress('');
      setNotes('');
    }
  }, [points, isPolygonClosed, totalDistance, area, perimeter, measurementName, address, notes, onSave, isLoggedIn]);

  // Get all points including cursor for preview line
  const previewPoints = !isPolygonClosed && cursorPosition && points.length > 0
    ? [...points, cursorPosition]
    : points;

  if (!enabled) return null;

  return (
    <>
      {/* Measurement lines/polygon */}
      {points.length > 1 && (
        isPolygonClosed ? (
          <Polygon
            positions={points.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: '#0252CD',
              weight: 3,
              fillColor: '#0252CD',
              fillOpacity: 0.2,
            }}
          />
        ) : (
          <>
            {/* Main measurement line */}
            <Polyline
              positions={previewPoints.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: '#0252CD',
                weight: 3,
                dashArray: cursorPosition && points.length > 0 ? '10, 5' : undefined,
              }}
            />
            {/* Preview closing line (from last point to first) when 3+ points */}
            {points.length >= 3 && (
              <Polyline
                positions={[
                  [points[points.length - 1].lat, points[points.length - 1].lng],
                  [points[0].lat, points[0].lng],
                ]}
                pathOptions={{
                  color: '#10B981',
                  weight: 2,
                  dashArray: '5, 10',
                  opacity: 0.6,
                }}
              />
            )}
          </>
        )
      )}

      {/* Point markers */}
      {points.map((point, index) => {
        // First point gets special icon (green, and pulsing when cursor is near)
        const isFirstPoint = index === 0;
        const showActiveFirstPoint = isFirstPoint && !isPolygonClosed && points.length >= 3 && isNearFirstPoint;
        const icon = isFirstPoint && !isPolygonClosed && points.length >= 3
          ? (showActiveFirstPoint ? firstPointActiveIcon : firstPointIcon)
          : measurementIcon;

        return (
          <Marker
            key={`point-${index}`}
            position={[point.lat, point.lng]}
            icon={icon}
            eventHandlers={isFirstPoint && !isPolygonClosed && points.length >= 3 ? {
              click: (e) => {
                e.originalEvent.stopPropagation();
                handleClosePolygon();
              }
            } : undefined}
          >
            <Popup>
              <div className="text-xs">
                <strong>{isFirstPoint && points.length >= 3 && !isPolygonClosed ? '🎯 Start Point (click to close)' : `Point ${index + 1}`}</strong>
                <br />
                {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                {index > 0 && (
                  <>
                    <br />
                    <span className="text-gray-500">
                      {formatDistance(calculateDistance(points[index - 1], point))} from prev
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Measurement info panel - Compact */}
      <div
        ref={containerRef}
        className="absolute bottom-24 left-4 z-[1001] bg-white rounded-lg shadow-lg p-2.5 min-w-[220px] max-w-[260px]"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1">
            {isViewMode ? '👁️' : '📏'} {isViewMode && viewMeasurementData ? viewMeasurementData.name : 'Measure'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none w-5 h-5 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* View mode info */}
        {isViewMode && viewMeasurementData && (
          <div className="mb-2 p-1.5 bg-blue-50 rounded text-[10px] text-blue-700">
            <span className="font-medium">Viewing saved measurement</span>
            {viewMeasurementData.address && (
              <div className="text-blue-600 mt-0.5">📍 {viewMeasurementData.address}</div>
            )}
          </div>
        )}

        {/* Instructions - compact */}
        {points.length === 0 && !isViewMode && (
          <p className="text-xs text-gray-500 mb-2">
            Click map to add points
          </p>
        )}

        {/* Measurements display - compact */}
        {points.length > 0 && (
          <div className="space-y-1 mb-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Pts: {points.length}</span>
              <span className="font-medium text-blue-600">
                {formatDistance(isPolygonClosed ? perimeter : totalDistance)}
              </span>
            </div>

            {!isPolygonClosed && previewDistance > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>+cursor:</span>
                <span>{formatDistance(previewDistance)}</span>
              </div>
            )}

            {isPolygonClosed && (
              <div className="flex justify-between">
                <span className="text-gray-500">Area:</span>
                <span className="font-semibold text-green-600">{formatArea(area)}</span>
              </div>
            )}
          </div>
        )}

        {/* View mode: Start New button */}
        {isViewMode && (
          <button
            onClick={() => {
              setIsViewMode(false);
              setViewMeasurementData(null);
              handleClear();
            }}
            className="w-full px-2 py-1.5 mb-2 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            ✏️ Start New Measurement
          </button>
        )}

        {/* Action buttons - compact (only in edit mode) */}
        {!isViewMode && (
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={handleUndo}
              disabled={points.length === 0}
              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleClear}
              disabled={points.length === 0}
              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        )}

        {/* Close Polygon button - compact (only in edit mode) */}
        {!isViewMode && points.length >= 3 && !isPolygonClosed && (
          <button
            onClick={handleClosePolygon}
            className="w-full px-2 py-1.5 mb-2 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            🔷 Close Polygon
          </button>
        )}

        {/* Save section - compact (only in edit mode) */}
        {!isViewMode && points.length >= 2 && (
          <>
            {!showSaveDialog ? (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full px-2 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                💾 Save
              </button>
            ) : (
              <div className="space-y-1.5 border-t pt-2">
                {!isLoggedIn && (
                  <div className="text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded">
                    Log in to save to profile
                  </div>
                )}
                <input
                  type="text"
                  value={measurementName}
                  onChange={(e) => setMeasurementName(e.target.value)}
                  placeholder="Name..."
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Location..."
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                />
                {saveError && (
                  <div className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded">
                    {saveError}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveError(null);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    {isSaving ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default MeasurementTool;
