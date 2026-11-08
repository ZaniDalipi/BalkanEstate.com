import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Hotspot } from '../../../../types';
import { fitBox, type PanZoomTransform } from '../../../../hooks/usePanZoom';
import { polygonBounds, toPolygon, type Point } from '../../../../utils/polygonGeometry';
import { DIVE, DIVE_ZOOM, type DivePhase } from './diveTimeline';
import { flightPath } from './flightPath';

/** The pan/zoom camera the dive steers (a subset of `usePanZoom`). */
export interface DiveCamera {
  transform: PanZoomTransform;
  frameSize: () => { width: number; height: number };
  flyPath: (frames: PanZoomTransform[], ms: number) => boolean;
  stopFlight: () => void;
  liveTransform: () => PanZoomTransform;
}

interface Dive {
  hotspot: Hotspot;
  /** Where the camera was before the dive; it flies back here once the apartment closes. */
  home: PanZoomTransform;
  phase: DivePhase;
}

/** The region a unit is drawn as on this picture, if any. */
export const unitHotspot = (hotspots: Hotspot[], unitId?: string | null): Hotspot | undefined =>
  unitId ? hotspots.find((h) => h.linkType === 'unit' && h.linkId === unitId) : undefined;

/**
 * Opening an apartment from the picture is a flight into it (see
 * `diveTimeline`): the camera climbs towards the apartment, the building turns
 * into a white model around it, then the apartment opens. "Skip" opens it at
 * once; "Back" (or Esc) turns around. Once the apartment closes, the camera
 * flies back to where the buyer was.
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
  // Flying back out: the page's controls wait until the building is whole again.
  const [returning, setReturning] = useState(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Latest values without re-creating the handlers every render.
  const latest = useRef({ camera, onActivate, dive });
  latest.current = { camera, onActivate, dive };
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const opened = useRef(false);
  const enabled = openUnitId !== undefined && !reduced;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(
    () => () => {
      clearTimers();
      clearTimeout(returnTimer.current);
    },
    [clearTimers]
  );

  const flyHome = useCallback((home: PanZoomTransform) => {
    const cam = latest.current.camera;
    const from = cam.liveTransform();
    cam.stopFlight();
    if (!cam.flyPath(flightPath(from, home, cam.frameSize(), { lift: 0.02 }), DIVE.RETURN_MS)) return;
    clearTimeout(returnTimer.current);
    setReturning(true);
    returnTimer.current = setTimeout(() => setReturning(false), DIVE.RETURN_MS * 0.85);
  }, []);

  /** The apartment opens: at the end of the flight, or straight away on "Skip". */
  const open = useCallback(
    (h: Hotspot) => {
      clearTimers();
      latest.current.camera.stopFlight();
      setDive((d) => d && { ...d, phase: 'open' });
      latest.current.onActivate(h);
    },
    [clearTimers]
  );

  const activate = useCallback(
    (h: Hotspot) => {
      const { camera: cam, onActivate: openNow } = latest.current;
      if (timers.current.length > 0) return; // already flying somewhere
      if (!enabled || h.linkType !== 'unit') return openNow(h);
      const pts = toPolygon(h.shape, h.points as Point[]);
      const size = cam.frameSize();
      if (pts.length === 0 || !size.width || !size.height) return openNow(h);
      const home = cam.liveTransform();
      const target = fitBox(polygonBounds(pts), size, DIVE_ZOOM.maxScale, DIVE_ZOOM.fill);
      if (!cam.flyPath(flightPath(home, target, size), DIVE.FLIGHT_MS)) return openNow(h);
      opened.current = false;
      setDive({ hotspot: h, home, phase: 'flight' });
      timers.current = [
        setTimeout(() => setDive((d) => (d && d.phase === 'flight' ? { ...d, phase: 'ghost' } : d)), DIVE.GHOST_AT),
        setTimeout(() => open(h), DIVE.OPEN_AT),
      ];
    },
    [enabled, open]
  );

  /** "Skip": open the apartment now. */
  const skip = useCallback(() => {
    const d = latest.current.dive;
    if (d && d.phase !== 'open') open(d.hotspot);
  }, [open]);

  /** "Back to building" (or Esc) during the flight: turn around. */
  const cancel = useCallback(() => {
    const d = latest.current.dive;
    if (!d || d.phase === 'open') return;
    clearTimers();
    flyHome(d.home);
    setDive(null);
  }, [clearTimers, flyHome]);

  // Esc mid-flight turns around (before the stage's own Esc, which would leave full screen).
  const flying = !!dive && dive.phase !== 'open';
  useEffect(() => {
    if (!flying) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      cancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [flying, cancel]);

  // Back to the building: once the apartment we flew into has opened and closed again, fly home.
  useEffect(() => {
    if (!dive) return;
    if (openUnitId) {
      opened.current = true;
      return;
    }
    if (!opened.current) return; // still flying in: the apartment hasn't opened yet
    opened.current = false;
    flyHome(dive.home);
    setDive(null);
  }, [openUnitId, dive, flyHome]);

  // While an apartment is open it is the one left in colour; during the flight, the one clicked.
  const veil = openUnitId ? unitHotspot(hotspots, openUnitId) : dive?.hotspot;
  const phase: DivePhase | undefined = openUnitId ? (veil ? 'open' : undefined) : dive?.phase;
  return { activate, veil, phase, flying, returning, skip, cancel, target: dive?.hotspot };
}
