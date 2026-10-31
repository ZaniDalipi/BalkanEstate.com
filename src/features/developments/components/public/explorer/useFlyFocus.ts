import { useEffect, useRef } from 'react';
import { useMediaQuery } from '@/src/hooks/useMediaQuery';
import type { Hotspot } from '../../../types';
import { FLY_MS } from '../../../hooks/usePanZoom';
import { polygonBounds, toPolygon, type Bounds, type Point } from '../../../utils/polygonGeometry';

/** Where the budget helper is taking the buyer: one region; `nonce` re-runs the same one. */
export interface ExplorerFocus {
  hotspotId: string;
  nonce: number;
}

/** Pause on the highlighted region before moving on, so the buyer sees where they landed. */
const LINGER_MS = 450;

/**
 * Glide the picture to the focused region, let it pulse for a moment, then
 * report arrival (the explorer then drills in or opens the apartment). With
 * reduced motion there is no glide, just the highlight and a short pause.
 */
export function useFlyFocus(
  focus: ExplorerFocus | undefined,
  hotspots: Hotspot[],
  flyTo: (box: Bounds) => void,
  onArrive: ((h: Hotspot) => void) | undefined
) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Latest values without re-running the glide on every render.
  const latest = useRef({ hotspots, flyTo, onArrive });
  latest.current = { hotspots, flyTo, onArrive };
  const hotspotId = focus?.hotspotId;
  const nonce = focus?.nonce;

  useEffect(() => {
    if (!hotspotId) return undefined;
    const h = latest.current.hotspots.find((x) => x.id === hotspotId);
    if (!h) return undefined;
    const pts = toPolygon(h.shape, h.points as Point[]);
    // Wait a frame so a freshly mounted picture has its size before gliding.
    const frame = requestAnimationFrame(() => {
      if (!reduced && pts.length > 0) latest.current.flyTo(polygonBounds(pts));
    });
    const timer = setTimeout(() => latest.current.onArrive?.(h), (reduced ? 0 : FLY_MS) + LINGER_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [hotspotId, nonce, reduced]);
}
