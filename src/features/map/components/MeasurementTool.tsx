import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMap, Polyline, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface MeasurementPoint {
  lat: number;
  lng: number;
}

interface SavedMeasurement {
  id: string;
  points: MeasurementPoint[];
  type: 'distance' | 'area';
  distance?: number; // meters
  area?: number; // square meters
  perimeter?: number; // meters
  address?: string;
  createdAt: Date;
}

interface MeasurementToolProps {
  enabled: boolean;
  onSave?: (measurement: SavedMeasurement) => void;
  onClose?: () => void;
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

const MeasurementTool: React.FC<MeasurementToolProps> = ({ enabled, onSave, onClose }) => {
  const map = useMap();
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const [address, setAddress] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<MeasurementPoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle map clicks to add points
  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      setIsPolygonClosed(false);
      setShowSaveDialog(false);
      return;
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isPolygonClosed) return;

      const newPoint: MeasurementPoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };

      // Check if clicking near first point to close polygon (if we have 3+ points)
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = calculateDistance(newPoint, firstPoint);
        if (distance < 20) {
          // Within 20 meters of first point
          setIsPolygonClosed(true);
          return;
        }
      }

      setPoints((prev) => [...prev, newPoint]);
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isPolygonClosed) {
        setCursorPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
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
  }, [enabled, map, points, isPolygonClosed]);

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
    setAddress('');
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (points.length < 2) return;

    const measurement: SavedMeasurement = {
      id: `measurement-${Date.now()}`,
      points,
      type: isPolygonClosed ? 'area' : 'distance',
      distance: totalDistance,
      area: isPolygonClosed ? area : undefined,
      perimeter: isPolygonClosed ? perimeter : undefined,
      address: address || undefined,
      createdAt: new Date(),
    };

    onSave?.(measurement);
    setShowSaveDialog(false);

    // Save to localStorage for persistence
    const saved = JSON.parse(localStorage.getItem('savedMeasurements') || '[]');
    saved.push(measurement);
    localStorage.setItem('savedMeasurements', JSON.stringify(saved));
  }, [points, isPolygonClosed, totalDistance, area, perimeter, address, onSave]);

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
          <Polyline
            positions={previewPoints.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: '#0252CD',
              weight: 3,
              dashArray: cursorPosition && points.length > 0 ? '10, 5' : undefined,
            }}
          />
        )
      )}

      {/* Point markers */}
      {points.map((point, index) => (
        <Marker
          key={`point-${index}`}
          position={[point.lat, point.lng]}
          icon={measurementIcon}
        >
          <Popup>
            <div className="text-xs">
              <strong>Point {index + 1}</strong>
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
      ))}

      {/* Measurement info panel */}
      <div
        ref={containerRef}
        className="absolute top-4 right-4 z-[1001] bg-white rounded-xl shadow-xl p-4 min-w-[280px]"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>📏</span> Measurement Tool
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        {points.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">
            Click on the map to start measuring. Click near the first point to close a polygon.
          </p>
        )}

        {/* Measurements display */}
        {points.length > 0 && (
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Points:</span>
              <span className="font-medium">{points.length}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {isPolygonClosed ? 'Perimeter:' : 'Distance:'}
              </span>
              <span className="font-medium text-blue-600">
                {formatDistance(isPolygonClosed ? perimeter : totalDistance)}
              </span>
            </div>

            {!isPolygonClosed && previewDistance > 0 && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>+ to cursor:</span>
                <span>{formatDistance(previewDistance)}</span>
              </div>
            )}

            {isPolygonClosed && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Area:</span>
                <span className="font-medium text-green-600">{formatArea(area)}</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleUndo}
            disabled={points.length === 0}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↩ Undo
          </button>
          <button
            onClick={handleClear}
            disabled={points.length === 0}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑 Clear
          </button>
        </div>

        {/* Save section */}
        {points.length >= 2 && (
          <>
            {!showSaveDialog ? (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                💾 Save Measurement
              </button>
            ) : (
              <div className="space-y-2 border-t pt-3">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter address or name..."
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    ✓ Save
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="mt-3 pt-3 border-t text-[10px] text-gray-400">
          <span className="font-medium">Tips:</span> Click to add points • Double-click near start to close polygon
        </div>
      </div>
    </>
  );
};

export default MeasurementTool;
