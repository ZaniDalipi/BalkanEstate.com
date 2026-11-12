import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import {
  loadMaps3d,
  openingCamera,
  setShapePath,
  type Camera3DState,
  type LatLngAlt,
  type Map3D,
} from '../utils/google3d';
import { HOUSE_HEIGHT_M, houseShapes } from '../utils/house';
import { slopeZones } from '../utils/slopeZones';
import { START_PITCH } from '../utils/terrain3dScene';
import type { Camera3D } from './useCamera3D';

export type Google3DStatus = 'loading' | 'ready' | 'unavailable';

export interface Google3DOptions {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  /** Lay the slope classes on the ground as coloured zones. */
  showZones: boolean;
  spotLabel: string;
  reduceMotion: boolean;
}

/** How see-through the slope zones are over the 3D photo. */
const ZONE_ALPHA = 0.5;
const TURN_STEP = 45;
const ZOOM_STEP = 1.6;
const TILTED_FROM = 12;
const MOVE_MS = 600;
const ORBIT_MS = 45000;

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
const ground = (p: TerrainPoint): LatLngAlt => ({ lat: p.lat, lng: p.lng, altitude: 0 });

/**
 * Google's photorealistic 3D map of the drawn area: its outline, the slope
 * classes laid on the ground, and a house at the best place to build with its
 * label above it. Returns the camera buttons' actions. 'unavailable' when the
 * 3D library can't be loaded (the caller then shows the grid of blocks).
 */
