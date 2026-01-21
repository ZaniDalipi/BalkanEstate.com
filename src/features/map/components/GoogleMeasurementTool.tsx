import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import * as api from '@/services/apiService';

export interface MeasurementPoint {
  lat: number;
  lng: number;
}

interface SavedMeasurement {
  id: string;
  name?: string;
  points: MeasurementPoint[];
  type: 'distance' | 'area';
  distance?: number;
  area?: number;
  perimeter?: number;
  address?: string;
  notes?: string;
  createdAt: Date;
}

export interface MeasurementToolState {
  points: MeasurementPoint[];
  isPolygonClosed: boolean;
  closePolygon: () => void;
  undo: () => void;
  clear: () => void;
}

export interface GoogleMeasurementToolProps {
  enabled: boolean;
  measurementState: MeasurementToolState;
  onSave?: (measurement: SavedMeasurement) => void;
  onClose?: () => void;
}

// Calculate distance between two points using Haversine formula
export const calculateDistance = (point1: MeasurementPoint, point2: MeasurementPoint): number => {
  const R = 6371000;
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Calculate total distance of a path
export const calculateTotalDistance = (points: MeasurementPoint[]): number => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
};

// Calculate area of a polygon using Shoelace formula
export const calculatePolygonArea = (points: MeasurementPoint[]): number => {
  if (points.length < 3) return 0;

  const R = 6371000;
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const centLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const centLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

  const projected = points.map((p) => ({
    x: R * toRadians(p.lng - centLng) * Math.cos(toRadians(centLat)),
    y: R * toRadians(p.lat - centLat),
  }));

  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y;
    area -= projected[j].x * projected[i].y;
  }

  return Math.abs(area / 2);
};

// Format distance for display
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

