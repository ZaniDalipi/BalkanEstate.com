import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { createSlopeImageUrl } from '../utils/slopeImageUrl';

/** How long the slope picture takes to fade in. */
const FADE_MS = 350;

/**
 * Lay the slope picture for an analysis over the map, under the outline and
 * arrows, fading it in (at once under reduced motion). Removed, and its image
 * freed, when the analysis goes away.
 */
export function useSlopeGroundOverlay(
  map: google.maps.Map | null,
  analysis: TerrainAnalysis | null,
  polygon: TerrainPoint[],
): void {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!map || !analysis) return undefined;
    const { grid } = analysis;
    let cancelled = false;
    let frame = 0;
    let url: string | null = null;
    let overlay: google.maps.GroundOverlay | null = null;

    void createSlopeImageUrl(analysis, polygon).then((made) => {
      if (!made) return;
      if (cancelled) { URL.revokeObjectURL(made); return; }
      url = made;
      const picture = new google.maps.GroundOverlay(
        url,
        { south: grid.south, west: grid.west, north: grid.north, east: grid.east },
        { clickable: false, opacity: reduceMotion ? 1 : 0 },
      );
      overlay = picture;
      picture.setMap(map);
      if (reduceMotion) return;
      const started = performance.now();
      const fade = (now: number) => {
        const t = Math.min(1, (now - started) / FADE_MS);
        picture.setOpacity(t);
        if (t < 1) frame = requestAnimationFrame(fade);
      };
      frame = requestAnimationFrame(fade);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      overlay?.setMap(null);
      if (url) URL.revokeObjectURL(url);
    };
  }, [map, analysis, polygon, reduceMotion]);
}
