import { useCallback, useMemo, useState } from 'react';
import { calculatePolygonArea } from '../../hooks/useMeasurement';
import type { TerrainPoint } from '../types';
import { analyzeTerrain } from '../utils/analyzeTerrain';
import { requestBounds } from '../utils/gridGeometry';
import { terrainPhase } from '../utils/terrainPhase';
import { validateTerrainArea } from '../utils/validateTerrainArea';
import { useElevationGrid } from './useElevationGrid';
import { useMapPointDrawing } from './useMapPointDrawing';

/**
 * The terrain tool's state: corners being placed, the area sent for analysis,
 * and what came back. Map taps add corners only while drawing.
 */
export function useTerrainTool(map: google.maps.Map | null, active: boolean) {
  const [points, setPoints] = useState<TerrainPoint[]>([]);
  const [submitted, setSubmitted] = useState<TerrainPoint[] | null>(null);

  const bounds = useMemo(() => (submitted ? requestBounds(submitted) : null), [submitted]);
  const query = useElevationGrid(bounds);
  const result = useMemo(
    () => (query.data && submitted ? analyzeTerrain(query.data.grid, submitted) : null),
    [query.data, submitted],
  );
  const phase = terrainPhase({ submitted: submitted !== null, error: query.error, result });

  const validation = useMemo(() => validateTerrainArea(points), [points]);
  const areaM2 = useMemo(() => calculatePolygonArea(points), [points]);

  const addPoint = useCallback((p: TerrainPoint) => setPoints((prev) => [...prev, p]), []);
  useMapPointDrawing(map, active && submitted === null, addPoint);

  const undo = useCallback(() => setPoints((prev) => prev.slice(0, -1)), []);
  const clear = useCallback(() => setPoints([]), []);
  const analyze = useCallback(() => {
    if (validation.isValid) setSubmitted(points);
  }, [validation, points]);
  const editArea = useCallback(() => setSubmitted(null), []);
  const redraw = useCallback(() => { setSubmitted(null); setPoints([]); }, []);
  const retry = useCallback(() => { void query.refetch(); }, [query]);
  const showOnMap = useCallback((spot: TerrainPoint) => {
    if (!map) return;
    map.panTo(spot);
    map.setZoom(Math.max(map.getZoom() ?? 17, 17));
  }, [map]);

  return {
    points,
    areaM2,
    validation,
    phase,
    resolutionM: query.data?.source.resolutionM ?? 30,
    undo,
    clear,
    analyze,
    editArea,
    redraw,
    retry,
    showOnMap,
  };
}

export type TerrainTool = ReturnType<typeof useTerrainTool>;
