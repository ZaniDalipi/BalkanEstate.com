import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ElevationGrid, TerrainAnalysis } from '../types';
import { between, fitRadius, orbitOf, placeOnOrbit, startOrbit, type Orbit } from '../utils/orbitCamera';
import { MODEL_SIZE } from '../utils/plotModel';
import { createPlotScene } from '../utils/plotScene';
import { easeInOut, openingBearing, type Exaggeration } from '../utils/terrain3dScene';
import { TILTED_FROM, useCameraButtons, type CameraMove, type ViewParts } from './useCameraButtons';
import type { SurfacePictures } from './useSurfacePictures';

export type PlotModelStatus = 'loading' | 'ready' | 'failed';
export type PlotSurface = 'slope' | 'satellite';

export interface PlotModelOptions {
  /** The land round the plot; null while it loads. */
  ground: ElevationGrid | null;
  analysis: TerrainAnalysis;
  pictures: SurfacePictures;
  surface: PlotSurface;
  exaggeration: Exaggeration;
  reduceMotion: boolean;
}

const STRETCH_MS = 450;
const FOV = 35;
/** On wide screens the picture moves up by this share of its height, clear of the controls along the bottom. */
const LIFT = 0.08;

/**
 * The plot and the land round it in 3D, in `container` (see plotScene):
 * turned with a finger or the mouse, or with the camera buttons this returns.
 * Positions the `label` element over the house's roof every frame. 'failed'
 * without WebGL.
 */
export function usePlotModel(container: React.RefObject<HTMLDivElement>, label: React.RefObject<HTMLElement>, o: PlotModelOptions) {
  const [status, setStatus] = useState<PlotModelStatus>('loading');
  const [tilted, setTilted] = useState(true);
  const latest = useRef(o);
  latest.current = o;
  const parts = useRef<ViewParts | null>(null);
  const move = useRef<CameraMove | null>(null);
  const stretch = useRef<number>(o.exaggeration);
  const { ground, analysis } = o;
  const bearing = useMemo(() => openingBearing(analysis), [analysis]);
  /** The opening view, fitted to the plot and the screen's shape (set once the size is known). */
  const start = useRef<Orbit>(startOrbit(MODEL_SIZE, bearing));
  const { camera, setOrbiting } = useCameraButtons(parts, move, start, tilted, o.reduceMotion);

  useEffect(() => {
    const host = container.current;
    const layers = latest.current.pictures.slope;
    if (!host || !ground || !layers) return undefined;
    const { exaggeration } = latest.current;
    stretch.current = exaggeration;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus('failed');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.display = 'block';
    host.replaceChildren(renderer.domElement);

    const plot = createPlotScene(ground, analysis, layers, exaggeration, renderer.capabilities.getMaxAnisotropy());
    const view = new THREE.PerspectiveCamera(FOV, 1, MODEL_SIZE / 2000, MODEL_SIZE * 10);
    const controls = new OrbitControls(view, renderer.domElement);
    controls.target.copy(plot.target);
    controls.enableDamping = !latest.current.reduceMotion;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = plot.plotRadius * 0.12;
    controls.maxDistance = MODEL_SIZE * 1.6;
    controls.maxPolarAngle = (84 * Math.PI) / 180;
    controls.autoRotateSpeed = 0.9;
    parts.current = { plot, camera: view, controls };

    const size = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      view.aspect = w / h;
      if (w > h) view.setViewOffset(w, h, 0, h * LIFT, w, h); else view.clearViewOffset();
      view.updateProjectionMatrix();
      // Frame the plot with room round it, so its surroundings show from the start.
      start.current = startOrbit(fitRadius(plot.plotRadius * 1.35, FOV, w / h), bearing);
    };
    size();
    placeOnOrbit(view.position, controls.target, start.current);
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
        placeOnOrbit(view.position, controls.target, between(m.from, m.to, t));
        if (t >= 1) move.current = null;
      }
      controls.update();
      const orbit = orbitOf(view.position, controls.target);
      plot.setHaze(orbit.radius);
      const isTilted = orbit.phi > TILTED_FROM;
      if (isTilted !== wasTilted) { wasTilted = isTilted; setTilted(isTilted); }
      renderer.render(plot.scene, view);
      const el = label.current;
      if (el && plot.labelAnchor) {
        // The view offset moves the picture and the projection together, so screen positions still line up.
        anchor.copy(plot.labelAnchor).project(view);
        el.style.opacity = anchor.z < 1 ? '1' : '0';
        el.style.transform = `translate(-50%, -100%) translate(${((anchor.x + 1) / 2) * host.clientWidth}px, ${((1 - anchor.y) / 2) * host.clientHeight}px)`;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    setStatus('ready');

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.removeEventListener('start', stopTouring);
      controls.dispose();
      plot.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      parts.current = null;
      setStatus('loading');
    };
  }, [container, label, ground, analysis, bearing, setOrbiting]);

  // The picture on top.
  const layers = o.surface === 'satellite' ? o.pictures.satellite : o.pictures.slope;
  useEffect(() => {
    if (parts.current && layers) parts.current.plot.setSurface(layers);
  }, [layers, status]);

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

  return { status, satelliteReady: o.pictures.satellite !== null, camera };
}
