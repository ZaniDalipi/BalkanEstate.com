import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Hotspot } from '../../../../types';
import type { FlyOptions, PanZoomTransform } from '../../../../hooks/usePanZoom';
import { polygonBounds, toPolygon, type Bounds, type Point } from '../../../../utils/polygonGeometry';

/** How long the camera pushes in before the apartment opens (the glide itself eases on a little longer). */
export const DIVE_MS = 650;
/** The apartment ends up filling about a third of the frame; capped so the rendering stays sharp. */
export const DIVE_ZOOM: FlyOptions = { fill: 0.32, maxScale: 2.5 };

/** The pan/zoom camera the dive steers (a subset of `usePanZoom`). */
export interface DiveCamera {
  transform: PanZoomTransform;
  flyTo: (box: Bounds, opts?: FlyOptions) => boolean;
  glideTo: (t: PanZoomTransform) => boolean;
}

interface Dive {
  hotspot: Hotspot;
  /** Where the camera was before the dive; it glides back here once the apartment closes. */
  home: PanZoomTransform;
}

/** The region a unit is drawn as on this picture, if any. */
export const unitHotspot = (hotspots: Hotspot[], unitId?: string | null): Hotspot | undefined =>
  unitId ? hotspots.find((h) => h.linkType === 'unit' && h.linkId === unitId) : undefined;

/**
 * Clicking an apartment dives into it: the camera pushes in on the apartment
 * while the rest of the building washes out (`veil`), then the apartment
 * opens. When it closes, the camera glides back to where the buyer was.
 *
 * `openUnitId` is the apartment open in the details sheet (null when none);
 * leave it undefined and apartments open at once, as do other regions, and
 * everything under reduced motion or before the picture has a size.
 */
export function useApartmentDive(
  hotspots: Hotspot[],
  openUnitId: string | null | undefined,
  camera: DiveCamera,
  onActivate: (h: Hotspot) => void
) {
  const reduced = useReducedMotion();
  const [dive, setDive] = useState<Dive | null>(null);
  // Latest values without re-creating the click handler every render.
  const latest = useRef({ camera, onActivate });
  latest.current = { camera, onActivate };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opened = useRef(false);
  const enabled = openUnitId !== undefined && !reduced;
  useEffect(() => () => clearTimeout(timer.current), []);

  const activate = useCallback(
    (h: Hotspot) => {
      const { camera: cam, onActivate: open } = latest.current;
      if (timer.current) return; // one dive at a time
      if (!enabled || h.linkType !== 'unit') return open(h);
      const pts = toPolygon(h.shape, h.points as Point[]);
      const home = cam.transform;
      if (pts.length === 0 || !cam.flyTo(polygonBounds(pts), DIVE_ZOOM)) return open(h);
      opened.current = false;
      setDive({ hotspot: h, home });
      timer.current = setTimeout(() => {
        timer.current = undefined;
        latest.current.onActivate(h);
      }, DIVE_MS);
    },
    [enabled]
  );

  // Back to the building: once the apartment we dived into has opened and closed again, glide home.
  useEffect(() => {
    if (!dive) return;
    if (openUnitId) {
      opened.current = true;
      return;
    }
    if (!opened.current) return; // still pushing in: the apartment hasn't opened yet
    opened.current = false;
    latest.current.camera.glideTo(dive.home);
    setDive(null);
  }, [openUnitId, dive]);

  // While an apartment is open, it is the one left in colour; during the push-in, the one clicked.
  const veil = openUnitId ? unitHotspot(hotspots, openUnitId) : dive?.hotspot;
  return { activate, veil };
}
