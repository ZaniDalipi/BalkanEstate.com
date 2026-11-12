import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { between, fitRadius, orbitOf, placeOnOrbit, startOrbit, TOP_DOWN, type Orbit } from '../utils/orbitCamera';
import { MODEL_SIZE } from '../utils/plotModel';
import { createPlotScene, type PlotScene } from '../utils/plotScene';
import { satelliteTexture, slopeTexture } from '../utils/plotTexture';
import { loadSatelliteImage } from '../utils/satelliteImage';
import { easeInOut, openingBearing, type Exaggeration } from '../utils/terrain3dScene';
import type { Camera3D } from './camera3d';

export type PlotModelStatus = 'loading' | 'ready' | 'failed';
export type PlotSurface = 'slope' | 'satellite';

export interface PlotModelOptions {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  surface: PlotSurface;
  exaggeration: Exaggeration;
  reduceMotion: boolean;
}

const MOVE_MS = 550;
const STRETCH_MS = 450;
const ZOOM_STEP = 0.72;
const TURN_STEP = Math.PI / 4;
const TILTED_FROM = (12 * Math.PI) / 180;
const FOV = 35;
/** On wide screens the picture moves up by this share of its height, clear of the controls along the bottom. */
const LIFT = 0.08;

/**
 * The plot as a 3D table model in `container` (see plotScene): turned with a
 * finger or the mouse, or with the camera buttons this returns. Positions the
 * `label` element over the house's roof every frame. 'failed' without WebGL.
 */
