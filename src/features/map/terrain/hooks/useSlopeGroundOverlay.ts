import { useEffect } from 'react';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { drawSlopeImage, planSlopeImage } from '../utils/drawSlopeImage';

/**
 * Lay the slope picture for an analysis over the map, under the outline and
 * arrows. Removed (and its image freed) when the analysis goes away.
 */
export function useSlopeGroundOverlay(
  map: google.maps.Map | null,
  analysis: TerrainAnalysis | null,
  polygon: TerrainPoint[],
): void {
  useEffect(() => {
    if (!map || !analysis) return undefined;
    const { grid, field } = analysis;
    const plan = planSlopeImage(grid.rows, grid.cols);
    const canvas = document.createElement('canvas');
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    drawSlopeImage(ctx, grid, field, polygon, plan);

    let cancelled = false;
    let url: string | null = null;
    let overlay: google.maps.GroundOverlay | null = null;
    canvas.toBlob((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      overlay = new google.maps.GroundOverlay(
        url,
        { south: grid.south, west: grid.west, north: grid.north, east: grid.east },
        { clickable: false },
      );
      overlay.setMap(map);
    }, 'image/png');

    return () => {
      cancelled = true;
      overlay?.setMap(null);
      if (url) URL.revokeObjectURL(url);
    };
  }, [map, analysis, polygon]);
}