// Format area for display
export const formatArea = (sqMeters: number): string => {
  if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`;
  const hectares = sqMeters / 10000;
  if (hectares < 100) return `${hectares.toFixed(2)} ha`;
  return `${(sqMeters / 1000000).toFixed(2)} km²`;
};

// Hook to manage measurement state
export const useMeasurementTool = (
  map: google.maps.Map | null,
  enabled: boolean
): MeasurementToolState => {
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      setIsPolygonClosed(false);
    }
  }, [enabled]);

  // Handle map clicks
  useEffect(() => {
    if (!map || !enabled) return;

    const handleClick = (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || isPolygonClosed) return;

      const newPoint: MeasurementPoint = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      // Check if clicking near first point to close polygon
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = calculateDistance(newPoint, firstPoint);
        const zoom = map.getZoom() || 15;
        const threshold = Math.max(5, 100 / Math.pow(1.5, zoom - 15));
        if (distance < threshold) {
          setIsPolygonClosed(true);
          return;
        }
      }

      setPoints(prev => [...prev, newPoint]);
    };

    const listener = map.addListener('click', handleClick);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, enabled, points, isPolygonClosed]);

  const closePolygon = useCallback(() => {
    if (points.length >= 3) {
      setIsPolygonClosed(true);
    }
  }, [points.length]);

  const undo = useCallback(() => {
    if (isPolygonClosed) {
      setIsPolygonClosed(false);
    } else {
      setPoints(prev => prev.slice(0, -1));
    }
  }, [isPolygonClosed]);

  const clear = useCallback(() => {
    setPoints([]);
    setIsPolygonClosed(false);
  }, []);

  return {
    points,
    isPolygonClosed,
    closePolygon,
    undo,
    clear,
  };
};

// UI Panel Component (rendered outside GoogleMap)
const GoogleMeasurementTool: React.FC<GoogleMeasurementToolProps> = ({
  enabled,
  measurementState,
  onSave,
  onClose,
}) => {
  const { state } = useAppContext();
  const isLoggedIn = !!state.currentUser;

  const { points, isPolygonClosed, closePolygon, undo, clear } = measurementState;

  const [measurementName, setMeasurementName] = useState('');
  const [address, setAddress] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset save dialog when disabled
  useEffect(() => {
    if (!enabled) {
      setShowSaveDialog(false);
      setMeasurementName('');
      setAddress('');
      setSaveError(null);
    }
  }, [enabled]);

  // Calculate measurements
  const totalDistance = useMemo(() => calculateTotalDistance(points), [points]);
  const perimeter = useMemo(() => {
    if (!isPolygonClosed || points.length < 2) return totalDistance;
    return totalDistance + calculateDistance(points[points.length - 1], points[0]);
  }, [points, isPolygonClosed, totalDistance]);
  const area = useMemo(() => isPolygonClosed ? calculatePolygonArea(points) : 0, [points, isPolygonClosed]);

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
      createdAt: new Date(),
    };

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
        });
        onSave?.(measurement);
        setShowSaveDialog(false);
        setMeasurementName('');
        setAddress('');
      } catch (error: any) {
        setSaveError(error.message || 'Failed to save measurement');
      } finally {
        setIsSaving(false);
      }
    } else {
      onSave?.(measurement);
      setShowSaveDialog(false);
      const saved = JSON.parse(localStorage.getItem('savedMeasurements') || '[]');
      saved.push(measurement);
      localStorage.setItem('savedMeasurements', JSON.stringify(saved));
      setMeasurementName('');
      setAddress('');
    }
  }, [points, isPolygonClosed, totalDistance, area, perimeter, measurementName, address, onSave, isLoggedIn]);

  const handleClear = useCallback(() => {
    clear();
    setShowSaveDialog(false);
    setMeasurementName('');
    setAddress('');
    setSaveError(null);
  }, [clear]);

  if (!enabled) return null;

  return (
    <div
      className="absolute top-1/3 left-4 z-[1001] bg-white/95 backdrop-blur-sm rounded-xl px-3 py-3 shadow-xl border border-gray-200 w-[240px]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1">
          📏 Measure {isPolygonClosed ? 'Area' : 'Distance'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none w-5 h-5 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Instructions */}
      {points.length === 0 && (
        <p className="text-xs text-gray-500 mb-2">
          Click map to add points. Click first point (green) to close polygon.
        </p>
      )}

      {/* Measurements display */}
      {points.length > 0 && (
        <div className="space-y-1.5 mb-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Points:</span>
            <span className="font-medium">{points.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">{isPolygonClosed ? 'Perimeter:' : 'Distance:'}</span>
            <span className="font-bold text-blue-600">
              {formatDistance(isPolygonClosed ? perimeter : totalDistance)}
            </span>
          </div>
          {isPolygonClosed && (
            <div className="flex justify-between items-center bg-green-50 p-1.5 rounded">
              <span className="text-green-700 font-medium">Area:</span>
              <span className="font-bold text-green-600 text-sm">{formatArea(area)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mb-2">
        <button
          onClick={undo}
          disabled={points.length === 0}
          className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          ↩ Undo
        </button>
        <button
          onClick={handleClear}
          disabled={points.length === 0}
          className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Close Polygon button */}
      {points.length >= 3 && !isPolygonClosed && (
        <button
          onClick={closePolygon}
          className="w-full px-2 py-2 mb-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          🔷 Close Polygon (Calculate Area)
        </button>
      )}

      {/* Save section */}
      {points.length >= 2 && (
        <>
          {!showSaveDialog ? (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full px-2 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              💾 Save Measurement
            </button>
          ) : (
            <div className="space-y-2 border-t pt-2">
              {!isLoggedIn && (
                <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Log in to save to your profile
                </div>
              )}
              <input
                type="text"
                value={measurementName}
                onChange={(e) => setMeasurementName(e.target.value)}
                placeholder="Name (e.g., Back yard plot)"
                className="w-full px-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Location / Address"
                className="w-full px-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              {saveError && (
                <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg">
                  {saveError}
                </div>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowSaveDialog(false); setSaveError(null); }}
                  disabled={isSaving}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  {isSaving ? 'Saving...' : '✓ Save'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoogleMeasurementTool;
export type { SavedMeasurement };