export function usePlotModel(container: React.RefObject<HTMLDivElement>, label: React.RefObject<HTMLElement>, o: PlotModelOptions) {
  const [status, setStatus] = useState<PlotModelStatus>('loading');
  const [satelliteReady, setSatelliteReady] = useState(false);
  const [tilted, setTilted] = useState(true);
  const [orbiting, setOrbiting] = useState(false);
  const latest = useRef(o);
  latest.current = o;
  const parts = useRef<{ plot: PlotScene; camera: THREE.PerspectiveCamera; controls: OrbitControls } | null>(null);
  const pictures = useRef<{ slope: HTMLCanvasElement | null; satellite: HTMLCanvasElement | null }>({ slope: null, satellite: null });
  /** A camera move under way, played by the render loop. */
  const move = useRef<{ from: Orbit; to: Orbit; started: number; ms: number } | null>(null);
  const stretch = useRef<number>(o.exaggeration);
  const { analysis, polygon } = o;
  const bearing = useMemo(() => openingBearing(analysis), [analysis]);
  /** The opening view, fitted to the screen's shape (set once the size is known). */
  const start = useRef<Orbit>(startOrbit(MODEL_SIZE * 2, bearing));

  useEffect(() => {
    const host = container.current;
    if (!host) return undefined;
    const { exaggeration } = latest.current;
    stretch.current = exaggeration;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus('failed');
      return undefined;
    }
    const slope = slopeTexture(analysis.grid, analysis.field, polygon, analysis.contourIntervalM);
    if (!slope) { renderer.dispose(); setStatus('failed'); return undefined; }
    pictures.current = { slope, satellite: null };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.display = 'block';
    host.replaceChildren(renderer.domElement);

    const plot = createPlotScene(analysis, slope, exaggeration, renderer.capabilities.getMaxAnisotropy());
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, MODEL_SIZE * 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(plot.target);
    controls.enableDamping = !latest.current.reduceMotion;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = MODEL_SIZE * 0.25;
    controls.maxDistance = MODEL_SIZE * 8;
    controls.maxPolarAngle = (84 * Math.PI) / 180;
    controls.autoRotateSpeed = 0.9;
    parts.current = { plot, camera, controls };
    const halfDiagonal = (Math.hypot(plot.terrain.widthM, plot.terrain.depthM) * plot.terrain.scale) / 2;

    const size = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      if (w > h) camera.setViewOffset(w, h, 0, h * LIFT, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      start.current = startOrbit(fitRadius(halfDiagonal, FOV, w / h), bearing);
    };
    size();
    placeOnOrbit(camera.position, controls.target, start.current);
    controls.update();
    const resize = new ResizeObserver(size);
    resize.observe(host);

    const stopTouring = () => {
      move.current = null;
      if (controls.autoRotate) { controls.autoRotate = false; setOrbiting(false); }
    };
    controls.addEventListener('start', stopTouring);
    let wasTilted = true;
    const anchor = new THREE.Vector3();
    let frame = 0;
    const loop = (now: number) => {
      const m = move.current;
      if (m) {
        const t = (now - m.started) / m.ms;
        placeOnOrbit(camera.position, controls.target, between(m.from, m.to, t));
        if (t >= 1) move.current = null;
      }
      controls.update();
      const isTilted = orbitOf(camera.position, controls.target).phi > TILTED_FROM;
      if (isTilted !== wasTilted) { wasTilted = isTilted; setTilted(isTilted); }
      renderer.render(plot.scene, camera);
      const el = label.current;
      if (el && plot.labelAnchor) {
        anchor.copy(plot.labelAnchor).project(camera);
        // The view offset moves the picture, and the projection with it, so screen positions still line up.
        const visible = anchor.z < 1;
        el.style.opacity = visible ? '1' : '0';
        el.style.transform = `translate(-50%, -100%) translate(${((anchor.x + 1) / 2) * host.clientWidth}px, ${((1 - anchor.y) / 2) * host.clientHeight}px)`;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    setStatus('ready');

    // The satellite photo, in the background: offered only once it has all arrived.
    let cancelled = false;
    void loadSatelliteImage(analysis.grid).then(
      (photo) => {
        if (cancelled) return;
        pictures.current.satellite = satelliteTexture(photo, analysis.grid, polygon);
        setSatelliteReady(true);
      },
      () => {},
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.removeEventListener('start', stopTouring);
      controls.dispose();
      plot.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      parts.current = null;
      setStatus('loading');
      setSatelliteReady(false);
    };
  }, [container, label, analysis, polygon, bearing]);

  // The picture on top.
  useEffect(() => {
    const picture = o.surface === 'satellite' ? pictures.current.satellite : pictures.current.slope;
    if (parts.current && picture) parts.current.plot.setSurface(picture);
  }, [o.surface, satelliteReady, status]);

  // Stretch the land: at once under reduced motion, otherwise over a moment.
  useEffect(() => {
    const p = parts.current;
    if (!p) return undefined;
    const from = stretch.current;
    const to = o.exaggeration;
    if (from === to) return undefined;
    const apply = (value: number) => {
      stretch.current = value;
      p.plot.setStretch(value);
      p.controls.target.copy(p.plot.target);
    };
    if (o.reduceMotion) { apply(to); return undefined; }
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / STRETCH_MS);
      apply(from + (to - from) * easeInOut(t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [o.exaggeration, o.reduceMotion, status]);

  const goTo = useCallback((change: (now: Orbit) => Partial<Orbit>) => {
    const p = parts.current;
    if (!p) return;
    p.controls.autoRotate = false;
    setOrbiting(false);
    const from = orbitOf(p.camera.position, p.controls.target);
    const to = { ...from, ...change(from) };
    to.radius = Math.min(p.controls.maxDistance, Math.max(p.controls.minDistance, to.radius));
    if (latest.current.reduceMotion) {
      move.current = null;
      placeOnOrbit(p.camera.position, p.controls.target, to);
    } else {
      move.current = { from, to, started: performance.now(), ms: MOVE_MS };
    }
  }, []);

  const camera: Camera3D = {
    zoomIn: () => goTo((c) => ({ radius: c.radius * ZOOM_STEP })),
    zoomOut: () => goTo((c) => ({ radius: c.radius / ZOOM_STEP })),
    turnLeft: () => goTo((c) => ({ theta: c.theta - TURN_STEP })),
    turnRight: () => goTo((c) => ({ theta: c.theta + TURN_STEP })),
    tilted,
    toggleTilt: () => goTo((c) => ({ phi: c.phi > TILTED_FROM ? TOP_DOWN : start.current.phi })),
    reset: () => {
      const p = parts.current;
      if (p) p.controls.target.copy(p.plot.target);
      goTo(() => start.current);
    },
    orbiting,
    toggleOrbit: () => {
      const p = parts.current;
      if (!p) return;
      move.current = null;
      p.controls.autoRotate = !p.controls.autoRotate;
      setOrbiting(p.controls.autoRotate);
    },
    canOrbit: !o.reduceMotion,
  };

  return { status, satelliteReady, camera };
}
