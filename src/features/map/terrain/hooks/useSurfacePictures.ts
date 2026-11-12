import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { terrainKeys } from '@/src/shared/query/queryKeys';
import type { ElevationGrid, TerrainAnalysis, TerrainPoint } from '../types';
import { contourInterval } from '../utils/contours';
import { groundRelief, groundSurface, plotSlopeOverlay, plotSurface } from '../utils/plotTexture';
import { loadSatelliteImage } from '../utils/satelliteImage';
import { computeSlopeField } from '../utils/slopeField';
import { boxSizeM } from '../utils/surroundings';

/** What is draped over the ground, and over the plot on its own sheet. */
export interface SurfaceLayers {
  ground: HTMLCanvasElement;
  plot: HTMLCanvasElement;
}

export interface SurfacePictures {
  /** The plot's slope colours, on the surroundings (photo once it has arrived, grey relief until then). */
  slope: SurfaceLayers | null;
  /** The photo everywhere, with the plot's outline; null until it has arrived, or if it can't. */
  satellite: SurfaceLayers | null;
}

function heightRange(grid: ElevationGrid): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const h of grid.elevations) if (h !== null) { min = Math.min(min, h); max = Math.max(max, h); }
  return { min, max };
}

/** The pictures to drape over the 3D ground, for the land round the plot. */
export function useSurfacePictures(ground: ElevationGrid | null, analysis: TerrainAnalysis, polygon: TerrainPoint[]): SurfacePictures {
  const photo = useQuery({
    queryKey: ground ? terrainKeys.satellite(ground) : terrainKeys.all,
    queryFn: () => loadSatelliteImage(ground as ElevationGrid),
    enabled: ground !== null,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const overlay = useMemo(
    () => plotSlopeOverlay(analysis.grid, analysis.field, polygon, analysis.contourIntervalM),
    [analysis, polygon],
  );
  const relief = useMemo(() => {
    if (!ground) return null;
    const { min, max } = heightRange(ground);
    return groundRelief(ground, computeSlopeField(ground), Number.isFinite(min) ? contourInterval(min, max) : null);
  }, [ground]);

  const plotSlope = useMemo(() => plotSurface(analysis.grid, polygon, overlay), [analysis.grid, polygon, overlay]);
  const plotOutline = useMemo(() => plotSurface(analysis.grid, polygon, null), [analysis.grid, polygon]);

  return useMemo(() => {
    if (!ground || !plotSlope || !plotOutline) return { slope: null, satellite: null };
    const size = boxSizeM(ground);
    const base = photo.data ?? relief;
    const groundPicture = base ? groundSurface(size, base) : null;
    const photoPicture = photo.data ? groundSurface(size, photo.data) : null;
    return {
      slope: groundPicture ? { ground: groundPicture, plot: plotSlope } : null,
      satellite: photoPicture ? { ground: photoPicture, plot: plotOutline } : null,
    };
  }, [ground, photo.data, relief, plotSlope, plotOutline]);
}
