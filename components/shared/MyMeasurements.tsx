import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as api from '../../services/apiService';
import { SavedMeasurement } from '../../services/apiService';
import 'leaflet/dist/leaflet.css';

interface MyMeasurementsProps {
  userId: string;
}

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

// Custom marker icon for measurement center
const createMeasurementIcon = (index: number, isSelected: boolean) => {
  return L.divIcon({
    className: 'measurement-marker',
    html: `
      <div style="
        width: ${isSelected ? '32px' : '24px'};
        height: ${isSelected ? '32px' : '24px'};
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${isSelected ? '#10B981' : '#0252CD'};
        border-radius: 50%;
        color: white;
        font-size: ${isSelected ? '14px' : '11px'};
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
        transition: all 0.2s;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
    iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
  });
};

// Component to fit bounds when measurements change
const FitBoundsToMeasurements: React.FC<{ measurements: SavedMeasurement[], selectedId: string | null }> = ({ measurements, selectedId }) => {
  const map = useMap();

  useEffect(() => {
    if (measurements.length === 0) return;

    if (selectedId) {
      // Fit to selected measurement
      const selected = measurements.find(m => m.id === selectedId);
      if (selected && selected.points.length > 0) {
        const bounds = L.latLngBounds(selected.points.map(p => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      }
    } else {
      // Fit to all measurements
      const allPoints = measurements.flatMap(m => m.points);
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    }
  }, [measurements, selectedId, map]);

  return null;
};

const MyMeasurements: React.FC<MyMeasurementsProps> = ({ userId }) => {
  const { t } = useTranslation(['account']);

  const [measurements, setMeasurements] = useState<SavedMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxAllowed, setMaxAllowed] = useState(5);
  const [isPro, setIsPro] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch measurements
  const fetchMeasurements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getMeasurements();
      setMeasurements(response.measurements || []);
      setMaxAllowed(response.maxAllowed);
      setIsPro(response.isPro);
    } catch (err: any) {
      setError(err.message || 'Failed to load measurements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  // Calculate map center from all measurements
  const mapCenter = useMemo(() => {
    if (measurements.length === 0) return [42.0, 21.0] as [number, number]; // Default Balkans
    const allPoints = measurements.flatMap(m => m.points);
    if (allPoints.length === 0) return [42.0, 21.0] as [number, number];
    const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
    return [avgLat, avgLng] as [number, number];
  }, [measurements]);

  // Handle edit
  const handleEdit = (measurement: SavedMeasurement) => {
    setEditingId(measurement.id);
    setEditName(measurement.name || '');
    setEditAddress(measurement.address || '');
    setEditNotes(measurement.notes || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await api.updateMeasurement(id, {
        name: editName,
        address: editAddress,
        notes: editNotes,
      });
      setEditingId(null);
      fetchMeasurements();
    } catch (err: any) {
      setError(err.message || 'Failed to update measurement');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditAddress('');
    setEditNotes('');
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (isDeleting) return; // Prevent double-click
    setIsDeleting(true);
    try {
      await api.deleteMeasurement(id);
      setDeletingId(null);
      if (selectedMeasurement === id) setSelectedMeasurement(null);
      fetchMeasurements();
    } catch (err: any) {
      setError(err.message || 'Failed to delete measurement');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">My Measurements</h2>
          <p className="text-sm text-gray-500 mt-1">
            {measurements.length} of {maxAllowed} measurements used
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isPro ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {isPro ? 'Pro' : 'Free'}: {maxAllowed} max
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${
            measurements.length >= maxAllowed ? 'bg-amber-500' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.min(100, (measurements.length / maxAllowed) * 100)}%` }}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {measurements.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-3">📏</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Measurements Yet</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Use the measurement tool on the map to measure land distances and areas.
          </p>
          <a
            href="/map"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <span>🗺️</span> Open Map
          </a>
        </div>
      )}

      {/* Map + List View */}
      {measurements.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mini Map showing all measurements */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ height: '500px' }}>
            <div className="bg-gray-100 px-3 py-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">📍 All Measurements</span>
              {selectedMeasurement && (
                <button
                  onClick={() => setSelectedMeasurement(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Show All
                </button>
              )}
            </div>
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: 'calc(100% - 40px)', width: '100%' }}
              scrollWheelZoom={true}
              zoomControl={true}
            >
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                attribution="&copy; Google"
                maxZoom={21}
              />
              <FitBoundsToMeasurements measurements={measurements} selectedId={selectedMeasurement} />

              {/* Render all measurements */}
              {measurements.map((measurement, index) => {
                const isSelected = selectedMeasurement === measurement.id;
                const color = isSelected ? '#10B981' : '#0252CD';
                const opacity = selectedMeasurement && !isSelected ? 0.3 : 1;

                // Calculate center for marker
                const centerLat = measurement.points.reduce((sum, p) => sum + p.lat, 0) / measurement.points.length;
                const centerLng = measurement.points.reduce((sum, p) => sum + p.lng, 0) / measurement.points.length;

                return (
                  <React.Fragment key={measurement.id}>
                    {/* Polygon or Polyline */}
                    {measurement.type === 'area' ? (
                      <Polygon
                        positions={measurement.points.map(p => [p.lat, p.lng] as [number, number])}
                        pathOptions={{
                          color,
                          weight: isSelected ? 4 : 2,
                          fillColor: color,
                          fillOpacity: isSelected ? 0.35 : 0.15,
                          opacity,
                        }}
                        eventHandlers={{
                          click: () => setSelectedMeasurement(isSelected ? null : measurement.id),
                        }}
                      />
                    ) : (
                      <Polyline
                        positions={measurement.points.map(p => [p.lat, p.lng] as [number, number])}
                        pathOptions={{
                          color,
                          weight: isSelected ? 4 : 2,
                          opacity,
                        }}
                        eventHandlers={{
                          click: () => setSelectedMeasurement(isSelected ? null : measurement.id),
                        }}
                      />
                    )}

                    {/* Center marker with number */}
                    <Marker
                      position={[centerLat, centerLng]}
                      icon={createMeasurementIcon(index, isSelected)}
                      eventHandlers={{
                        click: () => setSelectedMeasurement(isSelected ? null : measurement.id),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[160px] p-2">
                          <div className="font-semibold text-gray-900 text-sm mb-1.5 leading-tight">
                            {measurement.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              measurement.type === 'area'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {measurement.type === 'area' ? '📐 Area' : '📏 Distance'}
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-sm font-bold text-gray-800">
                              {measurement.type === 'area'
                                ? formatArea(measurement.area || 0)
                                : formatDistance(measurement.distance || 0)
                              }
                            </div>
                            {measurement.address && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                📍 {measurement.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>

          {/* Measurements list */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {measurements.map((measurement, index) => (
              <div
                key={measurement.id}
                className={`bg-white border rounded-xl p-3 transition cursor-pointer ${
                  selectedMeasurement === measurement.id
                    ? 'border-green-500 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedMeasurement(
                  selectedMeasurement === measurement.id ? null : measurement.id
                )}
              >
                {editingId === measurement.id ? (
                  // Edit mode
                  <div className="space-y-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleCancelEdit} className="flex-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                      <button onClick={() => handleSaveEdit(measurement.id)} className="flex-1 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
                    </div>
                  </div>
                ) : deletingId === measurement.id ? (
                  // Delete confirmation
                  <div className="text-center py-2" onClick={e => e.stopPropagation()}>
                    <p className="text-xs text-gray-600 mb-2">Delete "{measurement.name}"?</p>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => setDeletingId(null)} disabled={isDeleting} className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                      <button onClick={() => handleDelete(measurement.id)} disabled={isDeleting} className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{isDeleting ? 'Deleting...' : 'Delete'}</button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center gap-3">
                    {/* Number badge */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      selectedMeasurement === measurement.id ? 'bg-green-500' : 'bg-blue-600'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm truncate">{measurement.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          measurement.type === 'area' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {measurement.type === 'area' ? 'Area' : 'Dist'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {measurement.type === 'area'
                          ? formatArea(measurement.area || 0)
                          : formatDistance(measurement.distance || 0)
                        }
                        {measurement.address && <span className="ml-2">• {measurement.address}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedMeasurement(measurement.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View on map"
                      >
                        🎯
                      </button>
                      <button
                        onClick={() => handleEdit(measurement)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeletingId(measurement.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyMeasurements;
