import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/apiService';
import { SavedMeasurement } from '../../services/apiService';

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

const MyMeasurements: React.FC<MyMeasurementsProps> = ({ userId }) => {
  const { t } = useTranslation(['account']);

  const [measurements, setMeasurements] = useState<SavedMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxAllowed, setMaxAllowed] = useState(5);
  const [isPro, setIsPro] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      console.error('Failed to fetch measurements:', err);
      setError(err.message || 'Failed to load measurements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

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
      console.error('Failed to update measurement:', err);
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
    try {
      await api.deleteMeasurement(id);
      setDeletingId(null);
      fetchMeasurements();
    } catch (err: any) {
      console.error('Failed to delete measurement:', err);
      setError(err.message || 'Failed to delete measurement');
    }
  };

  // Open measurement in map view
  const handleViewOnMap = (measurement: SavedMeasurement) => {
    // Calculate center of points for the URL
    const centerLat = measurement.points.reduce((sum, p) => sum + p.lat, 0) / measurement.points.length;
    const centerLng = measurement.points.reduce((sum, p) => sum + p.lng, 0) / measurement.points.length;

    // Navigate to map page with measurement ID - will be fetched from backend
    window.location.href = `/map?measurementId=${measurement.id}&lat=${centerLat}&lng=${centerLng}&zoom=18`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">My Measurements</h2>
          <p className="text-sm text-gray-500 mt-1">
            {measurements.length} of {maxAllowed} measurements used
            {!isPro && measurements.length >= maxAllowed && (
              <span className="text-amber-600 ml-2">• Upgrade to Pro for more</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isPro ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isPro ? 'Pro' : 'Free'}: {maxAllowed} max
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
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
            Your saved measurements will appear here.
          </p>
          <a
            href="/map"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <span>🗺️</span> Open Map
          </a>
        </div>
      )}

      {/* Measurements list */}
      {measurements.length > 0 && (
        <div className="grid gap-4">
          {measurements.map((measurement) => (
            <div
              key={measurement.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
            >
              {editingId === measurement.id ? (
                // Edit mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Address/location"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notes"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(measurement.id)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : deletingId === measurement.id ? (
                // Delete confirmation
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 mb-4">Delete "{measurement.name}"?</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(measurement.id)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${measurement.type === 'area' ? '🔷' : '📏'}`}></span>
                        <h3 className="font-semibold text-gray-800">{measurement.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          measurement.type === 'area'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {measurement.type === 'area' ? 'Area' : 'Distance'}
                        </span>
                      </div>

                      {measurement.address && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <span>📍</span> {measurement.address}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewOnMap(measurement)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View on map"
                      >
                        🗺️
                      </button>
                      <button
                        onClick={() => handleEdit(measurement)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeletingId(measurement.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Measurements data */}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {measurement.type === 'area' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Area:</span>
                          <span className="font-semibold text-green-600">
                            {formatArea(measurement.area || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Perimeter:</span>
                          <span className="font-medium text-gray-700">
                            {formatDistance(measurement.perimeter || 0)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Distance:</span>
                        <span className="font-semibold text-blue-600">
                          {formatDistance(measurement.distance || 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Points:</span>
                      <span className="font-medium text-gray-700">{measurement.points.length}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {measurement.notes && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                      {measurement.notes}
                    </p>
                  )}

                  {/* Timestamp */}
                  <div className="mt-3 text-xs text-gray-400">
                    Created {new Date(measurement.createdAt).toLocaleDateString()}
                    {measurement.updatedAt && measurement.updatedAt !== measurement.createdAt && (
                      <span> • Updated {new Date(measurement.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyMeasurements;
