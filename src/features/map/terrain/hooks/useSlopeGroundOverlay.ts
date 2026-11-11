import { useEffect } from 'react';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { createSlopeImageUrl } from '../utils/slopeImageUrl';

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
    const { grid } = analysis;
    let cancelled = false;
    let url: string | null = null;
    let overlay: google.maps.GroundOverlay | null = null;

    void createSlopeImageUrl(analysis, polygon).then((made) => {
      if (!made) return;
      if (cancelled) { URL.revokeObjectURL(made); return; }
      url = made;
      overlay = new google.maps.GroundOverlay(
        url,
        { south: grid.south, west: grid.west, north: grid.north, east: grid.east },
        { clickable: false },
      );
      overlay.setMap(map);
    });

    return () => {
      cancelled = true;
      overlay?.setMap(null);
      if (url) URL.revokeObjectURL(url);
    };
  }, [map, analysis, polygon]);
}
