/**
 * The 3D view's scene: the ground around the plot (plotModel) with its
 * picture draped over it, fading into haze towards its edges; the plot's own
 * sharp sheet just above the ground; light from the north-west with real
 * shadows over the plot; the house at the best spot. Built once;
 * `setStretch` and `setSurface` change it in place.
 */
import * as THREE from 'three';
import type { ElevationGrid, TerrainAnalysis } from '../types';
import { houseAxis } from './house';
import { createHouseModel, houseRotationY } from './houseModel3d';
import { drapeMesh, MODEL_SIZE, plotTerrain, surfaceAt, surfaceMesh, toModel, type MeshData, type PlotTerrain } from './plotModel';
import { boxSizeM } from './surroundings';
import { HAZE } from './terrain3dScene';

/** Squares across the plot's sheet: enough for it to hug the ground. */
const SHEET_SEGMENTS = 96;

export interface SceneLayers {
  ground: HTMLCanvasElement;
  plot: HTMLCanvasElement;
}

/** The sun's direction: high in the north-west, as on printed maps. */
const SUN = new THREE.Vector3(-9, 16, -7).normalize();

export interface PlotScene {
  scene: THREE.Scene;
  terrain: PlotTerrain;
  /** Where the camera looks: the middle of the plot, on the ground. */
  target: THREE.Vector3;
  /** Half the diagonal of the plot's box, scene units: what the opening view frames. */
  plotRadius: number;
  /** The top of the house's roof, for the label (null without a best spot). */
  labelAnchor: THREE.Vector3 | null;
  setStretch: (exaggeration: number) => void;
  setSurface: (layers: SceneLayers) => void;
  /** Thicken the haze with distance from the camera to what it looks at. */
  setHaze: (distance: number) => void;
  dispose: () => void;
}

function geometry(m: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeVertexNormals();
  return g;
}

function reshape(mesh: THREE.Mesh, m: MeshData): void {
  (mesh.geometry.getAttribute('position') as THREE.BufferAttribute).copyArray(m.positions).needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}

function texture(picture: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(picture);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

export function createPlotScene(
  ground: ElevationGrid,
  analysis: TerrainAnalysis,
  layers: SceneLayers,
  exaggeration: number,
  anisotropy: number,
): PlotScene {
  const { grid: plotGrid, buildSpot } = analysis;
  const terrain = plotTerrain(ground);
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(HAZE, MODEL_SIZE, MODEL_SIZE * 3);
  scene.fog = fog;

  const centre = toModel(terrain, ground, { lat: (plotGrid.north + plotGrid.south) / 2, lng: (plotGrid.west + plotGrid.east) / 2 });
  const plotSize = boxSizeM(plotGrid);
  const plotRadius = (Math.hypot(plotSize.widthM, plotSize.depthM) / 2) * terrain.scale;

  scene.add(new THREE.HemisphereLight('#ffffff', '#d9d3c7', 1.3));
  const sun = new THREE.DirectionalLight('#ffffff', 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // Shadows where they matter: over the plot and a little round it.
  const reach = plotRadius * 1.4;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.01, far: reach * 8 + MODEL_SIZE });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02 * (reach / MODEL_SIZE);
  scene.add(sun, sun.target);

  const groundMaterial = new THREE.MeshStandardMaterial({ map: texture(layers.ground, anisotropy), roughness: 0.95 });
  const surface = new THREE.Mesh(geometry(surfaceMesh(terrain, exaggeration)), groundMaterial);
  surface.castShadow = true;
  surface.receiveShadow = true;
  scene.add(surface);

  // The plot's sheet, over its grid's box, drawn on top of the ground it hugs.
  const nw = toModel(terrain, ground, { lat: plotGrid.north, lng: plotGrid.west });
  const se = toModel(terrain, ground, { lat: plotGrid.south, lng: plotGrid.east });
  const sheetBox = { x0: nw.x, z0: nw.z, x1: se.x, z1: se.z };
  const lift = plotRadius * 0.003;
  const sheetMaterial = new THREE.MeshStandardMaterial({
    map: texture(layers.plot, anisotropy),
    roughness: 0.95,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const sheet = new THREE.Mesh(geometry(drapeMesh(terrain, sheetBox, SHEET_SEGMENTS, exaggeration, lift)), sheetMaterial);
  sheet.receiveShadow = true;
  sheet.renderOrder = 1;
  scene.add(sheet);

  let house: THREE.Group | null = null;
  let at = { x: 0, z: 0 };
  if (buildSpot) {
    house = createHouseModel();
    at = toModel(terrain, ground, buildSpot);
    house.scale.setScalar(terrain.scale);
    // Front door downhill; on level ground, facing south for the sun.
    house.rotation.y = houseRotationY(houseAxis(buildSpot)) + (buildSpot.downhill === null ? Math.PI : 0);
    scene.add(house);
  }
  const labelAnchor = house ? new THREE.Vector3() : null;
  const target = new THREE.Vector3();

  const setStretch = (stretch: number) => {
    reshape(surface, surfaceMesh(terrain, stretch));
    reshape(sheet, drapeMesh(terrain, sheetBox, SHEET_SEGMENTS, stretch, lift));
    target.set(centre.x, surfaceAt(terrain, centre.x, centre.z, stretch), centre.z);
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(SUN, reach * 4);
    if (house && labelAnchor) {
      const y = surfaceAt(terrain, at.x, at.z, stretch);
      house.position.set(at.x, y, at.z);
      labelAnchor.set(at.x, y + 6.2 * terrain.scale, at.z);
    }
  };
  setStretch(exaggeration);

  return {
    scene,
    terrain,
    target,
    plotRadius,
    labelAnchor,
    setStretch,
    setSurface: (next) => {
      for (const [material, picture] of [[groundMaterial, next.ground], [sheetMaterial, next.plot]] as const) {
        if (material.map?.image === picture) continue;
        material.map?.dispose();
        material.map = texture(picture, anisotropy);
        material.needsUpdate = true;
      }
    },
    setHaze: (distance) => {
      fog.near = distance + MODEL_SIZE * 0.15;
      fog.far = distance + MODEL_SIZE * 0.75;
    },
    dispose: () => {
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => { m.map?.dispose(); m.dispose(); });
      });
    },
  };
}