export function useGoogle3DMap(container: React.RefObject<HTMLDivElement>, o: Google3DOptions) {
  const [status, setStatus] = useState<Google3DStatus>('loading');
  const [map, setMap] = useState<Map3D | null>(null);
  const [tilted, setTilted] = useState(true);
  const [orbiting, setOrbiting] = useState(false);
  const zones = useRef<HTMLElement[]>([]);
  const latest = useRef(o);
  latest.current = o;
  const { analysis, polygon, showZones, reduceMotion } = o;
  const start = useMemo(() => openingCamera(analysis, polygon), [analysis, polygon]);

  useEffect(() => {
    const host = container.current;
    if (!host) return undefined;
    let cancelled = false;
    let made: Map3D | null = null;

    void loadMaps3d().then((lib) => {
      if (cancelled) return;
      if (!lib) { setStatus('unavailable'); return; }
      try {
        const el = new lib.Map3DElement({
          ...start,
          // Photo only, without Google's own place labels and buttons: ours sit over it.
          mode: 'SATELLITE',
          defaultLabelsDisabled: true,
          defaultUIHidden: true,
        });
        el.style.display = 'block';
        el.style.width = '100%';
        el.style.height = '100%';

        zones.current = slopeZones(analysis).map((zone) => {
          const shape = new lib.Polygon3DElement({
            altitudeMode: 'CLAMP_TO_GROUND',
            fillColor: withAlpha(zone.color, ZONE_ALPHA),
            strokeColor: 'rgba(255, 255, 255, 0.55)',
            strokeWidth: 1,
            drawsOccludedSegments: false,
          });
          setShapePath(shape, zone.outer.map(ground), zone.holes.map((hole) => hole.map(ground)));
          return shape;
        });
        if (latest.current.showZones) el.append(...zones.current);

        const outline = new lib.Polyline3DElement({
          altitudeMode: 'CLAMP_TO_GROUND',
          strokeColor: '#ffffff',
          strokeWidth: 3,
          outerColor: 'rgba(0, 0, 0, 0.35)',
          outerWidth: 0.6,
          drawsOccludedSegments: true,
        });
        setShapePath(outline, [...polygon, polygon[0]].map(ground));
        el.append(outline);

        const spot = analysis.buildSpot;
        if (spot) {
          for (const face of houseShapes(spot)) {
            const shape = new lib.Polygon3DElement({
              altitudeMode: 'RELATIVE_TO_GROUND',
              fillColor: face.color,
              strokeColor: 'rgba(0, 0, 0, 0.18)',
              strokeWidth: 1,
              extruded: face.extruded,
            });
            setShapePath(shape, face.points);
            el.append(shape);
          }
          if (lib.Marker3DElement) {
            el.append(new lib.Marker3DElement({
              position: { lat: spot.lat, lng: spot.lng, altitude: HOUSE_HEIGHT_M + 2 },
              altitudeMode: 'RELATIVE_TO_GROUND',
              label: latest.current.spotLabel,
            }));
          }
        }

        host.replaceChildren(el);
        made = el;
        setMap(el);
        setStatus('ready');
      } catch {
        setStatus('unavailable');
      }
    });

    return () => {
      cancelled = true;
      made?.remove();
      zones.current = [];
      setMap(null);
      setStatus('loading');
    };
  }, [container, analysis, polygon, start]);

  // Slope zones on or off.
  useEffect(() => {
    if (!map) return;
    for (const zone of zones.current) {
      if (showZones && !zone.isConnected) map.append(zone);
      if (!showZones && zone.isConnected) zone.remove();
    }
  }, [map, showZones]);

  // Stop flying around at the first touch, and keep "2D/3D" in step with the camera.
  useEffect(() => {
    if (!map) return undefined;
    const stop = () => {
      map.stopCameraAnimation?.();
      setOrbiting(false);
    };
    const readTilt = () => setTilted((map.tilt ?? 0) > TILTED_FROM);
    map.addEventListener('pointerdown', stop);
    map.addEventListener('wheel', stop);
    map.addEventListener('gmp-animationend', () => setOrbiting(false));
    map.addEventListener('gmp-tiltchange', readTilt);
    return () => {
      map.removeEventListener('pointerdown', stop);
      map.removeEventListener('wheel', stop);
      map.removeEventListener('gmp-tiltchange', readTilt);
    };
  }, [map]);

  const current = useCallback((): Camera3DState | null => {
    if (!map?.center) return null;
    return { center: map.center, range: map.range ?? start.range, tilt: map.tilt ?? 0, heading: map.heading ?? 0 };
  }, [map, start]);

  const fly = useCallback((change: Partial<Camera3DState>, ms = MOVE_MS) => {
    const from = current();
    if (!map || !from) return;
    map.stopCameraAnimation?.();
    setOrbiting(false);
    const endCamera = { ...from, ...change };
    if (map.flyCameraTo && !reduceMotion) {
      map.flyCameraTo({ endCamera, durationMillis: ms });
    } else {
      map.center = endCamera.center;
      map.range = endCamera.range;
      map.tilt = endCamera.tilt;
      map.heading = endCamera.heading;
    }
    if (change.tilt !== undefined) setTilted(change.tilt > TILTED_FROM);
  }, [map, current, reduceMotion]);

  const camera: Camera3D = {
    zoomIn: () => { const c = current(); if (c) fly({ range: c.range / ZOOM_STEP }); },
    zoomOut: () => { const c = current(); if (c) fly({ range: c.range * ZOOM_STEP }); },
    turnLeft: () => { const c = current(); if (c) fly({ heading: c.heading - TURN_STEP }); },
    turnRight: () => { const c = current(); if (c) fly({ heading: c.heading + TURN_STEP }); },
    tilted,
    toggleTilt: () => fly({ tilt: tilted ? 0 : START_PITCH + 4 }, 900),
    reset: () => fly(start, 1000),
    orbiting,
    toggleOrbit: () => {
      const c = current();
      if (!map || !c) return;
      if (orbiting) { map.stopCameraAnimation?.(); setOrbiting(false); return; }
      map.flyCameraAround?.({ camera: c, durationMillis: ORBIT_MS, repeatCount: 1 });
      setOrbiting(true);
    },
    canOrbit: !reduceMotion && Boolean(map?.flyCameraAround),
  };

  return { status, camera };
}
