/**
 * useMeasurement - Handles map measurement tools
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SaveMeasurementUseCase, GetMeasurementsUseCase } from '@/src/domain/usecases/measurement';
import { measurementRepository } from '@/src/data/repositories/MeasurementRepository';
import { MeasurementLimitExceededError, InvalidMeasurementError } from '@/src/domain/repositories/IMeasurementRepository';
import { MEASUREMENT_LIMITS } from '@/src/domain/entities/Measurement';

export interface MeasurementPoint {
  lat: number;
  lng: number;
}

export interface LocalMeasurement {
  id: string;
  points: MeasurementPoint[];
  mode: 'distance' | 'area';
  distance: number;
  area: number;
  perimeter: number;
  createdAt: number;
}

// Calculate distance using Haversine formula - exported for reuse
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

export const calculateTotalDistance = (points: MeasurementPoint[]): number => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
};

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

export const formatMeasureDistance = (meters: number): string => {
  if (meters < 1000) return `${meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

export const formatMeasureArea = (sqMeters: number): string => {
  if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`;
  const hectares = sqMeters / 10000;
  if (hectares < 100) return `${hectares.toFixed(2)} ha`;
  return `${(sqMeters / 1000000).toFixed(2)} km²`;
};

interface UseMeasurementProps {
  map: google.maps.Map | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  setMapStyle: (style: 'satellite' | 'street' | 'clean' | 'color' | 'hybrid') => void;
}

export const useMeasurement = ({
  map,
  isLoaded,
  isAuthenticated,
  setMapStyle,
}: UseMeasurementProps) => {
  // State
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area'>('area');
  const [localMeasurements, setLocalMeasurements] = useState<LocalMeasurement[]>([]);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [measurementName, setMeasurementName] = useState('');
  const [measurementAddress, setMeasurementAddress] = useState('');
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [pendingMeasurement, setPendingMeasurement] = useState<LocalMeasurement | null>(null);

  // Limit state
  const [measurementCount, setMeasurementCount] = useState<number>(0);
  const [measurementMaxAllowed, setMeasurementMaxAllowed] = useState<number>(MEASUREMENT_LIMITS.FREE_MAX);
  const [measurementIsPro, setMeasurementIsPro] = useState(false);
  const [measurementSaveError, setMeasurementSaveError] = useState<string | null>(null);
  const [isAtMeasurementLimit, setIsAtMeasurementLimit] = useState(false);

  // Fetch measurement limits
  useEffect(() => {
    const fetchMeasurementLimits = async () => {
      if (!isAuthenticated) {
        setMeasurementCount(0);
        setMeasurementMaxAllowed(MEASUREMENT_LIMITS.FREE_MAX);
        setMeasurementIsPro(false);
        setIsAtMeasurementLimit(false);
        return;
      }

      try {
        const getMeasurementsUseCase = new GetMeasurementsUseCase(measurementRepository);
        const result = await getMeasurementsUseCase.execute();
        setMeasurementCount(result.count);
        setMeasurementMaxAllowed(result.maxAllowed);
        setMeasurementIsPro(result.isPro);
        setIsAtMeasurementLimit(result.isAtLimit);
      } catch (error) {
        console.error('[Map] Failed to fetch measurement limits:', error);
      }
    };

    fetchMeasurementLimits();
  }, [isAuthenticated]);

  // Handle measurement mode click listener
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (showMeasurement) {
      setMapStyle('satellite');

      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          setMeasurementPoints(prev => [...prev, { lat: e.latLng!.lat(), lng: e.latLng!.lng() }]);
        }
      });

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }
  }, [showMeasurement, map, isLoaded, setMapStyle]);

  // Calculated values
  const measurementDistance = useMemo(() => {
    if (measurementPoints.length < 2) return 0;
    return calculateTotalDistance(measurementPoints);
  }, [measurementPoints]);

  const measurementArea = useMemo(() => {
    if (measurementPoints.length < 3) return 0;
    return calculatePolygonArea(measurementPoints);
  }, [measurementPoints]);

  const measurementPerimeter = useMemo(() => {
    if (measurementPoints.length < 3) return 0;
    const perim = calculateTotalDistance(measurementPoints);
    return perim + calculateDistance(measurementPoints[measurementPoints.length - 1], measurementPoints[0]);
  }, [measurementPoints]);

  // Open save modal
  const handleOpenSaveModal = useCallback(() => {
    if (measurementPoints.length < 2) return;
    if (measurementMode === 'area' && measurementPoints.length < 3) return;

    const newMeasurement: LocalMeasurement = {
      id: `measurement-${Date.now()}`,
      points: [...measurementPoints],
      mode: measurementMode,
      distance: measurementDistance,
      area: measurementArea,
      perimeter: measurementPerimeter,
      createdAt: Date.now(),
    };

    setPendingMeasurement(newMeasurement);
    setMeasurementName('');
    setMeasurementAddress('');
    setMeasurementNotes('');
    setMeasurementSaveError(null);
    setShowSaveModal(true);
  }, [measurementPoints, measurementMode, measurementDistance, measurementArea, measurementPerimeter]);

  // Save measurement to backend
  const handleSaveMeasurement = useCallback(async () => {
    if (!pendingMeasurement || !measurementName.trim()) return;

    setMeasurementSaveError(null);
    setSavingMeasurement(true);

    try {
      if (isAuthenticated) {
        if (isAtMeasurementLimit) {
          throw new MeasurementLimitExceededError(measurementCount, measurementMaxAllowed, measurementIsPro);
        }

        const saveMeasurementUseCase = new SaveMeasurementUseCase(measurementRepository);
        const result = await saveMeasurementUseCase.execute({
          name: measurementName.trim(),
          points: pendingMeasurement.points,
          type: pendingMeasurement.mode,
          distance: pendingMeasurement.distance,
          area: pendingMeasurement.area,
          perimeter: pendingMeasurement.perimeter,
          address: measurementAddress.trim() || undefined,
          notes: measurementNotes.trim() || undefined,
        });

        setMeasurementCount(result.count);
        setIsAtMeasurementLimit(result.count >= result.maxAllowed);
      }

      setLocalMeasurements(prev => [...prev, pendingMeasurement]);
      setMeasurementPoints([]);
      setShowSaveModal(false);
      setPendingMeasurement(null);
    } catch (error: any) {
      console.error('Failed to save measurement:', error);

      if (error instanceof MeasurementLimitExceededError) {
        setMeasurementSaveError(
          error.isPro
            ? `You've reached the maximum limit of ${error.maxAllowed} measurements.`
            : `Free users can save up to ${error.maxAllowed} measurements. Upgrade to Pro for more!`
        );
        setIsAtMeasurementLimit(true);
        return;
      } else if (error instanceof InvalidMeasurementError) {
        setMeasurementSaveError(error.message);
        return;
      } else {
        setMeasurementSaveError('Failed to save to your profile. Saved locally instead.');
        setLocalMeasurements(prev => [...prev, pendingMeasurement]);
        setMeasurementPoints([]);
        setTimeout(() => {
          setShowSaveModal(false);
          setPendingMeasurement(null);
          setMeasurementSaveError(null);
        }, 2000);
      }
    } finally {
      setSavingMeasurement(false);
    }
  }, [pendingMeasurement, measurementName, measurementAddress, measurementNotes, isAuthenticated, isAtMeasurementLimit, measurementCount, measurementMaxAllowed, measurementIsPro]);

  // Quick save without modal
  const handleQuickSave = useCallback(() => {
    if (measurementPoints.length < 2) return;
    if (measurementMode === 'area' && measurementPoints.length < 3) return;

    const newMeasurement: LocalMeasurement = {
      id: `measurement-${Date.now()}`,
      points: [...measurementPoints],
      mode: measurementMode,
      distance: measurementDistance,
      area: measurementArea,
      perimeter: measurementPerimeter,
      createdAt: Date.now(),
    };

    setLocalMeasurements(prev => [...prev, newMeasurement]);
    setMeasurementPoints([]);
  }, [measurementPoints, measurementMode, measurementDistance, measurementArea, measurementPerimeter]);

  // Remove measurement
  const handleRemoveMeasurement = useCallback((id: string) => {
    setLocalMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Clear all
  const handleClearAllMeasurements = useCallback(() => {
    setLocalMeasurements([]);
    setMeasurementPoints([]);
  }, []);

  // Undo last point
  const handleUndoPoint = useCallback(() => {
    setMeasurementPoints(prev => prev.slice(0, -1));
  }, []);

  return {
    // State
    showMeasurement,
    setShowMeasurement,
    measurementPoints,
    setMeasurementPoints,
    measurementMode,
    setMeasurementMode,
    localMeasurements,

    // Save modal
    showSaveModal,
    setShowSaveModal,
    savingMeasurement,
    measurementName,
    setMeasurementName,
    measurementAddress,
    setMeasurementAddress,
    measurementNotes,
    setMeasurementNotes,
    measurementSaveError,

    // Limits
    measurementCount,
    measurementMaxAllowed,
    measurementIsPro,
    isAtMeasurementLimit,

    // Calculated values
    measurementDistance,
    measurementArea,
    measurementPerimeter,

    // Actions
    handleOpenSaveModal,
    handleSaveMeasurement,
    handleQuickSave,
    handleRemoveMeasurement,
    handleClearAllMeasurements,
    handleUndoPoint,
  };
};
